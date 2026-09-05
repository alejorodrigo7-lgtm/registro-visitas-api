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
  // 🎨 COLORES POR ESTADO PARA TICKETS
  // ============================================
  const getEstadoColor = (estado) => {
    const colors = {
      'Nuevo': '#F39C12',
      'Asignado': '#3498DB',
      'TOMADO': '#8E44AD',
      'En Progreso': '#9B59B6',
      'Resuelto': '#2ECC71',
      'Cerrado': '#95A5A6'
    };
    return colors[estado] || '#95A5A6';
  };

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
  // 📋 CARGAR SERVICIOS Y TICKETS - UNIFICADO
  // ============================================
  const cargarServicios = async () => {
    setLoading(true);
    setDebugInfo('Cargando...');
    try {
      console.log('📱 === CARGANDO SERVICIOS Y TICKETS ===');
      console.log('📱 Usuario:', user?.email);
      console.log('📱 Rol:', user?.rol);

      // ✅ 1. Cargar servicios de recuperación (estado TOMADO)
      let serviciosData = [];
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
        response = await api.get(`/servicios/estado/TOMADO?tecnico=${userId}`);
      } else {
        console.log('📱 Cargando todos los servicios en TOMADO (Admin/Jefe)');
        response = await api.get('/servicios/estado/TOMADO');
      }

      if (response.data?.data && Array.isArray(response.data.data)) {
        serviciosData = response.data.data;
        console.log(`📱 Servicios de recuperación: ${serviciosData.length}`);
      }

      // ✅ 2. Cargar tickets de la web (estado Asignado o TOMADO)
      let ticketsData = [];
      try {
        const ticketsResponse = await api.get('/tickets/para-tecnico');
        if (ticketsResponse.data.success) {
          ticketsData = ticketsResponse.data.data || [];
          console.log(`📱 Tickets de la web: ${ticketsData.length}`);
        }
      } catch (ticketError) {
        console.log('⚠️ Error cargando tickets:', ticketError.message);
      }

      // ✅ 3. UNIFICAR: Servicios + Tickets
      const serviciosConOrigen = serviciosData.map(s => ({ 
        ...s, 
        _origen: 'servicio',
        _tipo: 'servicio_recuperacion',
        _ticketId: null,
        _clienteNombre: s.cliente || 'Cliente',
        _direccion: s.direccion || 'Sin dirección',
        _nombreServicio: s.nombreServicio || 'Servicio',
        _tecnico: s.tecnico || null,
        _estado: s.estado || 'TOMADO',
      }));

      const ticketsConOrigen = ticketsData.map(t => ({ 
        ...t, 
        _origen: 'ticket',
        _tipo: 'ticket_web',
        _ticketId: t.ticketId || null,
        _clienteNombre: t.cliente?.nombre || 'Sin cliente',
        _direccion: t.cliente?.direccion || t.zona || 'Sin dirección',
        _nombreServicio: t.tipo || 'Ticket Web',
        _tecnico: t.tecnicoAsignado || null,
        _estado: t.estado || 'Asignado',
        _observaciones: t.observaciones || t.descripcion || '',
        _fechaSubida: t.fechaCreacion || t.createdAt,
        // Para compatibilidad con el modal de ejecución
        cliente: t.cliente?.nombre || 'Sin cliente',
        direccion: t.cliente?.direccion || t.zona || 'Sin dirección',
        nombreServicio: t.tipo || 'Ticket Web',
        tecnico: t.tecnicoAsignado || null,
        imagen: null,
        observaciones: t.observaciones || t.descripcion || '',
        estado: t.estado || 'Asignado',
        // ✅ NUEVO: Campos para mostrar en el modal de ticket
        _clienteTelefono: t.cliente?.telefono || 'Sin teléfono',
        _clienteEmail: t.cliente?.email || 'Sin email',
        _clienteCedula: t.cliente?.cedula || 'Sin cédula',
        _clienteDireccion: t.cliente?.direccion || t.zona || 'Sin dirección',
        _tipoServicio: t.tipo || 'No especificado',
        _zonaTicket: t.zona || 'No especificada',
        _descripcionTicket: t.descripcion || 'Sin descripción',
        _imagenUrl: t.imagenUrl || null,
        _historial: t.historial || [],
      }));

      // ✅ 4. Combinar y ordenar por fecha (más reciente primero)
      const todos = [...serviciosConOrigen, ...ticketsConOrigen];
      todos.sort((a, b) => {
        const fechaA = new Date(a.fechaSubida || a.fechaCreacion || a.createdAt);
        const fechaB = new Date(b.fechaSubida || b.fechaCreacion || b.createdAt);
        return fechaB - fechaA;
      });

      setServicios(todos);
      setDebugInfo(`✅ ${serviciosData.length} servicios + ${ticketsData.length} tickets = ${todos.length} total`);

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setDebugInfo(`❌ Error: ${error.message}`);
      Alert.alert('Error', 'No se pudieron cargar los datos');
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
  // 🎫 ACTUALIZAR TICKET DESDE APP - ✅ NUEVO COMPLETO
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
        cargarServicios();
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
  // 🎨 RENDER ITEM UNIFICADO
  // ============================================
  const renderItem = (item) => {
    const esTicket = item._origen === 'ticket';
    const esServicio = item._origen === 'servicio';

    return (
      <TouchableOpacity
        key={item._id}
        style={[styles.servicioCard, esTicket && styles.ticketCardStyle]}
        onPress={() => {
          if (esTicket) {
            // ✅ Abrir modal de ticket con todos los datos
            setTicketSeleccionado(item);
            setObservacionTicket('');
            setSolucionTicket('');
            setModalTicketVisible(true);
          } else {
            // Abrir modal de servicio
            setServicioSeleccionado(item);
            setMaterialesSeleccionados({});
            setObservaciones('');
            setMacEquipo('');
            setNumeroSerie('');
            setMaterialSeleccionado('');
            setCantidadMaterial('1');
            setModalVisible(true);
          }
        }}
        activeOpacity={0.7}
      >
        {/* Badge de origen */}
        <View style={styles.origenBadge}>
          {esTicket ? (
            <View style={styles.ticketOrigenBadge}>
              <Ionicons name="ticket-outline" size={14} color="#FFFFFF" />
              <Text style={styles.origenBadgeText}>Ticket Web</Text>
              {item._ticketId && <Text style={styles.ticketIdText}> ({item._ticketId})</Text>}
            </View>
          ) : (
            <View style={styles.servicioOrigenBadge}>
              <Ionicons name="construct-outline" size={14} color="#FFFFFF" />
              <Text style={styles.origenBadgeText}>Servicio</Text>
            </View>
          )}
        </View>

        <View style={styles.servicioHeader}>
          <Text style={styles.servicioCliente}>{item._clienteNombre || item.cliente}</Text>
          <View style={[styles.estadoBadge, esTicket ? styles.estadoTicket : styles.estadoServicio]}>
            <Text style={styles.estadoBadgeText}>{item._estado || item.estado}</Text>
          </View>
        </View>

        <Text style={styles.servicioInfo}>🔧 {item._nombreServicio || item.nombreServicio}</Text>
        <Text style={styles.servicioInfo}>📍 {item._direccion || item.direccion}</Text>
        <Text style={styles.servicioInfo}>👤 Técnico: {item._tecnico?.nombre || item.tecnico?.nombre || 'N/A'}</Text>
        
        {(item._observaciones || item.observaciones) && (
          <View style={styles.observacionesContainer}>
            <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
            <Text style={styles.observacionesText} numberOfLines={2}>
              {item._observaciones || item.observaciones}
            </Text>
          </View>
        )}

        {/* ✅ NUEVO: Indicador de imagen en tarjeta para tickets */}
        {esTicket && item._imagenUrl && (
          <View style={styles.cardImagePreview}>
            <Ionicons name="image" size={16} color="#6C5CE7" />
            <Text style={styles.cardImageText}>📸 Tiene imagen adjunta</Text>
          </View>
        )}

        {/* Imagen solo para servicios */}
        {esServicio && item.imagen && (
          <TouchableOpacity 
            style={styles.imagenContainer}
            onPress={() => abrirImagenAmpliada(item.imagen)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.imagen }} 
              style={styles.imagenMiniatura}
              resizeMode="cover"
            />
            <View style={styles.imagenOverlay}>
              <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
              <Text style={styles.imagenOverlayText}>Tocar para ampliar</Text>
            </View>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
          {servicios.length} item{servicios.length !== 1 ? 's' : ''} disponibles
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
            <Text style={styles.emptyTitle}>No hay items disponibles</Text>
            <Text style={styles.emptyText}>
              {isTecnico
                ? 'No tienes servicios TOMADO ni tickets asignados'
                : 'No hay servicios ni tickets disponibles'}
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={cargarServicios}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}> Actualizar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          servicios.map((item) => renderItem(item))
        )}
      </ScrollView>

      {/* ============================================
          MODAL DE EJECUCIÓN DE SERVICIO (RECUPERACIÓN)
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
          MODAL DE TICKETS WEB - ✅ NUEVO COMPLETO
          ============================================ */}
      <Modal
        visible={modalTicketVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalTicketVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎫 Gestión de Ticket</Text>
              <TouchableOpacity onPress={() => setModalTicketVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {ticketSeleccionado && (
              <>
                {/* ✅ INFORMACIÓN COMPLETA DEL TICKET */}
                <View style={styles.ticketDetalle}>
                  <Text style={styles.ticketIdGrande}>{ticketSeleccionado._ticketId || ticketSeleccionado.ticketId}</Text>
                  
                  <View style={styles.ticketSection}>
                    <Text style={styles.ticketSectionTitle}>👤 Datos del Cliente</Text>
                    <Text style={styles.ticketInfoGrande}>Nombre: {ticketSeleccionado._clienteNombre || ticketSeleccionado.cliente?.nombre}</Text>
                    <Text style={styles.ticketInfoGrande}>📱 {ticketSeleccionado._clienteTelefono || ticketSeleccionado.cliente?.telefono || 'Sin teléfono'}</Text>
                    {ticketSeleccionado._clienteEmail && (
                      <Text style={styles.ticketInfoGrande}>📧 {ticketSeleccionado._clienteEmail}</Text>
                    )}
                    {ticketSeleccionado._clienteCedula && ticketSeleccionado._clienteCedula !== 'Sin cédula' && (
                      <Text style={styles.ticketInfoGrande}>🪪 Cédula: {ticketSeleccionado._clienteCedula}</Text>
                    )}
                    <Text style={styles.ticketInfoGrande}>📍 {ticketSeleccionado._clienteDireccion || ticketSeleccionado.cliente?.direccion || ticketSeleccionado.zona}</Text>
                  </View>

                  <View style={styles.ticketSection}>
                    <Text style={styles.ticketSectionTitle}>📋 Datos del Servicio</Text>
                    <Text style={styles.ticketInfoGrande}>🔧 Tipo: {ticketSeleccionado._tipoServicio || ticketSeleccionado.tipo}</Text>
                    <Text style={styles.ticketInfoGrande}>📍 Zona: {ticketSeleccionado._zonaTicket || ticketSeleccionado.zona || 'No especificada'}</Text>
                    <Text style={styles.ticketInfoGrande}>📝 Descripción:</Text>
                    <Text style={styles.ticketDescripcion}>{ticketSeleccionado._descripcionTicket || ticketSeleccionado.descripcion || 'Sin descripción'}</Text>
                  </View>

                  {/* ✅ IMAGEN DEL TICKET */}
                  {ticketSeleccionado._imagenUrl && (
                    <View style={styles.ticketSection}>
                      <Text style={styles.ticketSectionTitle}>📸 Imagen del Servicio</Text>
                      <TouchableOpacity
                        style={styles.ticketImagenContainer}
                        activeOpacity={0.9}
                        onPress={() => abrirImagenAmpliada(ticketSeleccionado._imagenUrl)}
                      >
                        <Image
                          source={{ uri: ticketSeleccionado._imagenUrl }}
                          style={styles.ticketImagen}
                          resizeMode="contain"
                          onError={(e) => console.log('Error cargando imagen:', e.nativeEvent?.error)}
                          onLoad={() => console.log('✅ Imagen cargada correctamente')}
                        />
                        <View style={styles.imagenOverlay}>
                          <Ionicons name="expand-outline" size={24} color="#FFFFFF" />
                          <Text style={styles.imagenOverlayText}>Tocar para ampliar</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ✅ BOTONES DE ACCIÓN PARA TICKETS - SIEMPRE VISIBLES */}
                  <View style={styles.ticketButtonsContainer}>
                    <Text style={styles.ticketButtonsTitle}>⚡ Acciones del Ticket</Text>
                    
                    {/* Mostrar estado actual */}
                    <View style={styles.estadoActualContainer}>
                      <Text style={styles.estadoActualLabel}>📌 Estado actual:</Text>
                      <View style={[styles.estadoActualBadge, { backgroundColor: getEstadoColor(ticketSeleccionado.estado || ticketSeleccionado._estado) }]}>
                        <Text style={styles.estadoActualBadgeText}>
                          {ticketSeleccionado.estado || ticketSeleccionado._estado || 'Nuevo'}
                        </Text>
                      </View>
                    </View>

                    {/* Botón 1: Tomar Servicio */}
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnTomar]}
                      onPress={() => {
                        console.log('🔘 Tomar Servicio - Estado:', ticketSeleccionado.estado);
                        actualizarTicketApp('TOMADO');
                      }}
                    >
                      <Ionicons name="hand" size={20} color="#FFFFFF" />
                      <Text style={styles.ticketBtnText}>📌 Tomar Servicio</Text>
                    </TouchableOpacity>

                    {/* Botón 2: En Progreso */}
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnIniciar]}
                      onPress={() => {
                        console.log('🔘 En Progreso - Estado:', ticketSeleccionado.estado);
                        actualizarTicketApp('En Progreso');
                      }}
                    >
                      <Ionicons name="time" size={20} color="#FFFFFF" />
                      <Text style={styles.ticketBtnText}>⏳ En Progreso</Text>
                    </TouchableOpacity>

                    {/* Botón 3: Resolver */}
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnResolver]}
                      onPress={() => {
                        console.log('🔘 Resolver - Estado:', ticketSeleccionado.estado);
                        actualizarTicketApp('Resuelto');
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.ticketBtnText}>✅ Resolver</Text>
                    </TouchableOpacity>

                    {/* Botón 4: Cerrar */}
                    <TouchableOpacity 
                      style={[styles.ticketBtn, styles.btnCerrar]}
                      onPress={() => {
                        console.log('🔘 Cerrar - Estado:', ticketSeleccionado.estado);
                        actualizarTicketApp('Cerrado');
                      }}
                    >
                      <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
                      <Text style={styles.ticketBtnText}>🔒 Cerrar</Text>
                    </TouchableOpacity>
                  </View>
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

                {/* ✅ HISTORIAL DEL TICKET */}
                {ticketSeleccionado._historial && ticketSeleccionado._historial.length > 0 && (
                  <View style={styles.historialContainer}>
                    <Text style={styles.historialTitle}>📋 Historial</Text>
                    {ticketSeleccionado._historial.slice(-5).reverse().map((h, i) => (
                      <View key={i} style={styles.historialItem}>
                        <Text style={styles.historialEstado}>{h.estado}</Text>
                        <Text style={styles.historialFecha}>
                          {h.fecha ? new Date(h.fecha).toLocaleDateString('es-EC') : 'Fecha no disponible'}
                        </Text>
                        <Text style={styles.historialUsuario}>{h.usuario || 'Sistema'}</Text>
                      </View>
                    ))}
                  </View>
                )}
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
  // ✅ ESTILOS PARA TARJETAS
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
  ticketCardStyle: {
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
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
  // ✅ BADGES DE ORIGEN
  origenBadge: {
    marginBottom: 6,
  },
  ticketOrigenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  servicioOrigenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  origenBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  ticketIdText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '400',
  },
  // ✅ ESTADOS
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoTicket: {
    backgroundColor: '#E3F2FD',
  },
  estadoServicio: {
    backgroundColor: '#FDCB6E',
  },
  estadoBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  // ✅ OBSERVACIONES
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
  // ✅ NUEVO: Indicador de imagen en tarjeta para tickets
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
  // ✅ IMAGEN
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
  // ✅ VACÍO
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
  // ✅ MODAL
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
  // ✅ TICKET MODAL - NUEVOS ESTILOS
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
    marginBottom: 8,
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
  ticketSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ticketSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  ticketDescripcion: {
    fontSize: 14,
    color: '#2D3436',
    marginTop: 4,
    fontStyle: 'italic',
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6C5CE7',
  },
  // ✅ NUEVO: Imagen en ticket modal
  ticketImagenContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  ticketImagen: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  // ✅ NUEVO: Botones de acción para tickets
  ticketButtonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ticketButtonsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  estadoActualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F0ECFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  estadoActualLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginRight: 8,
  },
  estadoActualBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  estadoActualBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ticketBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    width: '100%',
  },
  btnTomar: { backgroundColor: '#8E44AD' },
  btnIniciar: { backgroundColor: '#F39C12' },
  btnResolver: { backgroundColor: '#2ECC71' },
  btnCerrar: { backgroundColor: '#95A5A6' },
  ticketBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // ✅ NUEVO: Historial
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
  // ✅ MATERIALES
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