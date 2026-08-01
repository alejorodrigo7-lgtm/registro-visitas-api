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

  // ============================================
  // 📱 ENVIAR NOTIFICACIONES PUSH A TODOS LOS INVOLUCRADOS
  // ============================================
  const enviarNotificaciones = async (tipo, servicio, usuarioActual) => {
    try {
      console.log(`📱 Enviando notificación ${tipo}...`);
      console.log('📱 Servicio:', servicio);
      
      // Determinar el mensaje según el tipo
      let titulo = '';
      let mensaje = '';
      
      if (tipo === 'EJECUTADO') {
        titulo = '✅ Servicio Ejecutado';
        mensaje = `✅ Se ha ejecutado el servicio de ${servicio.cliente} por ${usuarioActual?.nombre || 'Técnico'}`;
      } else if (tipo === 'PENDIENTE') {
        titulo = '⏳ Servicio Pendiente';
        mensaje = `⏳ El servicio de ${servicio.cliente} está en PENDIENTE`;
      } else if (tipo === 'TOMADO') {
        titulo = '📋 Servicio Tomado';
        mensaje = `📋 El servicio de ${servicio.cliente} ha sido tomado por ${usuarioActual?.nombre || 'Técnico'}`;
      }
      
      // Obtener todos los usuarios involucrados
      const usuarioTomadorId = servicio.usuarioTomador?._id || servicio.usuarioTomador;
      const jefeId = servicio.jefeAsignado?._id || servicio.jefeAsignado;
      const tecnicoId = servicio.tecnicoAsignado?._id || servicio.tecnicoAsignado;
      
      // Preparar los destinatarios (evitar duplicados)
      const destinatariosSet = new Set();
      const destinatarios = [];
      
      // 1. Usuario que TOMÓ el servicio (Coordinador, Admin, etc.)
      if (usuarioTomadorId) {
        const idStr = usuarioTomadorId.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({
            userId: usuarioTomadorId,
            rol: 'Tomador'
          });
          console.log(`📱 Agregado Tomador: ${usuarioTomadorId}`);
        }
      }
      
      // 2. Jefe asignado
      if (jefeId) {
        const idStr = jefeId.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({
            userId: jefeId,
            rol: 'Jefe'
          });
          console.log(`📱 Agregado Jefe: ${jefeId}`);
        }
      }
      
      // 3. Técnico asignado (si es diferente al usuario actual)
      if (tecnicoId) {
        const idStr = tecnicoId.toString();
        if (!destinatariosSet.has(idStr) && tecnicoId !== usuarioActual?._id) {
          destinatariosSet.add(idStr);
          destinatarios.push({
            userId: tecnicoId,
            rol: 'Técnico'
          });
          console.log(`📱 Agregado Técnico: ${tecnicoId}`);
        }
      }
      
      // 4. El usuario que ejecutó el servicio (si no está en la lista)
      if (usuarioActual?._id) {
        const idStr = usuarioActual._id.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({
            userId: usuarioActual._id,
            rol: 'Ejecutor'
          });
          console.log(`📱 Agregado Ejecutor: ${usuarioActual._id}`);
        }
      }
      
      console.log(`📱 Total destinatarios: ${destinatarios.length}`);
      console.log('📱 Destinatarios:', JSON.stringify(destinatarios, null, 2));
      
      // Enviar notificación a cada destinatario
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
              tipo: tipo === 'EJECUTADO' ? 'EJECUTADO' : tipo === 'PENDIENTE' ? 'PENDIENTE' : 'TOMADO'
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
  // 📋 CARGAR SERVICIOS
  // ============================================
  const cargarServicios = async () => {
    setLoading(true);
    setDebugInfo('Cargando...');
    try {
      console.log('📱 === CARGANDO SERVICIOS ===');
      console.log('📱 Usuario:', user?.email);
      console.log('📱 Rol:', user?.rol);

      const response = await api.get('/servicios/estado/TOMADO', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

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
        setDebugInfo(`⚠️ No hay servicios en TOMADO`);
      } else {
        setDebugInfo(`✅ ${serviciosData.length} servicios en TOMADO`);
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
  // 📦 CARGAR BODEGA DEL TÉCNICO
  // ============================================
  const cargarBodega = async () => {
    setCargandoBodega(true);
    try {
      console.log('📦 === CARGANDO BODEGA DEL TÉCNICO ===');
      console.log('📦 Usuario ID:', user?._id);
      console.log('📦 Email:', user?.email);
      console.log('📦 Rol:', user?.rol);
      
      const response = await api.get('/api/mis-materiales');
      
      console.log('📦 Response status:', response.status);
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
      
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
        });
        
        console.log('✅ Bodega cargada correctamente:', bodegaData.nombre);
      } else {
        console.log('⚠️ No se pudo obtener la bodega');
        setBodega(null);
      }
    } catch (error) {
      console.error('❌ Error al cargar bodega:', error);
      console.error('❌ Detalles:', error.response?.data);
      setBodega(null);
    } finally {
      setCargandoBodega(false);
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

    // Verificar stock en bodega si existe
    if (bodega) {
      const materialEnBodega = bodega.materiales?.find(
        m => m.nombre === materialSeleccionado
      );
      
      if (materialEnBodega && materialEnBodega.cantidad < cantidad) {
        Alert.alert(
          '⚠️ Stock insuficiente',
          `Stock disponible de ${materialSeleccionado}: ${materialEnBodega.cantidad} ${materialEnBodega.unidad || 'uds'}`
        );
        return;
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
  // ✅ EJECUTAR SERVICIO
  // ============================================
  const handleEjecutar = async () => {
    if (!servicioSeleccionado) return;

    const materialesDelServicio = materialesSeleccionados[servicioSeleccionado._id] || {};
    const materialesReportados = Object.keys(materialesDelServicio).filter(
      key => materialesDelServicio[key] > 0
    );

    // ⚠️ OPCIONAL: Mostrar advertencia si no reporta materiales
    if (materialesReportados.length === 0) {
      Alert.alert(
        '⚠️ Sin materiales',
        'No has reportado ningún material. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Continuar sin materiales', 
            onPress: () => ejecutarServicio(materialesDelServicio)
          }
        ]
      );
      return;
    }

    ejecutarServicio(materialesDelServicio);
  };

  const ejecutarServicio = async (materialesDelServicio) => {
    setLoading(true);
    try {
      // 📦 1. RESTAR MATERIALES DE LA BODEGA
      const materialesReportados = Object.keys(materialesDelServicio);
      
      if (materialesReportados.length > 0) {
        console.log('📦 Restando materiales de bodega...');
        
        // Crear array de materiales a restar
        const materialesARestar = materialesReportados.map(nombre => ({
          nombre: nombre,
          cantidad: materialesDelServicio[nombre]
        }));
        
        // Llamar al endpoint para restar materiales
        await api.post('/api/restar-materiales-bodega', {
          materiales: materialesARestar
        });
        
        console.log('✅ Materiales restados correctamente');
      }

      // 2. EJECUTAR EL SERVICIO
      const dataToSend = {
        materiales: materialesDelServicio,
        observaciones: observaciones || 'Servicio ejecutado',
        macEquipo: macEquipo || '',
        numeroSerie: numeroSerie || '',
        estado: 'EJECUTADO',
      };

      console.log('📤 Ejecutando servicio con:', dataToSend);

      await api.put(`/servicios/${servicioSeleccionado._id}/ejecutar`, dataToSend);

      // 3. ENVIAR NOTIFICACIONES PUSH A TODOS LOS INVOLUCRADOS
      await enviarNotificaciones(
        'EJECUTADO',
        servicioSeleccionado,
        user
      );

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

              // 📱 ENVIAR NOTIFICACIÓN DE PENDIENTE A TODOS
              await enviarNotificaciones(
                'PENDIENTE',
                servicioSeleccionado,
                user
              );

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
          {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} en TOMADO
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
                ? 'No tienes servicios en estado TOMADO para ejecutar'
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
            <Text style={styles.modalTitle}>✅ Ejecutar Servicio</Text>

            {bodega && (
              <View style={styles.bodegaInfoModal}>
                <Text style={styles.bodegaInfoModalText}>
                  📍 Bodega: {bodega.nombre}
                </Text>
                <Text style={styles.bodegaInfoModalSub}>
                  Materiales disponibles: {bodega.materiales?.length || 0}
                </Text>
              </View>
            )}

            {/* 📝 OBSERVACIONES */}
            <Text style={styles.modalLabel}>📝 Observaciones</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Observaciones de la ejecución... (opcional)"
              multiline
              numberOfLines={3}
            />

            {/* 📦 MATERIALES USADOS - PICKER DESPLEGABLE */}
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

            {/* Materiales seleccionados - mostrados como etiquetas */}
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

            {/* 📶 MAC Y NÚMERO DE SERIE */}
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

            {/* BOTONES DE ACCIÓN */}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
  },
  scrollView: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
    fontSize: 16,
  },
  debugContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  debugText: {
    fontSize: 14,
    color: '#E17055',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  servicioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  estadoBadge: {
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  servicioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    marginTop: 10,
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalResponsable: {
    fontSize: 14,
    color: '#6C5CE7',
    marginTop: 10,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pendienteButton: {
    backgroundColor: '#FDCB6E',
  },
  ejecutarModalButton: {
    backgroundColor: '#00B894',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bodegaInfoModal: {
    backgroundColor: '#E8F0FE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  bodegaInfoModalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0984E3',
  },
  bodegaInfoModalSub: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  materialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    overflow: 'hidden',
    height: 45,
  },
  picker: {
    height: 45,
    width: '100%',
  },
  cantidadInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    width: 70,
    textAlign: 'center',
  },
  agregarMaterialButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
    height: 45,
  },
  agregarMaterialText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  materialesLista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
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
    fontSize: 12,
    color: '#2D3436',
    marginRight: 8,
  },
  eliminarMaterialText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialOpcional: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

export default EjecucionServicio;