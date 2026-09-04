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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

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
  
  // ✅ Estado para el modal de imagen ampliada
  const [imagenAmpliadaVisible, setImagenAmpliadaVisible] = useState(false);
  const [imagenAmpliadaUri, setImagenAmpliadaUri] = useState('');
  
  // 📦 Estado para el Picker de materiales
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [cantidadMaterial, setCantidadMaterial] = useState('1');

  // 📦 Estado de la bodega
  const [bodega, setBodega] = useState(null);
  const [cargandoBodega, setCargandoBodega] = useState(false);

  // ============================================
  // 📋 TICKETS - NUEVA FUNCIONALIDAD
  // ============================================
  const [ticketsAsignados, setTicketsAsignados] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [modalTicketVisible, setModalTicketVisible] = useState(false);
  const [observacionTicket, setObservacionTicket] = useState('');
  const [solucionTicket, setSolucionTicket] = useState('');

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
      }
      
      const usuarioTomadorId = servicio.responsableId?._id || servicio.responsableId;
      const jefeId = servicio.jefe?._id || servicio.jefe;
      const tecnicoId = servicio.tecnico?._id || servicio.tecnico;
      
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
      console.log('📱 Usuario:', user?.email);
      console.log('📱 Rol:', user?.rol);

      let response;
      
      if (isTecnico) {
        const userId = user?._id || user?.id;
        if (!userId) {
          console.error('❌ No se encontró el ID del usuario');
          Alert.alert('Error', 'No se pudo identificar al usuario');
          setLoading(false);
          return;
        }
        console.log('📱 Cargando servicios TOMADO para TÉCNICO:', userId);
        response = await api.get(`/servicios/estado/TOMADO?tecnico=${userId}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
      } else {
        console.log('📱 Cargando todos los servicios en TOMADO (Admin/Jefe)');
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
        setDebugInfo(`⚠️ No hay servicios TOMADO${isTecnico ? ' para ti' : ''}`);
      } else {
        setDebugInfo(`✅ ${serviciosData.length} servicios TOMADO${isTecnico ? ' para ti' : ''}`);
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
          permitirNegativo: true,
        });
        
        console.log('✅ Bodega cargada correctamente');
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
      console.log('📦 Creando bodega automática...');
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

  // ============================================
  // 📋 CARGAR TICKETS ASIGNADOS
  // ============================================
  const cargarTicketsAsignados = async () => {
    try {
      const response = await api.get('/tickets/para-tecnico');
      if (response.data.success) {
        setTicketsAsignados(response.data.data || []);
        console.log(`📋 ${response.data.data?.length || 0} tickets asignados`);
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
    }
  };

  useEffect(() => {
    cargarServicios();
    cargarBodega();
    cargarTicketsAsignados();
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
  // 📦 RESTAR MATERIAL DE BODEGA
  // ============================================
  const restarMaterialDeBodega = async (materialesDelServicio) => {
    try {
      const materialesReportados = Object.keys(materialesDelServicio);
      
      if (materialesReportados.length === 0) {
        return true;
      }
      
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
      
      return true;
    } catch (error) {
      console.error('❌ Error restando materiales:', error);
      Alert.alert('⚠️ Advertencia', 'No se pudieron restar los materiales de la bodega. El servicio se ejecutará igual.');
      return true;
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
  // 🎫 ACTUALIZAR TICKET DESDE APP
  // ============================================
  const actualizarTicketApp = async (estado) => {
    if (!ticketSeleccionado) return;

    try {
      const payload = { 
        estado,
        observaciones: observacionTicket || `Ticket ${estado} desde app`
      };
      
      if (estado === 'Resuelto') {
        payload.solucion = solucionTicket || 'Servicio completado';
      }

      const response = await api.put(`/tickets/${ticketSeleccionado._id}/app`, payload);
      
      if (response.data.success) {
        Alert.alert('✅ Éxito', `Ticket ${estado} correctamente`);
        setModalTicketVisible(false);
        cargarTicketsAsignados();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el ticket');
    }
  };

  // ============================================
  // 🖼️ ABRIR IMAGEN AMPLIADA
  // ============================================
  const abrirImagenAmpliada = (uri) => {
    if (uri) {
      setImagenAmpliadaUri(uri);
      setImagenAmpliadaVisible(true);
    }
  };

  // ============================================
  // 🎨 RENDER TICKETS
  // ============================================
  const renderTicketsAsignados = () => {
    if (ticketsAsignados.length === 0) return null;

    return (
      <View style={styles.ticketsSection}>
        <Text style={styles.sectionTitle}>🎫 Tickets Asignados</Text>
        {ticketsAsignados.map(ticket => (
          <TouchableOpacity 
            key={ticket._id} 
            style={styles.ticketCard}
            onPress={() => {
              setTicketSeleccionado(ticket);
              setObservacionTicket('');
              setSolucionTicket('');
              setModalTicketVisible(true);
            }}
          >
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketId}>{ticket.ticketId}</Text>
              <View style={[styles.estadoBadge, styles[`estado_${ticket.estado}`]]}>
                <Text style={styles.estadoText}>{ticket.estado}</Text>
              </View>
            </View>
            <Text style={styles.ticketCliente}>{ticket.cliente?.nombre || 'Sin nombre'}</Text>
            <Text style={styles.ticketInfo}>📌 {ticket.tipo || 'N/A'}</Text>
            <Text style={styles.ticketInfo}>📍 {ticket.cliente?.direccion || ticket.zona || 'N/A'}</Text>
            <Text style={styles.ticketInfo}>📱 {ticket.cliente?.telefono || 'Sin teléfono'}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
          {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} TOMADO{servicios.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {debugInfo ? (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>🔍 {debugInfo}</Text>
          </View>
        ) : null}

        {/* ✅ SECCIÓN DE TICKETS ASIGNADOS */}
        {renderTicketsAsignados()}

        {/* ✅ SERVICIOS */}
        {servicios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#B2BEC3" />
            <Text style={styles.emptyTitle}>No hay servicios asignados</Text>
            <Text style={styles.emptyText}>
              {isTecnico
                ? 'No tienes servicios TOMADO para ejecutar'
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

              {servicio.imagen && (
                <TouchableOpacity 
                  style={styles.imagenContainer}
                  onPress={() => abrirImagenAmpliada(servicio.imagen)}
                  activeOpacity={0.8}
                >
                  <Image 
                    source={{ uri: servicio.imagen }} 
                    style={styles.imagenMiniatura}
                    resizeMode="cover"
                  />
                  <View style={styles.imagenOverlay}>
                    <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.imagenOverlayText}>Tocar para ampliar</Text>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={styles.servicioInfo}>🔧 {servicio.nombreServicio}</Text>
              <Text style={styles.servicioInfo}>📍 {servicio.direccion}</Text>
              <Text style={styles.servicioInfo}>👤 Técnico: {servicio.tecnico?.nombre || 'N/A'}</Text>
              
              {servicio.observaciones && (
                <View style={styles.observacionesContainer}>
                  <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
                  <Text style={styles.observacionesText}>{servicio.observaciones}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ============================================
          MODAL DE EJECUCIÓN DE SERVICIO
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

      {/* ============================================
          MODAL DE TICKETS
          ============================================ */}
      <Modal
        visible={modalTicketVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalTicketVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎫 Gestión de Ticket</Text>
              <TouchableOpacity onPress={() => setModalTicketVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {ticketSeleccionado && (
              <>
                <View style={styles.ticketDetalle}>
                  <Text style={styles.ticketIdGrande}>{ticketSeleccionado.ticketId}</Text>
                  <Text style={styles.ticketClienteGrande}>{ticketSeleccionado.cliente?.nombre || 'Sin nombre'}</Text>
                  <Text style={styles.ticketInfoGrande}>📌 {ticketSeleccionado.tipo || 'N/A'}</Text>
                  <Text style={styles.ticketInfoGrande}>📍 {ticketSeleccionado.cliente?.direccion || ticketSeleccionado.zona || 'N/A'}</Text>
                  <Text style={styles.ticketInfoGrande}>📱 {ticketSeleccionado.cliente?.telefono || 'Sin teléfono'}</Text>
                  {ticketSeleccionado.descripcion && (
                    <Text style={styles.ticketDescripcion}>📝 {ticketSeleccionado.descripcion}</Text>
                  )}
                </View>

                <Text style={styles.modalLabel}>📝 Observaciones</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Agregar observación..."
                  value={observacionTicket}
                  onChangeText={setObservacionTicket}
                  multiline
                />

                {ticketSeleccionado.estado === 'Resuelto' && (
                  <>
                    <Text style={styles.modalLabel}>✅ Solución</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Describir la solución..."
                      value={solucionTicket}
                      onChangeText={setSolucionTicket}
                      multiline
                    />
                  </>
                )}

                <View style={styles.ticketButtons}>
                  {ticketSeleccionado.estado === 'Asignado' && (
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnIniciar]}
                      onPress={() => actualizarTicketApp('En Progreso')}
                    >
                      <Text style={styles.ticketBtnText}>🚀 Iniciar</Text>
                    </TouchableOpacity>
                  )}
                  
                  {ticketSeleccionado.estado === 'En Progreso' && (
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnResolver]}
                      onPress={() => actualizarTicketApp('Resuelto')}
                    >
                      <Text style={styles.ticketBtnText}>✅ Resolver</Text>
                    </TouchableOpacity>
                  )}

                  {ticketSeleccionado.estado === 'Resuelto' && (
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnCerrar]}
                      onPress={() => actualizarTicketApp('Cerrado')}
                    >
                      <Text style={styles.ticketBtnText}>🔒 Cerrar</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {ticketSeleccionado.historial?.length > 0 && (
                  <View style={styles.historialContainer}>
                    <Text style={styles.historialTitle}>📋 Historial</Text>
                    {ticketSeleccionado.historial.slice(-5).reverse().map((h, i) => (
                      <View key={i} style={styles.historialItem}>
                        <Text style={styles.historialEstado}>{h.estado}</Text>
                        <Text style={styles.historialFecha}>
                          {new Date(h.fecha).toLocaleDateString('es-EC')}
                        </Text>
                        <Text style={styles.historialUsuario}>{h.usuario || 'Sistema'}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
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
  // ✅ ESTILOS PARA TICKETS
  ticketsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  ticketCliente: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  ticketInfo: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estado_Nuevo: { backgroundColor: '#FFF3E0' },
  estado_Asignado: { backgroundColor: '#E3F2FD' },
  estado_En Progreso: { backgroundColor: '#F3E5F5' },
  estado_Resuelto: { backgroundColor: '#E8F5E9' },
  estado_Cerrado: { backgroundColor: '#F5F5F5' },
  estadoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  // ✅ ESTILOS PARA SERVICIOS
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
  servicioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  observacionesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  observacionesLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginBottom: 2,
  },
  observacionesText: {
    fontSize: 13,
    color: '#2D3436',
  },
  // ✅ ESTILOS PARA IMAGEN
  imagenContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  imagenMiniatura: {
    width: '100%',
    height: 150,
    borderRadius: 8,
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
    padding: 8,
  },
  imagenOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
  },
  imagenAmpliadaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagenAmpliada: {
    width: width * 0.95,
    height: height * 0.85,
    borderRadius: 10,
  },
  imagenAmpliadaClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  // ✅ ESTILOS DE VACÍO
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
  // ✅ ESTILOS DE MODAL
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // ✅ ESTILOS PARA TICKET MODAL
  ticketDetalle: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  ticketIdGrande: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  ticketClienteGrande: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginTop: 4,
  },
  ticketInfoGrande: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  ticketDescripcion: {
    fontSize: 14,
    color: '#2D3436',
    marginTop: 8,
    fontStyle: 'italic',
  },
  ticketButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  ticketBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnIniciar: { backgroundColor: '#3498DB' },
  btnResolver: { backgroundColor: '#2ECC71' },
  btnCerrar: { backgroundColor: '#95A5A6' },
  ticketBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  historialContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  historialTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  historialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  historialEstado: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3436',
  },
  historialFecha: {
    fontSize: 12,
    color: '#636E72',
  },
  historialUsuario: {
    fontSize: 12,
    color: '#999',
  },
  // ✅ ESTILOS DE MATERIALES
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
});

export default EjecucionServicio;