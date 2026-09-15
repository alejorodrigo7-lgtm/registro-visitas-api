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

  // ✅ NUEVOS ESTADOS PARA EL MODAL DE DETALLE
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [servicioDetalle, setServicioDetalle] = useState(null);
  const [imagenAmpliadaVisible, setImagenAmpliadaVisible] = useState(false);
  const [imagenAmpliadaUri, setImagenAmpliadaUri] = useState('');

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
  // 📱 ENVIAR NOTIFICACIONES PUSH
  // ============================================
  const enviarNotificaciones = async (tipo, servicio, usuarioActual) => {
    try {
      console.log(`📱 Enviando notificación ${tipo}...`);

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
        }
      }

      if (jefeId) {
        const idStr = jefeId.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: jefeId, rol: 'Jefe' });
        }
      }

      if (tecnicoId) {
        const idStr = tecnicoId.toString();
        if (!destinatariosSet.has(idStr) && tecnicoId !== usuarioActual?._id) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: tecnicoId, rol: 'Técnico' });
        }
      }

      if (usuarioActual?._id) {
        const idStr = usuarioActual._id.toString();
        if (!destinatariosSet.has(idStr)) {
          destinatariosSet.add(idStr);
          destinatarios.push({ userId: usuarioActual._id, rol: 'Ejecutor' });
        }
      }

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
          console.log(`✅ Notificación enviada a ${destinatario.rol}`);
        } catch (error) {
          console.error(`❌ Error enviando notificación a ${destinatario.rol}:`, error);
        }
      }
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

      const response = await api.get('/servicios/estado/TOMADO', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      let serviciosData = [];

      if (response.data?.data && Array.isArray(response.data.data)) {
        serviciosData = response.data.data;
      } else if (Array.isArray(response.data)) {
        serviciosData = response.data;
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

      const response = await api.get('/bodegas/mis-materiales');

      if (response.data.success && response.data.data) {
        const bodegaData = response.data.data;
        const materiales = bodegaData.materiales || [];

        setBodega({
          _id: bodegaData._id,
          nombre: bodegaData.nombre || 'Bodega Técnico',
          materiales: materiales,
          usuarioNombre: bodegaData.usuarioNombre,
        });

        console.log('✅ Bodega cargada:', bodegaData.nombre);
      } else {
        setBodega(null);
      }
    } catch (error) {
      console.error('❌ Error al cargar bodega:', error);
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
  // ➕ AGREGAR MATERIAL
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
      const materialesReportados = Object.keys(materialesDelServicio);

      if (materialesReportados.length > 0) {
        console.log('📦 Restando materiales de bodega...');

        const materialesARestar = materialesReportados.map(nombre => ({
          nombre: nombre,
          cantidad: materialesDelServicio[nombre]
        }));

        await api.post('/bodegas/restar-materiales-bodega', {
          materiales: materialesARestar
        });

        console.log('✅ Materiales restados correctamente');
      }

      const dataToSend = {
        materiales: materialesDelServicio,
        observaciones: observaciones || 'Servicio ejecutado',
        macEquipo: macEquipo || '',
        numeroSerie: numeroSerie || '',
        estado: 'EJECUTADO',
      };

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
                // ✅ ABRIR MODAL DE DETALLE PRIMERO
                setServicioDetalle(servicio);
                setModalDetalleVisible(true);
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
              <Text style={styles.servicioInfo}>👤 Técnico: {servicio.tecnico?.nombre || servicio.tecnicoAsignado?.nombre || 'N/A'}</Text>

              {servicio.imagen && (
                <View style={styles.cardImagePreview}>
                  <Ionicons name="image" size={16} color="#6C5CE7" />
                  <Text style={styles.cardImageText}>📸 Tiene imagen adjunta</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ============================================
          MODAL DE DETALLE DEL SERVICIO (NUEVO)
          ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalleVisible}
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            {servicioDetalle && (
              <>
                {/* Cabecera */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>📋 Detalle del Servicio</Text>
                  <TouchableOpacity onPress={() => setModalDetalleVisible(false)}>
                    <Ionicons name="close" size={28} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Estado */}
                <View style={styles.detalleEstadoBadge}>
                  <Text style={styles.detalleEstadoText}>{servicioDetalle.estado || 'TOMADO'}</Text>
                </View>

                {/* Imagen */}
                {servicioDetalle.imagen && (
                  <TouchableOpacity
                    style={styles.detalleImagenContainer}
                    onPress={() => {
                      setImagenAmpliadaUri(servicioDetalle.imagen);
                      setImagenAmpliadaVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: servicioDetalle.imagen }}
                      style={styles.detalleImagen}
                      resizeMode="cover"
                    />
                    <View style={styles.imagenOverlay}>
                      <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.imagenOverlayText}>Tocar para ampliar</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Información del Servicio */}
                <View style={styles.detalleSeccion}>
                  <Text style={styles.detalleSeccionTitulo}>📌 Información del Servicio</Text>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>🔧 Servicio</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.nombreServicio || 'N/A'}</Text>
                  </View>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>🔢 Código</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.codigoIdentificador || 'N/A'}</Text>
                  </View>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>📊 Prioridad</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.prioridad || 'Normal'}</Text>
                  </View>

                  {servicioDetalle.observaciones && (
                    <View style={styles.detalleCampo}>
                      <Text style={styles.detalleCampoLabel}>📝 Observaciones</Text>
                      <Text style={styles.detalleCampoValor}>{servicioDetalle.observaciones}</Text>
                    </View>
                  )}

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>📅 Fecha de Creación</Text>
                    <Text style={styles.detalleCampoValor}>
                      {new Date(servicioDetalle.createdAt).toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Información del Cliente */}
                <View style={styles.detalleSeccion}>
                  <Text style={styles.detalleSeccionTitulo}>👤 Información del Cliente</Text>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>👤 Nombre</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.cliente || 'N/A'}</Text>
                  </View>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>📍 Dirección</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.direccion || 'N/A'}</Text>
                  </View>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>🏘️ Barrio</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.barrio || 'N/A'}</Text>
                  </View>

                  <View style={styles.detalleCampo}>
                    <Text style={styles.detalleCampoLabel}>📞 Teléfono</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.telefono || 'N/A'}</Text>
                  </View>

                  {servicioDetalle.telefonos && servicioDetalle.telefonos.length > 0 && (
                    <View style={styles.detalleCampo}>
                      <Text style={styles.detalleCampoLabel}>📞 Teléfonos Adicionales</Text>
                      <Text style={styles.detalleCampoValor}>{servicioDetalle.telefonos.join(', ')}</Text>
                    </View>
                  )}
                </View>

                {/* Técnico Asignado */}
                {servicioDetalle.tecnico && (
                  <View style={styles.detalleSeccion}>
                    <Text style={styles.detalleSeccionTitulo}>🔧 Técnico Asignado</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.tecnico.nombre || 'N/A'}</Text>
                  </View>
                )}

                {/* Jefe Asignado */}
                {servicioDetalle.jefe && (
                  <View style={styles.detalleSeccion}>
                    <Text style={styles.detalleSeccionTitulo}>👔 Jefe Asignado</Text>
                    <Text style={styles.detalleCampoValor}>{servicioDetalle.jefe.nombre || 'N/A'}</Text>
                  </View>
                )}

                {/* Botones */}
                <View style={styles.detalleBotones}>
                  <TouchableOpacity
                    style={styles.detalleBotonAtras}
                    onPress={() => setModalDetalleVisible(false)}
                  >
                    <Ionicons name="arrow-back" size={20} color="#6C5CE7" />
                    <Text style={styles.detalleBotonAtrasText}>Atrás</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detalleBotonEjecutar}
                    onPress={() => {
                      setModalDetalleVisible(false);
                      setServicioSeleccionado(servicioDetalle);
                      setMaterialesSeleccionados({});
                      setObservaciones('');
                      setMacEquipo('');
                      setNumeroSerie('');
                      setMaterialSeleccionado('');
                      setCantidadMaterial('1');
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.detalleBotonEjecutarText}>Ejecutar Servicio</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================
          MODAL DE IMAGEN AMPLIADA
          ============================================ */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imagenAmpliadaVisible}
        onRequestClose={() => setImagenAmpliadaVisible(false)}
      >
        <TouchableOpacity
          style={styles.imagenAmpliadaOverlay}
          activeOpacity={1}
          onPress={() => setImagenAmpliadaVisible(false)}
        >
          <TouchableOpacity
            style={styles.imagenAmpliadaClose}
            onPress={() => setImagenAmpliadaVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="#FFFFFF" />
          </TouchableOpacity>
          {imagenAmpliadaUri && (
            <Image
              source={{ uri: imagenAmpliadaUri }}
              style={styles.imagenAmpliada}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

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
  cardImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  cardImageText: {
    fontSize: 12,
    color: '#6C5CE7',
    marginLeft: 4,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
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

  // ✅ ESTILOS PARA EL MODAL DE DETALLE
  detalleEstadoBadge: {
    alignSelf: 'center',
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 15,
  },
  detalleEstadoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  detalleImagenContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    position: 'relative',
    backgroundColor: '#F0F0F0',
  },
  detalleImagen: {
    width: '100%',
    height: '100%',
  },
  imagenOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  imagenOverlayText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
  },
  detalleSeccion: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detalleSeccionTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF1',
    paddingBottom: 8,
  },
  detalleCampo: {
    marginBottom: 8,
  },
  detalleCampoLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
    marginBottom: 2,
  },
  detalleCampoValor: {
    fontSize: 15,
    color: '#2D3436',
  },
  detalleBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  detalleBotonAtras: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  detalleBotonAtrasText: {
    fontSize: 15,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  detalleBotonEjecutar: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  detalleBotonEjecutarText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imagenAmpliadaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenAmpliada: {
    width: '95%',
    height: '80%',
    borderRadius: 10,
  },
  imagenAmpliadaClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});

export default EjecucionServicio;