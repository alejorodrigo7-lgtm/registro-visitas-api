import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RegistroVisita = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  
  // 🔍 Búsqueda por identificador
  const [identificador, setIdentificador] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
  
  // 🔍 Búsqueda por nombre
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState([]);
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
  // 🔍 BUSCAR CLIENTE POR IDENTIFICADOR
  // ============================================
  const buscarCliente = async () => {
    console.log('🔍 1. Iniciando búsqueda por identificador:', identificador);
    
    if (!identificador || identificador.trim() === '') {
      console.log('❌ 2. Identificador vacío');
      Alert.alert('Error', 'Por favor ingresa un identificador');
      return;
    }

    setBuscando(true);
    setClienteNoEncontrado(false);
    setClienteEncontrado(null);
    
    try {
      console.log('📡 3. Buscando cliente en:', `/clientes/buscar/${identificador.trim()}`);
      const response = await api.get(`/clientes/buscar/${identificador.trim()}`);
      console.log('✅ 4. Respuesta:', response.data);
      
      if (response.data.success) {
        const cliente = response.data.data;
        console.log('✅ 5. Cliente encontrado:', cliente);
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
        Alert.alert('Éxito', `Cliente encontrado: ${cliente.nombre}`);
      }
    } catch (error) {
      console.log('❌ 6. Error en búsqueda:', error);
      if (error.response?.status === 404) {
        console.log('❌ 7. Cliente no encontrado (404)');
        setClienteEncontrado(null);
        setClienteNoEncontrado(true);
        setFormData({
          ...formData,
          nombre: '',
          identificador: '',
          barrio: '',
          direccion: '',
          telefono: '',
        });
        Alert.alert('Cliente no encontrado', `No se encontró cliente con identificador ${identificador}`);
      } else {
        console.log('❌ 8. Error inesperado:', error.message);
        Alert.alert('Error', 'Error al buscar el cliente');
      }
    } finally {
      setBuscando(false);
      console.log('🏁 9. Búsqueda finalizada');
    }
  };

  // ============================================
  // 🔍 BUSCAR CLIENTES POR NOMBRE
  // ============================================
  const buscarClientesPorNombre = async (text) => {
    console.log('🔍 10. Buscando por nombre:', text);
    setSearchTerm(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!text || text.length < 2) {
      console.log('❌ 11. Texto muy corto, limpiando resultados');
      setClientesFiltrados([]);
      setMostrarClientes(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setBuscando(true);
      try {
        console.log('📡 12. Buscando en:', `/clientes/todos?search=${encodeURIComponent(text)}&limit=20`);
        const response = await api.get(`/clientes/todos?search=${encodeURIComponent(text)}&limit=20`);
        console.log('✅ 13. Respuesta:', response.data);
        if (response.data.success) {
          const resultados = response.data.data || [];
          console.log('✅ 14. Resultados encontrados:', resultados.length);
          setClientes(resultados);
          setClientesFiltrados(resultados);
          setMostrarClientes(resultados.length > 0);
          
          if (resultados.length === 1) {
            console.log('✅ 15. Seleccionando único resultado');
            seleccionarCliente(resultados[0]);
          }
        }
      } catch (error) {
        console.log('❌ 16. Error en búsqueda por nombre:', error);
      } finally {
        setBuscando(false);
      }
    }, 500);
  };

  // ============================================
  // 📋 SELECCIONAR CLIENTE
  // ============================================
  const seleccionarCliente = (cliente) => {
    console.log('✅ 17. Seleccionando cliente:', cliente);
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
    console.log('📍 18. Solicitando ubicación...');
    setUbicacion(prev => ({ ...prev, loadingLocation: true, error: null }));

    try {
      console.log('📍 19. Solicitando permisos...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ 20. Permiso denegado');
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

      console.log('📍 21. Obteniendo posición...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('📍 22. Posición obtenida:', { latitude, longitude });

      let address = null;
      try {
        console.log('📍 23. Geocodificando dirección...');
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = `${addr.street || ''} ${addr.name || ''}, ${addr.district || ''}, ${addr.city || ''}`.trim();
          console.log('📍 24. Dirección encontrada:', address);
        }
      } catch (geoError) {
        console.log('⚠️ 25. Error en geocodificación:', geoError);
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
      console.log('❌ 26. Error al obtener ubicación:', error);
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
    console.log('📸 27. Tomando foto...');
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ 28. Permiso de cámara denegado');
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
        console.log('✅ 29. Foto tomada correctamente');
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      } else {
        console.log('❌ 30. Foto cancelada');
      }
    } catch (error) {
      console.log('❌ 31. Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarFoto = async () => {
    console.log('🖼️ 32. Seleccionando foto de galería...');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ 33. Permiso de galería denegado');
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
        console.log('✅ 34. Foto seleccionada correctamente');
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      } else {
        console.log('❌ 35. Selección cancelada');
      }
    } catch (error) {
      console.log('❌ 36. Error al seleccionar foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  // ============================================
  // ✅ VALIDAR Y REGISTRAR
  // ============================================
  const validarCampos = () => {
    console.log('🔍 37. Iniciando validación de campos...');
    console.log('📋 38. Estado actual:', {
      clienteEncontrado: !!clienteEncontrado,
      nombre: formData.nombre,
      identificador: formData.identificador,
      barrio: formData.barrio,
      direccion: formData.direccion,
      telefono: formData.telefono,
      tipo: formData.tipo,
      monto: formData.monto,
      observaciones: formData.observaciones,
      foto: !!formData.foto,
    });

    if (!clienteEncontrado) {
      console.log('❌ 39. Error: Cliente no encontrado');
      Alert.alert('Error', 'Debes buscar y encontrar un cliente válido');
      return false;
    }
    if (!formData.nombre || !formData.identificador) {
      console.log('❌ 40. Error: Nombre o identificador vacío');
      Alert.alert('Error', 'Debes buscar un cliente válido');
      return false;
    }
    if (!formData.barrio) {
      console.log('❌ 41. Error: Barrio vacío');
      Alert.alert('Error', 'El barrio es obligatorio');
      return false;
    }
    if (!formData.direccion) {
      console.log('❌ 42. Error: Dirección vacía');
      Alert.alert('Error', 'La dirección es obligatoria');
      return false;
    }
    if (!formData.telefono) {
      console.log('❌ 43. Error: Teléfono vacío');
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    if (!formData.tipo) {
      console.log('❌ 44. Error: Tipo vacío');
      Alert.alert('Error', 'Debes seleccionar un tipo de visita');
      return false;
    }
    if (formData.tipo === 'Cobro' && !formData.monto) {
      console.log('❌ 45. Error: Monto vacío para Cobro');
      Alert.alert('Error', 'El monto es obligatorio para cobros');
      return false;
    }
    if (formData.tipo === 'Cobro' && isNaN(parseFloat(formData.monto))) {
      console.log('❌ 46. Error: Monto inválido');
      Alert.alert('Error', 'El monto debe ser un número válido');
      return false;
    }
    if (formData.tipo === 'Cobro' && parseFloat(formData.monto) <= 0) {
      console.log('❌ 47. Error: Monto menor o igual a 0');
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return false;
    }
    if (!formData.observaciones || formData.observaciones.trim() === '') {
      console.log('❌ 48. Error: Observaciones vacías');
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return false;
    }
    if (!formData.foto) {
      console.log('❌ 49. Error: Foto vacía');
      Alert.alert('Error', 'Debes tomar o seleccionar una foto');
      return false;
    }

    console.log('✅ 50. Validación exitosa!');
    return true;
  };

  const handleSubmit = async () => {
    console.log('🚀 51. Iniciando handleSubmit');
    
    if (!validarCampos()) {
      console.log('❌ 52. Validación fallida, abortando');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 53. Preparando datos para enviar...');
      
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
        ubicacion: ubicacion.latitude && ubicacion.longitude ? {
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          address: ubicacion.address,
        } : null,
      };

      console.log('📦 54. Data a enviar:', JSON.stringify({
        ...dataToSend,
        foto: dataToSend.foto ? 'BASE64_DATA (omitiendo para log)' : null,
      }, null, 2));

      console.log('📡 55. Enviando petición a /visitas...');
      const response = await api.post('/visitas', dataToSend);
      
      console.log('✅ 56. Respuesta recibida:', response.data);

      Alert.alert(
        'Éxito',
        formData.tipo === 'Cobro' ? 'Cobro registrado correctamente' : 'Visita registrada correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
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
            },
          },
        ]
      );
      
    } catch (error) {
      console.log('❌ 57. ERROR en la petición:');
      console.log('❌ 58. Error completo:', error);
      console.log('❌ 59. Response:', error.response);
      console.log('❌ 60. Response data:', error.response?.data);
      console.log('❌ 61. Status:', error.response?.status);
      
      Alert.alert(
        'Error al registrar',
        error.response?.data?.message || error.message || 'Error al registrar la visita'
      );
    } finally {
      setLoading(false);
      console.log('🏁 62. Finalizado');
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
                key={cliente._id}
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