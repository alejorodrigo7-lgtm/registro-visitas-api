import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  initDatabase,
  guardarVisitaOffline,
  contarPendientes,
  buscarClienteCache,
  buscarClientesPorNombreCache,
  guardarClientesCache,
  sincronizarClientes,
  getClientesCache,
} from '../services/database';

const RegistroVisita = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [visitasPendientes, setVisitasPendientes] = useState(0);
  
  // 🔍 Búsqueda por identificador
  const [identificador, setIdentificador] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  
  // 🔍 Búsqueda por nombre
  const [searchTerm, setSearchTerm] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [mostrarClientes, setMostrarClientes] = useState(false);
  
  // 📍 Ubicación
  const [ubicacion, setUbicacion] = useState({
    latitude: null,
    longitude: null,
    address: null,
    loadingLocation: false,
    error: null,
  });
  
  const searchTimeout = useRef(null);

  const [formData, setFormData] = useState({
    nombre: '',
    identificador: '',
    barrio: '',
    direccion: '',
    telefono: '',
    tipo: 'Visita',
    monto: '',
    observaciones: '',
    foto: null,
  });
  const [fotoBase64, setFotoBase64] = useState(null);

  const tiposVisita = [
    'Visita',
    'Cobro',
    'Instalación',
    'Mantenimiento',
    'Revisión',
    'Otros',
    'Servicio Técnico'
  ];

  // ============================================
  // 📡 INICIALIZAR Y DETECTAR CONEXIÓN
  // ============================================
  useEffect(() => {
    const inicializar = async () => {
      try {
        await initDatabase();
        const netInfo = await NetInfo.fetch();
        setIsConnected(netInfo.isConnected);
        
        // Verificar clientes en caché
        const clientes = await getClientesCache();
        console.log(`📋 Clientes en caché: ${clientes.length}`);
        
        if (clientes.length === 0 && netInfo.isConnected) {
          console.log('⚠️ No hay clientes en caché, sincronizando...');
          await sincronizarClientes(api);
        }
      } catch (error) {
        console.log('⚠️ Error inicializando:', error);
      }
    };
    inicializar();
    
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        try {
          await sincronizarClientes(api);
          const { sincronizarVisitas } = require('../services/database');
          const result = await sincronizarVisitas(api);
          if (result.sincronizados > 0) {
            Alert.alert('✅ Sincronización', `${result.sincronizados} visitas sincronizadas`);
          }
          const total = await contarPendientes();
          setVisitasPendientes(total.total || 0);
        } catch (error) {
          console.log('⚠️ Error en sincronización automática:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  // ============================================
  // 🔍 BUSCAR CLIENTE POR IDENTIFICADOR (OFFLINE)
  // ============================================
  const buscarCliente = async () => {
    console.log('🔍 Buscando cliente por identificador:', identificador);
    
    if (!identificador || identificador.trim() === '') {
      Alert.alert('Error', 'Por favor ingresa un identificador');
      return;
    }

    setBuscando(true);
    setClienteNoEncontrado(false);
    setClienteEncontrado(null);
    
    try {
      const idBuscado = identificador.trim().toUpperCase();
      
      // 1. Buscar en caché local (búsqueda exacta y parcial)
      const clientesCache = await getClientesCache();
      console.log(`📋 Buscando en ${clientesCache.length} clientes en caché...`);
      
      // Buscar coincidencia exacta primero
      let clienteEncontrado = clientesCache.find(c => 
        c.identificador?.toUpperCase() === idBuscado
      );
      
      // Si no, buscar coincidencia parcial
      if (!clienteEncontrado) {
        clienteEncontrado = clientesCache.find(c => 
          c.identificador?.toUpperCase().includes(idBuscado) ||
          c.nombre?.toUpperCase().includes(idBuscado)
        );
      }
      
      if (clienteEncontrado) {
        console.log('✅ Cliente encontrado en caché:', clienteEncontrado.nombre);
        setClienteEncontrado(clienteEncontrado);
        setClienteNoEncontrado(false);
        setFormData({
          ...formData,
          nombre: clienteEncontrado.nombre || '',
          identificador: clienteEncontrado.identificador || '',
          barrio: clienteEncontrado.barrio || '',
          direccion: clienteEncontrado.direccion || '',
          telefono: clienteEncontrado.telefono || '',
        });
        setSearchTerm(clienteEncontrado.nombre);
        setMostrarClientes(false);
        Alert.alert('✅ Cliente encontrado', clienteEncontrado.nombre);
        setBuscando(false);
        return;
      }
      
      // 2. Si no está en caché y hay internet, buscar en servidor
      if (isConnected) {
        console.log('📡 Buscando en servidor...');
        const response = await api.get(`/clientes/buscar/${encodeURIComponent(idBuscado)}`);
        if (response.data.success) {
          const cliente = response.data.data;
          if (cliente) {
            await guardarClientesCache([cliente]);
            setClienteEncontrado(cliente);
            setClienteNoEncontrado(false);
            setFormData({
              ...formData,
              nombre: cliente.nombre || '',
              identificador: cliente.identificador || '',
              barrio: cliente.barrio || '',
              direccion: cliente.direccion || '',
              telefono: cliente.telefono || '',
            });
            setSearchTerm(cliente.nombre);
            setMostrarClientes(false);
            Alert.alert('✅ Cliente encontrado', cliente.nombre);
            setBuscando(false);
            return;
          }
        }
      }
      
      // 3. No encontrado - mostrar clientes similares
      setClienteEncontrado(null);
      setClienteNoEncontrado(true);
      
      const similares = clientesCache.filter(c => 
        c.nombre?.toUpperCase().includes(idBuscado) ||
        c.identificador?.toUpperCase().includes(idBuscado)
      );
      
      if (similares.length > 0) {
        setClientesFiltrados(similares);
        setMostrarClientes(true);
        Alert.alert(
          '🔍 Cliente no encontrado',
          `No se encontró "${identificador}". Mostrando ${similares.length} clientes similares.`
        );
      } else {
        Alert.alert('❌ Cliente no encontrado', `No se encontró cliente con identificador ${identificador}`);
      }
      
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
      setClienteEncontrado(null);
      setClienteNoEncontrado(true);
      Alert.alert('Error', 'No se pudo buscar el cliente');
    } finally {
      setBuscando(false);
    }
  };

  // ============================================
  // 🔍 BUSCAR CLIENTES POR NOMBRE (OFFLINE)
  // ============================================
  const buscarClientesPorNombre = async (text) => {
    setSearchTerm(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!text || text.length < 2) {
      setClientesFiltrados([]);
      setMostrarClientes(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setBuscando(true);
      try {
        // 1. Buscar en caché local
        const resultadosCache = await buscarClientesPorNombreCache(text);
        
        if (resultadosCache.length > 0) {
          setClientesFiltrados(resultadosCache);
          setMostrarClientes(true);
          setBuscando(false);
          return;
        }
        
        // 2. Si hay internet, buscar en servidor
        if (isConnected) {
          const response = await api.get(`/clientes/todos?search=${encodeURIComponent(text)}&limit=20`);
          if (response.data.success) {
            const resultados = response.data.data || [];
            if (resultados.length > 0) {
              await guardarClientesCache(resultados);
              setClientesFiltrados(resultados);
              setMostrarClientes(true);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error buscando clientes:', error);
      } finally {
        setBuscando(false);
      }
    }, 500);
  };

  // ============================================
  // 📋 SELECCIONAR CLIENTE
  // ============================================
  const seleccionarCliente = (cliente) => {
    console.log('✅ Seleccionando cliente:', cliente.nombre);
    setClienteEncontrado(cliente);
    setClienteNoEncontrado(false);
    setFormData({
      ...formData,
      nombre: cliente.nombre || '',
      identificador: cliente.identificador || '',
      barrio: cliente.barrio || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
    });
    setSearchTerm(cliente.nombre);
    setMostrarClientes(false);
    setClientesFiltrados([]);
    setIdentificador(cliente.identificador || '');
  };

  // ============================================
  // 📍 OBTENER UBICACIÓN
  // ============================================
  const obtenerUbicacion = async () => {
    console.log('📍 Solicitando ubicación...');
    setUbicacion(prev => ({ ...prev, loadingLocation: true, error: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setUbicacion(prev => ({
          ...prev,
          loadingLocation: false,
          error: 'Permiso de ubicación denegado',
        }));
        Alert.alert(
          'Permiso denegado',
          'Para registrar la ubicación, necesitas permitir el acceso a la ubicación.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('📍 Posición obtenida:', { latitude, longitude });

      let address = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = `${addr.street || ''} ${addr.name || ''}, ${addr.district || ''}, ${addr.city || ''}`.trim();
          console.log('📍 Dirección encontrada:', address);
        }
      } catch (geoError) {
        console.log('⚠️ Error en geocodificación:', geoError);
      }

      setUbicacion({
        latitude,
        longitude,
        address,
        loadingLocation: false,
        error: null,
      });

      Alert.alert(
        '📍 Ubicación registrada',
        address 
          ? `Dirección: ${address}\nLat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`
          : `Lat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.log('❌ Error al obtener ubicación:', error);
      setUbicacion(prev => ({
        ...prev,
        loadingLocation: false,
        error: error.message || 'Error al obtener ubicación',
      }));
      Alert.alert('Error', 'No se pudo obtener la ubicación. Verifica tu conexión GPS.');
    }
  };

  // ============================================
  // 📸 FOTO
  // ============================================
  const tomarFoto = async () => {
    console.log('📸 Tomando foto...');
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar fotos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('✅ Foto tomada correctamente');
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      }
    } catch (error) {
      console.log('❌ Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarFoto = async () => {
    console.log('🖼️ Seleccionando foto de galería...');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        console.log('✅ Foto seleccionada correctamente');
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      }
    } catch (error) {
      console.log('❌ Error al seleccionar foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  // ============================================
  // ✅ VALIDAR Y REGISTRAR
  // ============================================
  const validarCampos = () => {
    if (!clienteEncontrado) {
      Alert.alert('Error', 'Debes buscar y encontrar un cliente válido');
      return false;
    }
    if (!formData.nombre || !formData.identificador) {
      Alert.alert('Error', 'Debes buscar un cliente válido');
      return false;
    }
    if (!formData.barrio) {
      Alert.alert('Error', 'El barrio es obligatorio');
      return false;
    }
    if (!formData.direccion) {
      Alert.alert('Error', 'La dirección es obligatoria');
      return false;
    }
    if (!formData.telefono) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    if (!formData.tipo) {
      Alert.alert('Error', 'Debes seleccionar un tipo de visita');
      return false;
    }
    if (formData.tipo === 'Cobro' && !formData.monto) {
      Alert.alert('Error', 'El monto es obligatorio para cobros');
      return false;
    }
    if (formData.tipo === 'Cobro' && isNaN(parseFloat(formData.monto))) {
      Alert.alert('Error', 'El monto debe ser un número válido');
      return false;
    }
    if (formData.tipo === 'Cobro' && parseFloat(formData.monto) <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return false;
    }
    if (!formData.observaciones || formData.observaciones.trim() === '') {
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return false;
    }
    if (!formData.foto) {
      Alert.alert('Error', 'Debes tomar o seleccionar una foto');
      return false;
    }

    return true;
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      identificador: '',
      barrio: '',
      direccion: '',
      telefono: '',
      tipo: 'Visita',
      monto: '',
      observaciones: '',
      foto: null,
    });
    setIdentificador('');
    setSearchTerm('');
    setClienteEncontrado(null);
    setClienteNoEncontrado(false);
    setFotoBase64(null);
    setClientesFiltrados([]);
    setMostrarClientes(false);
    setUbicacion({
      latitude: null,
      longitude: null,
      address: null,
      loadingLocation: false,
      error: null,
    });
    navigation.goBack();
  };

  const handleSubmit = async () => {
    console.log('🚀 Iniciando handleSubmit');
    
    if (!validarCampos()) {
      console.log('❌ Validación fallida, abortando');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        cliente: formData.nombre,
        identificador: formData.identificador,
        barrio: formData.barrio,
        direccion: formData.direccion,
        telefono: formData.telefono,
        tipo: formData.tipo,
        monto: formData.tipo === 'Cobro' ? parseFloat(formData.monto) : 0,
        observaciones: formData.observaciones,
        foto: fotoBase64,
        tecnico: user?.id || user?._id,
        tecnicoNombre: user?.nombre || 'Usuario',
        ubicacion: ubicacion.latitude && ubicacion.longitude ? {
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          address: ubicacion.address,
        } : null,
      };

      // 📌 SI NO HAY INTERNET, GUARDAR OFFLINE
      if (!isConnected) {
        console.log('📱 Sin conexión, guardando offline...');
        await guardarVisitaOffline(dataToSend);
        const total = await contarPendientes();
        setVisitasPendientes(total.total || 0);
        
        Alert.alert(
          '📱 Sin conexión',
          `La visita ha sido guardada localmente.\nPendientes: ${total.total || 0} por sincronizar`,
          [{ text: 'OK', onPress: resetForm }]
        );
        setLoading(false);
        return;
      }

      // SI HAY INTERNET, ENVIAR NORMALMENTE
      console.log('📡 Enviando petición a /visitas...');
      const response = await api.post('/visitas', dataToSend);
      
      console.log('✅ Respuesta recibida:', response.data);

      Alert.alert(
        '✅ Éxito',
        formData.tipo === 'Cobro' ? 'Cobro registrado correctamente' : 'Visita registrada correctamente',
        [{ text: 'OK', onPress: resetForm }]
      );
      
    } catch (error) {
      console.log('❌ Error en la petición:', error.message);
      
      // Si hay error de red, guardar offline como respaldo
      if (error.message?.includes('Network') || error.response?.status === 500 || !isConnected) {
        try {
          const dataToSend = {
            cliente: formData.nombre,
            identificador: formData.identificador,
            barrio: formData.barrio,
            direccion: formData.direccion,
            telefono: formData.telefono,
            tipo: formData.tipo,
            monto: formData.tipo === 'Cobro' ? parseFloat(formData.monto) : 0,
            observaciones: formData.observaciones,
            foto: fotoBase64,
            tecnico: user?.id || user?._id,
            tecnicoNombre: user?.nombre || 'Usuario',
            ubicacion: ubicacion.latitude && ubicacion.longitude ? {
              latitude: ubicacion.latitude,
              longitude: ubicacion.longitude,
              address: ubicacion.address,
            } : null,
          };
          
          await guardarVisitaOffline(dataToSend);
          const total = await contarPendientes();
          setVisitasPendientes(total.total || 0);
          
          Alert.alert(
            '⚠️ Error de conexión',
            `La visita ha sido guardada localmente.\nPendientes: ${total.total || 0} por sincronizar`,
            [{ text: 'OK', onPress: resetForm }]
          );
        } catch (offlineError) {
          Alert.alert('Error', 'No se pudo guardar la visita, intenta nuevamente');
        }
      } else {
        Alert.alert(
          'Error al registrar',
          error.response?.data?.message || error.message || 'Error al registrar la visita'
        );
      }
    } finally {
      setLoading(false);
      console.log('🏁 Finalizado');
    }
  };

  const getIconForTipo = (tipo) => {
    const icons = {
      'Visita': '📋',
      'Cobro': '💰',
      'Instalación': '🔧',
      'Mantenimiento': '🔩',
      'Revisión': '🔍',
      'Otros': '📌',
      'Servicio Técnico': '🛠️'
    };
    return icons[tipo] || '📌';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        
        {/* ============================================ */}
        {/* 📡 ESTADO DE CONEXIÓN */}
        {/* ============================================ */}
        <View style={styles.connectionStatus}>
          <Text style={[styles.connectionText, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? '🟢 Conectado' : '🔴 Sin conexión - Modo offline'}
          </Text>
          {visitasPendientes > 0 && (
            <Text style={styles.pendientesText}>📤 {visitasPendientes} pendiente{visitasPendientes > 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* ============================================ */}
        {/* 🔍 BÚSQUEDA POR NOMBRE */}
        {/* ============================================ */}
        <Text style={styles.label}>Buscar por Nombre</Text>
        <TextInput
          style={styles.input}
          value={searchTerm}
          onChangeText={buscarClientesPorNombre}
          placeholder="Escribe el nombre del cliente..."
        />
        {buscando && <ActivityIndicator style={styles.buscandoIndicator} />}

        {mostrarClientes && clientesFiltrados.length > 0 && (
          <View style={styles.clientesLista}>
            {clientesFiltrados.map((cliente) => (
              <TouchableOpacity
                key={cliente.id || cliente._id}
                style={styles.clienteItem}
                onPress={() => seleccionarCliente(cliente)}
              >
                <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
                <Text style={styles.clienteInfo}>
                  {cliente.identificador && `Cód: ${cliente.identificador} • `}
                  {cliente.barrio && `Barrio: ${cliente.barrio}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ============================================ */}
        {/* 🔍 BÚSQUEDA POR IDENTIFICADOR */}
        {/* ============================================ */}
        <Text style={styles.label}>O buscar por Identificador *</Text>
        <View style={styles.buscarContainer}>
          <TextInput
            style={[styles.input, styles.inputBuscar]}
            value={identificador}
            onChangeText={setIdentificador}
            placeholder="Ingresa el identificador del cliente"
            keyboardType="default"
            editable={!buscando}
          />
          <TouchableOpacity
            style={styles.buscarButton}
            onPress={buscarCliente}
            disabled={buscando}
          >
            {buscando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
            )}
          </TouchableOpacity>
        </View>

        {clienteNoEncontrado && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ Cliente no encontrado</Text>
            <Text style={styles.errorSubText}>El identificador ingresado no corresponde a ningún cliente</Text>
          </View>
        )}

        {clienteEncontrado && (
          <View style={styles.clienteInfo}>
            <Text style={styles.clienteInfoTitle}>✅ Cliente encontrado</Text>
            <Text style={styles.clienteInfoText}>Nombre: {clienteEncontrado.nombre}</Text>
            <Text style={styles.clienteInfoText}>Barrio: {clienteEncontrado.barrio}</Text>
          </View>
        )}

        {/* ============================================ */}
        {/* 📍 UBICACIÓN */}
        {/* ============================================ */}
        <Text style={styles.label}>📍 Ubicación</Text>
        <View style={styles.ubicacionContainer}>
          <TouchableOpacity
            style={styles.ubicacionButton}
            onPress={obtenerUbicacion}
            disabled={ubicacion.loadingLocation}
          >
            {ubicacion.loadingLocation ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.ubicacionButtonText}>
                {ubicacion.latitude ? '📍 Actualizar ubicación' : '📍 Obtener ubicación'}
              </Text>
            )}
          </TouchableOpacity>

          {ubicacion.latitude && (
            <View style={styles.ubicacionInfo}>
              <Text style={styles.ubicacionCoords}>
                Lat: {ubicacion.latitude.toFixed(6)} • Lng: {ubicacion.longitude.toFixed(6)}
              </Text>
              {ubicacion.address && (
                <Text style={styles.ubicacionAddress} numberOfLines={2}>
                  📌 {ubicacion.address}
                </Text>
              )}
            </View>
          )}

          {ubicacion.error && (
            <Text style={styles.ubicacionError}>⚠️ {ubicacion.error}</Text>
          )}
        </View>

        {/* ============================================ */}
        {/* 📝 DATOS DEL CLIENTE */}
        {/* ============================================ */}
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.nombre}
          editable={false}
          placeholder="Buscar cliente primero"
        />

        <Text style={styles.label}>Barrio *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.barrio}
          editable={false}
          placeholder="Buscar cliente primero"
        />

        <Text style={styles.label}>Dirección *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.direccion}
          editable={false}
          placeholder="Buscar cliente primero"
        />

        <Text style={styles.label}>Teléfono *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.telefono}
          editable={false}
          placeholder="Buscar cliente primero"
        />

        {/* ============================================ */}
        {/* 📋 TIPO DE VISITA */}
        {/* ============================================ */}
        <Text style={styles.label}>Tipo de Visita *</Text>
        <View style={styles.tipoContainer}>
          {tiposVisita.map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.tipoButton,
                formData.tipo === tipo && styles.tipoButtonSelected,
              ]}
              onPress={() => setFormData({ ...formData, tipo, monto: tipo === 'Cobro' ? formData.monto : '' })}
            >
              <Text
                style={[
                  styles.tipoButtonText,
                  formData.tipo === tipo && styles.tipoButtonTextSelected,
                ]}
              >
                {getIconForTipo(tipo)} {tipo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Monto - SOLO para Cobro */}
        {formData.tipo === 'Cobro' && (
          <View style={styles.montoContainer}>
            <Text style={styles.label}>Valor en USD *</Text>
            <TextInput
              style={styles.inputMonto}
              value={formData.monto}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setFormData({ ...formData, monto: cleaned });
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.montoHint}>Ingresa solo valores numéricos (ej: 150.00)</Text>
          </View>
        )}

        {/* Observaciones */}
        <Text style={styles.label}>Observaciones *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.observaciones}
          onChangeText={(text) => setFormData({ ...formData, observaciones: text })}
          placeholder="Escribe tus observaciones..."
          multiline
          numberOfLines={4}
        />

        {/* Foto */}
        <Text style={styles.label}>Foto *</Text>
        <View style={styles.fotoContainer}>
          <TouchableOpacity style={styles.fotoButton} onPress={tomarFoto}>
            <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fotoButton} onPress={seleccionarFoto}>
            <Text style={styles.fotoButtonText}>🖼️ Galería</Text>
          </TouchableOpacity>
        </View>
        {formData.foto && (
          <View style={styles.fotoPreviewContainer}>
            <Image source={{ uri: formData.foto }} style={styles.fotoPreview} />
            <TouchableOpacity
              style={styles.eliminarFotoButton}
              onPress={() => {
                setFormData({ ...formData, foto: null });
                setFotoBase64(null);
              }}
            >
              <Text style={styles.eliminarFotoText}>✕ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón de envío */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {formData.tipo === 'Cobro' ? 'Registrar Cobro' : 'Registrar Visita'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  connectionStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connected: {
    color: '#00B894',
  },
  disconnected: {
    color: '#FF6B6B',
  },
  pendientesText: {
    fontSize: 12,
    color: '#636E72',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#636E72',
  },
  inputBuscar: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buscandoIndicator: {
    marginBottom: 10,
  },
  buscarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  buscarButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#D63031',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorSubText: {
    color: '#D63031',
    fontSize: 14,
    marginTop: 5,
  },
  clienteInfo: {
    backgroundColor: '#DFF6DD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  clienteInfoTitle: {
    color: '#00B894',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clienteInfoText: {
    color: '#2E7D32',
    fontSize: 14,
    marginTop: 2,
  },
  clientesLista: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    maxHeight: 200,
  },
  clienteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3436',
  },
  clienteInfo: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  tipoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tipoButtonSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  tipoButtonText: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
  },
  tipoButtonTextSelected: {
    color: '#FFFFFF',
  },
  montoContainer: {
    marginBottom: 15,
  },
  inputMonto: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#00B894',
    marginBottom: 5,
  },
  montoHint: {
    fontSize: 12,
    color: '#636E72',
    fontStyle: 'italic',
    marginTop: 2,
  },
  fotoContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  fotoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
  },
  fotoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fotoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  eliminarFotoButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  eliminarFotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  ubicacionContainer: {
    marginBottom: 15,
  },
  ubicacionButton: {
    backgroundColor: '#0984E3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  ubicacionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  ubicacionInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  ubicacionCoords: {
    fontSize: 13,
    color: '#2D3436',
    fontWeight: '500',
  },
  ubicacionAddress: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  ubicacionError: {
    color: '#FF6B6B',
    fontSize: 13,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RegistroVisita;