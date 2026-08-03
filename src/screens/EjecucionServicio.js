import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EjecucionServicio = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [macEquipo, setMacEquipo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
  // 📦 Estado para el Picker de materiales
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [cantidadMaterial, setCantidadMaterial] = useState('1');

  // 📦 Estado de la bodega
  const [bodega, setBodega] = useState(null);
  const [cargandoBodega, setCargandoBodega] = useState(false);

  // ✅ LISTA DE 15 MATERIALES PREDEFINIDOS PARA EL PICKER
  const opcionesMateriales = [
    'FIBRA EN METROS',
    'CABLE EN METROS',
    'EQUIPO ONU',
    'REPETIDOR',
    'RECEPTOR',
    'F56',
    'DIV2',
    'DIV3',
    'CONECTOR VERDE',
    'CONECTOR AZUL',
    'ROSETTA',
    'TERMO',
    'CABLE LAN EN METROS',
    'GRAPAS',
    'AMARRAS',
  ];

  const isTecnico = user?.rol === 'Tecnico';
  const isAdmin = user?.rol === 'Admin';
  const isJefe = user?.rol === 'Jefe';

  // ✅ Función para formatear imagen (base64 puro o con prefijo)
  const formatearImagen = (imagen) => {
    if (!imagen) return null;
    if (imagen.startsWith('data:image')) return imagen;
    return `data:image/jpeg;base64,${imagen}`;
  };

  // ============================================
  // 📱 ENVIAR NOTIFICACIONES PUSH A TODOS LOS INVOLUCRADOS
  // ============================================
  const enviarNotificaciones = async (tipo, servicio, usuarioActual) => {
    try {
      console.log(`📱 Enviando notificación ${tipo}...`);
      console.log('📱 Servicio:', servicio);
      
      let titulo = '';
      let mensaje = '';
      
      if (tipo === 'EJECUTADO') {
        titulo = '✅ Servicio Ejecutado';
        mensaje = `✅ Se ha ejecutado el servicio de ${servicio.cliente} por ${usuarioActual?.nombre || 'Técnico'}`;
      } else if (tipo === 'PENDIENTE') {
        titulo = '⏳ Servicio Pendiente';
        mensaje = `⏳ El servicio de ${servicio.cliente} está en PENDIENTE`;
      }
      
      const usuarioTomadorId = servicio.usuarioTomador?._id || servicio.usuarioTomador;
      const jefeId = servicio.jefeAsignado?._id || servicio.jefeAsignado;
      const tecnicoId = servicio.tecnicoAsignado?._id || servicio.tecnicoAsignado;
      
      const destinatariosSet = new Set();
      const destinatarios = [];
      
      if (usuarioTomadorId) {
        const idStr = usuarioTomadorId.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: usuarioTomadorId, rol: 'Tomador' });
          console.log(`📱 Agregado Tomador: ${usuarioTomadorId}`);
        }
      }
      
      if (jefeId) {
        const idStr = jefeId.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: jefeId, rol: 'Jefe' });
          console.log(`📱 Agregado Jefe: ${jefeId}`);
        }
      }
      
      if (tecnicoId) {
        const idStr = tecnicoId.toString();
        if (!destinatariosSet.has(idStr) && tecnicoId !== usuarioActual?._id) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: tecnicoId, rol: 'Técnico' });
          console.log(`📱 Agregado Técnico: ${tecnicoId}`);
        }
      }
      
      if (usuarioActual?._id) {
        const idStr = usuarioActual._id.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: usuarioActual._id, rol: 'Ejecutor' });
          console.log(`📱 Agregado Ejecutor: ${usuarioActual._id}`);
        }
      }
      
      console.log(`📱 Total destinatarios: ${destinatarios.length}`);
      
      let notificacionesEnviadas = 0;
      for (const destinatario of destinatarios) {
        try {
          await api.post('/notificaciones/enviar', {
            titulo: titulo,
            mensaje: mensaje,
            destinatarioId: destinatario.userId,
            tipo: 'SERVICIO',
            data: {
              servicioId: servicio._id,
              cliente: servicio.cliente,
              estado: tipo,
            }
          });
          notificacionesEnviadas++;
          console.log(`✅ Notificación enviada a ${destinatario.rol}: ${destinatario.userId}`);
        } catch (error) {
          console.error(`❌ Error enviando notificación a ${destinatario.rol}:`, error);
        }
      }
      
      console.log(`✅ ${notificacionesEnviadas} notificaciones enviadas correctamente`);
    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error);
    }
  };

  // ============================================
  // 📋 CARGAR SERVICIOS (FILTRADOS POR ROL) - CORREGIDO ✅
  // ============================================
  const cargarServicios = async () => {
    setLoading(true);
    setDebugInfo('Cargando...');
    try {
      console.log('📱 === CARGANDO SERVICIOS ===');
      console.log('📱 Usuario:', user?.email);
      console.log('📱 Rol:', user?.rol);

      let response;
      
      // ✅ Si es Técnico, cargar SOLO sus servicios PENDIENTES
      if (isTecnico) {
        const userId = user?._id || user?.id;
        if (!userId) {
          console.error('❌ No se encontró el ID del usuario');
          Alert.alert('Error', 'No se pudo identificar al usuario');
          setLoading(false);
          return;
        }
        console.log('📱 Cargando servicios PENDIENTES para TÉCNICO:', userId);
        response = await api.get(`/servicios?estado=PENDIENTE&tecnico=${userId}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
      } else {
        // ✅ Admin o Jefe: cargar todos los servicios en TOMADO
        console.log('📱 Cargando todos los servicios en TOMADO');
        response = await api.get('/servicios/estado/TOMADO', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
      }

      let serviciosData = [];

      if (response.data?.data && Array.isArray(response.data.data)) {
        serviciosData = response.data.data;
        console.log(`📱 Servicios recibidos: ${serviciosData.length}`);
      } else if (Array.isArray(response.data)) {
        serviciosData = response.data;
        console.log(`📱 Servicios recibidos (array): ${serviciosData.length}`);
      }

      setServicios(serviciosData);

      if (serviciosData.length === 0) {
        setDebugInfo(`⚠️ No hay servicios PENDIENTES${isTecnico ? ' para ti' : ''}`);
      } else {
        setDebugInfo(`✅ ${serviciosData.length} servicios PENDIENTES${isTecnico ? ' para ti' : ''}`);
      }

    } catch (error) {
      console.error('❌ Error cargando servicios:', error);
      setDebugInfo(`❌ Error: ${error.message}`);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 📦 CARGAR BODEGA DEL TÉCNICO (CON SALDOS NEGATIVOS)
  // ============================================
  const cargarBodega = async () => {
    setCargandoBodega(true);
    try {
      console.log('📦 === CARGANDO BODEGA DEL TÉCNICO ===');
      console.log('📦 Usuario ID:', user?._id);
      
      const response = await api.get('/bodegas/mis-materiales');
      
      if (response.data.success && response.data.data) {
        const bodegaData = response.data.data;
        const materiales = bodegaData.materiales || [];
        
        console.log(`📦 Materiales extraídos: ${materiales.length}`);
        
        if (materiales.length > 0) {
          console.log('📋 Materiales en bodega:');
          materiales.forEach((m, i) => {
            console.log(`  ${i+1}. ${m.nombre}: ${m.cantidad} ${m.unidad || 'uds'}`);
          });
        } else {
          console.log('⚠️ La bodega no tiene materiales asignados');
        }
        
        setBodega({
          _id: bodegaData._id,
          nombre: bodegaData.nombre || 'Bodega Técnico',
          materiales: materiales,
          usuarioNombre: bodegaData.usuarioNombre,
          permitirNegativo: true,
        });
        
        console.log('✅ Bodega cargada correctamente:', bodegaData.nombre);
      } else {
        console.log('⚠️ No se pudo obtener la bodega');
        await crearBodegaAutomatica();
      }
    } catch (error) {
      console.error('❌ Error al cargar bodega:', error);
      await crearBodegaAutomatica();
    } finally {
      setCargandoBodega(false);
    }
  };

  // ✅ CREAR BODEGA AUTOMÁTICA
  const crearBodegaAutomatica = async () => {
    try {
      console.log('📦 Creando bodega automática para el usuario...');
      const createResponse = await api.post('/bodegas/crear', {
        nombre: `Bodega de ${user.nombre}`,
        usuarioId: user._id,
        usuarioNombre: user.nombre,
        permitirNegativo: true,
      });
      
      if (createResponse.data?.data) {
        console.log('✅ Bodega creada automáticamente');
        setBodega({
          _id: createResponse.data.data._id,
          nombre: createResponse.data.data.nombre,
          materiales: [],
          usuarioNombre: user.nombre,
          permitirNegativo: true,
        });
      }
    } catch (createError) {
      console.error('❌ Error creando bodega automática:', createError);
      setBodega(null);
    }
  };

  useEffect(() => {
    cargarServicios();
    cargarBodega();
  }, []);

  // ============================================
  // ➕ AGREGAR MATERIAL DESDE EL PICKER
  // ============================================
  const agregarMaterial = () => {
    if (!materialSeleccionado) {
      Alert.alert('Error', 'Selecciona un material');
      return;
    }
    const cantidad = parseInt(cantidadMaterial);
    if (isNaN(cantidad) || cantidad < 1) {
      Alert.alert('Error', 'La cantidad debe ser un número válido mayor a 0');
      return;
    }

    console.log('➕ Agregando material:', materialSeleccionado, 'Cantidad:', cantidad);

    if (bodega) {
      const materialEnBodega = bodega.materiales?.find(
        m => m.nombre === materialSeleccionado
      );
      
      if (materialEnBodega && materialEnBodega.cantidad < cantidad) {
        Alert.alert(
          '⚠️ Stock insuficiente',
          `Stock disponible de ${materialSeleccionado}: ${materialEnBodega.cantidad} ${materialEnBodega.unidad || 'uds'}. Se registrará saldo negativo.`,
          [{ text: 'OK' }]
        );
      }
    }

    setMaterialesSeleccionados(prev => ({
      ...prev,
      [servicioSeleccionado._id]: {
        ...prev[servicioSeleccionado._id],
        [materialSeleccionado]: cantidad
      }
    }));
    setMaterialSeleccionado('');
    setCantidadMaterial('1');
    console.log('✅ Material agregado a la lista');
  };

  // ============================================
  // 🗑️ ELIMINAR MATERIAL
  // ============================================
  const eliminarMaterial = (nombre) => {
    setMaterialesSeleccionados(prev => {
      const newData = { ...prev };
      if (newData[servicioSeleccionado._id]) {
        delete newData[servicioSeleccionado._id][nombre];
        if (Object.keys(newData[servicioSeleccionado._id]).length === 0) {
          delete newData[servicioSeleccionado._id];
        }
      }
      return newData;
    });
  };

  // ============================================
  // 📦 RESTAR MATERIAL DE BODEGA (PERMITE SALDOS NEGATIVOS)
  // ============================================
  const restarMaterialDeBodega = async (materialesDelServicio) => {
    try {
      const materialesReportados = Object.keys(materialesDelServicio);
      
      if (materialesReportados.length === 0) {
        console.log('⚠️ No hay materiales para restar');
        return true;
      }
      
      console.log('📦 Restando materiales de bodega (saldos negativos permitidos)...');
      
      const materialesARestar = materialesReportados.map(nombre => ({
        nombre: nombre,
        cantidad: materialesDelServicio[nombre],
        permitirNegativo: true,
      }));
      
      await api.post('/bodegas/restar-materiales-bodega', {
        materiales: materialesARestar,
        permitirNegativo: true,
        usuarioId: user._id,
        usuarioNombre: user.nombre,
        crearBodegaAutomatica: true,
      });
      
      console.log('✅ Materiales restados correctamente (saldos negativos permitidos)');
      return true;
    } catch (error) {
      console.error('❌ Error restando materiales:', error);
      
      try {
        const materialesARestar = Object.keys(materialesDelServicio).map(nombre => ({
          nombre: nombre,
          cantidad: materialesDelServicio[nombre],
          permitirNegativo: true,
        }));
        
        await api.post('/bodegas/restar-materiales-bodega', {
          materiales: materialesARestar,
          permitirNegativo: true,
          usuarioId: user._id,
          usuarioNombre: user.nombre,
          crearBodegaAutomatica: true,
        });
        
        console.log('✅ Materiales restados con bodega automática');
        return true;
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError);
        Alert.alert('⚠️ Advertencia', 'No se pudieron restar los materiales de la bodega. El servicio se ejecutará igual.');
        return true;
      }
    }
  };

  // ============================================
  // ✅ EJECUTAR SERVICIO
  // ============================================
  const handleEjecutar = () => {
    if (!servicioSeleccionado) return;

    const materialesDelServicio = materialesSeleccionados[servicioSeleccionado._id] || {};
    const materialesReportados = Object.keys(materialesDelServicio).filter(
      key => materialesDelServicio[key] > 0
    );

    if (materialesReportados.length === 0) {
      Alert.alert(
        '⚠️ Sin materiales',
        'No has reportado ningún material. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar sin materiales', onPress: () => ejecutarServicio(materialesDelServicio) }
        ]
      );
      return;
    }

    ejecutarServicio(materialesDelServicio);
  };

  // ============================================
  // 🚀 EJECUTAR SERVICIO
  // ============================================
  const ejecutarServicio = async (materialesDelServicio) => {
    setLoading(true);
    try {
      await restarMaterialDeBodega(materialesDelServicio);

      const dataToSend = {
        materiales: materialesDelServicio,
        observaciones: observaciones || 'Servicio ejecutado',
        macEquipo: macEquipo || '',
        numeroSerie: numeroSerie || '',
        estado: 'EJECUTADO',
      };

      console.log('📤 Ejecutando servicio con:', dataToSend);

      await api.put(`/servicios/${servicioSeleccionado._id}/ejecutar`, dataToSend);

      await enviarNotificaciones('EJECUTADO', servicioSeleccionado, user);

      Alert.alert(
        '✅ Éxito',
        'Servicio ejecutado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              setServicioSeleccionado(null);
              setMaterialesSeleccionados({});
              setObservaciones('');
              setMacEquipo('');
              setNumeroSerie('');
              setMaterialSeleccionado('');
              setCantidadMaterial('1');
              cargarServicios();
              cargarBodega();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error ejecutando servicio:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al ejecutar el servicio');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ⏳ PENDIENTE SERVICIO
  // ============================================
  const handlePendiente = async () => {
    if (!servicioSeleccionado) return;

    Alert.alert(
      '⚠️ Marcar como Pendiente',
      '¿Estás seguro de que quieres marcar este servicio como pendiente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Si, Pendiente',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.put(`/servicios/${servicioSeleccionado._id}/pendiente`, {
                observaciones: observaciones || 'Servicio pendiente por ejecutar'
              });

              await enviarNotificaciones('PENDIENTE', servicioSeleccionado, user);

              Alert.alert(
                '⚠️ Servicio Pendiente',
                'El servicio ha sido marcado como pendiente',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setModalVisible(false);
                      setServicioSeleccionado(null);
                      setMaterialesSeleccionados({});
                      setObservaciones('');
                      setMacEquipo('');
                      setNumeroSerie('');
                      setMaterialSeleccionado('');
                      setCantidadMaterial('1');
                      cargarServicios();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('❌ Error marcando pendiente:', error);
              Alert.alert('Error', error.response?.data?.message || 'Error al marcar pendiente');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ============================================
  // 🖼️ RENDER PRINCIPAL
  // ============================================
  if (loading && servicios.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Ejecutar Servicio</Text>
        <Text style={styles.subtitle}>
          {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} PENDIENTES
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {debugInfo ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>🔍 {debugInfo}</Text>
          </View>
        ) : null}

        {servicios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#B2BEC3" />
            <Text style={styles.emptyTitle}>No hay servicios asignados</Text>
            <Text style={styles.emptyText}>
              {isTecnico
                ? 'No tienes servicios PENDIENTES para ejecutar'
                : 'No hay servicios disponibles'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={cargarServicios}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}> Actualizar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          servicios.map((servicio) => (
            <TouchableOpacity
              key={servicio._id}
              style={styles.servicioCard}
              onPress={() => {
                setServicioSeleccionado(servicio);
                setMaterialesSeleccionados({});
                setObservaciones('');
                setMacEquipo('');
                setNumeroSerie('');
                setMaterialSeleccionado('');
                setCantidadMaterial('1');
                setModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.servicioHeader}>
                <Text style={styles.servicioCliente}>{servicio.cliente}</Text>
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoBadgeText}>{servicio.estado}</Text>
                </View>
              </View>

              {/* ✅ IMAGEN CON FORMATEADOR */}
              {servicio.imagen && (
                <View style={styles.imagenContainer}>
                  <Image 
                    source={{ uri: formatearImagen(servicio.imagen) }} 
                    style={styles.imagenMiniatura}
                    resizeMode="cover"
                  />
                </View>
              )}

              <Text style={styles.servicioInfo}>🔧 {servicio.nombreServicio}</Text>
              <Text style={styles.servicioInfo}>📍 {servicio.direccion}</Text>
              <Text style={styles.servicioInfo}>👤 Técnico: {servicio.tecnicoAsignado?.nombre || 'N/A'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ============================================
          MODAL DE EJECUCIÓN
          ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Ejecutar Servicio v1.2.4</Text>

            {bodega && (
              <View style={styles.bodegaInfoModal}>
                <Text style={styles.bodegaInfoModalText}>
                  📍 Bodega: {bodega.nombre}
                </Text>
                <Text style={styles.bodegaInfoModalSub}>
                  Materiales disponibles: {bodega.materiales?.length || 0}
                  {bodega.permitirNegativo && ' (saldos negativos permitidos)'}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>📝 Observaciones</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Observaciones de la ejecución... (opcional)"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>📦 Materiales Usados (Opcional)</Text>
            
            <View style={styles.materialContainer}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={materialSeleccionado}
                  onValueChange={(itemValue) => setMaterialSeleccionado(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un material..." value="" />
                  {opcionesMateriales.map((mat) => (
                    <Picker.Item key={mat} label={mat} value={mat} />
                  ))}
                </Picker>
              </View>
              
              <TextInput
                style={styles.cantidadInput}
                value={cantidadMaterial}
                onChangeText={setCantidadMaterial}
                placeholder="Cant"
                keyboardType="numeric"
              />
              
              <TouchableOpacity 
                style={styles.agregarMaterialButton} 
                onPress={agregarMaterial}
              >
                <Text style={styles.agregarMaterialText}>➕</Text>
              </TouchableOpacity>
            </View>

            {servicioSeleccionado && (
              <View style={styles.materialesLista}>
                {Object.keys(materialesSeleccionados[servicioSeleccionado._id] || {}).map((nombre) => {
                  const cantidad = materialesSeleccionados[servicioSeleccionado._id]?.[nombre] || 0;
                  if (cantidad > 0) {
                    return (
                      <View key={nombre} style={styles.materialItem}>
                        <Text style={styles.materialItemText}>{nombre} x{cantidad}</Text>
                        <TouchableOpacity onPress={() => eliminarMaterial(nombre)}>
                          <Text style={styles.eliminarMaterialText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            )}

            <Text style={styles.materialOpcional}>
              💡 Los materiales son opcionales. Puedes ejecutar el servicio sin reportar materiales.
            </Text>

            <Text style={styles.modalLabel}>📶 MAC Equipo</Text>
            <TextInput
              style={styles.modalInput}
              value={macEquipo}
              onChangeText={setMacEquipo}
              placeholder="Ingresa la MAC del equipo (opcional)"
            />

            <Text style={styles.modalLabel}>🔢 Número de Serie</Text>
            <TextInput
              style={styles.modalInput}
              value={numeroSerie}
              onChangeText={setNumeroSerie}
              placeholder="Ingresa el número de serie (opcional)"
            />

            <Text style={styles.modalResponsable}>👤 Responsable: {user?.nombre || ''}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.pendienteButton]}
                onPress={handlePendiente}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>⏳ Pendiente</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.ejecutarModalButton]}
                onPress={handleEjecutar}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>✅ Ejecutar</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ============================================
// 🎨 ESTILOS
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  debugContainer: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#636E72',
  },
  servicioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  servicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicioCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  estadoBadge: {
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  servicioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '95%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 15,
  },
  bodegaInfoModal: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bodegaInfoModalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  bodegaInfoModalSub: {
    fontSize: 12,
    color: '#636E72',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginTop: 10,
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  materialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  cantidadInput: {
    width: 60,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    textAlign: 'center',
  },
  agregarMaterialButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  agregarMaterialText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  materialesLista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    margin: 4,
  },
  materialItemText: {
    fontSize: 14,
    color: '#2D3436',
    marginRight: 8,
  },
  eliminarMaterialText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialOpcional: {
    fontSize: 12,
    color: '#636E72',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  modalResponsable: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 10,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  pendienteButton: {
    backgroundColor: '#FF6B6B',
  },
  ejecutarModalButton: {
    backgroundColor: '#00B894',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagenContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  imagenMiniatura: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
});

export default EjecucionServicio;