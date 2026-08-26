import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TomarServicio = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [tecnicos, setTecnicos] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [telefonoAdicional, setTelefonoAdicional] = useState('');
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    codigoIdentificador: '',
    barrio: '',
    direccion: '',
    telefono: '',
    nombreServicio: 'INSTALACION DUO',
    telefonos: [],
    observaciones: '',
    tecnicoAsignado: '',
    jefeAsignado: '',
    imagen: null,
  });
  const [imagenBase64, setImagenBase64] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);

  // ✅ OPCIONES DE SERVICIO CON LAS NUEVAS AGREGADAS
  const opcionesServicio = [
    'INSTALACION DUO',
    'INSTALACION INTERNET',
    'INSTALACION TV',
    'SIN INTERNET (FOCO ROJO)',
    'INTERNET DEFICIENTE',
    'SIN SEÑAL DE TV',
    'TV DEFICIENTE',
    'CORTE TV',
    'CORTE INTERNET',
  ];

  // ============================================
  // 📤 SUBIR IMAGEN A CLOUDINARY
  // ============================================
  const subirImagenACloudinary = async (base64Image) => {
    try {
      if (!base64Image) return null;
      
      console.log('📤 Subiendo imagen a Cloudinary...');
      const response = await api.post('/upload/subir', {
        imagenBase64: base64Image,
        carpeta: 'servicios'
      });
      console.log('✅ Imagen subida a Cloudinary:', response.data.url);
      return response.data.url;
    } catch (error) {
      console.error('❌ Error subiendo imagen a Cloudinary:', error);
      throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
    }
  };

  // ✅ Cargar usuarios con mejor manejo de errores
  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        setCargandoUsuarios(true);
        setErrorUsuarios(null);
        console.log('📱 === CARGANDO USUARIOS ===');
        console.log('📱 Usuario logueado:', user?.email);
        
        const response = await api.get('/auth/usuarios');
        console.log('📱 Respuesta recibida:', response.status);
        
        let usuariosData = [];
        if (response.data && response.data.data) {
          usuariosData = response.data.data;
        } else if (Array.isArray(response.data)) {
          usuariosData = response.data;
        } else {
          console.error('❌ Estructura de respuesta inesperada:', response.data);
          setErrorUsuarios('Estructura de datos inesperada');
          setCargandoUsuarios(false);
          return;
        }

        console.log(`📱 Usuarios recibidos: ${usuariosData.length}`);

        usuariosData.forEach(u => {
          console.log(`📱 Usuario: ${u.nombre} (${u.email}) - Rol: ${u.rol}`);
        });

        const tecnicosFiltrados = usuariosData.filter(u => 
          u.rol === 'Tecnico' || u.rol === 'Coordinador'
        );
        
        const jefesFiltrados = usuariosData.filter(u => 
          u.rol === 'Admin' || u.rol === 'Jefe'
        );

        console.log(`✅ Técnicos encontrados: ${tecnicosFiltrados.length}`);
        console.log(`✅ Jefes encontrados: ${jefesFiltrados.length}`);

        setTecnicos(tecnicosFiltrados);
        setJefes(jefesFiltrados);
      } catch (error) {
        console.error('❌ Error al cargar usuarios:', error);
        console.error('❌ Detalles:', error.response?.data);
        setErrorUsuarios(error.response?.data?.message || 'Error al cargar usuarios');
        Alert.alert('Error', 'No se pudieron cargar los usuarios');
      } finally {
        setCargandoUsuarios(false);
      }
    };
    cargarUsuarios();
  }, []);

  // Buscar clientes por término (nombre o código)
  const buscarClientes = async (termino) => {
    if (!termino || termino.length < 2) {
      setResultadosBusqueda([]);
      setModalVisible(false);
      return;
    }

    setBuscando(true);
    try {
      const response = await api.get(`/clientes/todos?search=${termino}`);
      if (response.data.success && response.data.data.length > 0) {
        const resultados = response.data.data.filter(c => {
          const nombreMatch = c.nombre && c.nombre.toLowerCase().includes(termino.toLowerCase());
          const codigoMatch = c.identificador && c.identificador.includes(termino);
          return nombreMatch || codigoMatch;
        });

        if (resultados.length > 0) {
          setResultadosBusqueda(resultados);
          setTerminoBusqueda(termino);
          setModalVisible(true);
        } else {
          setResultadosBusqueda([]);
          setModalVisible(false);
        }
      } else {
        setResultadosBusqueda([]);
        setModalVisible(false);
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      setResultadosBusqueda([]);
      setModalVisible(false);
    } finally {
      setBuscando(false);
    }
  };

  // Buscar por código (SOLO con botón)
  const buscarPorCodigo = () => {
    if (!formData.codigoIdentificador || formData.codigoIdentificador.length < 1) {
      Alert.alert('Error', 'Ingresa un código para buscar');
      return;
    }
    buscarClientes(formData.codigoIdentificador);
  };

  // Manejar cambio en nombre (con debounce)
  const handleNombreChange = (text) => {
    setFormData(prev => ({ ...prev, cliente: text }));

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (text.length < 2) {
      setResultadosBusqueda([]);
      setModalVisible(false);
      return;
    }

    const newTimeoutId = setTimeout(() => {
      buscarClientes(text);
    }, 500);
    setTimeoutId(newTimeoutId);
  };

  // Manejar cambio en código (SOLO actualiza el campo, NO busca automáticamente)
  const handleCodigoChange = (text) => {
    setFormData(prev => ({ ...prev, codigoIdentificador: text }));
  };

  // Seleccionar cliente de la lista
  const seleccionarCliente = (cliente) => {
    setFormData(prev => ({
      ...prev,
      cliente: cliente.nombre || '',
      codigoIdentificador: cliente.identificador || '',
      barrio: cliente.barrio || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
    }));
    setResultadosBusqueda([]);
    setModalVisible(false);
  };

  // Tomar/Seleccionar foto
  const tomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
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
        setFormData(prev => ({ ...prev, imagen: asset.uri }));
        setImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarFoto = async () => {
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
        setFormData(prev => ({ ...prev, imagen: asset.uri }));
        setImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Validar y guardar
  const handleSubmit = async () => {
    // Validar que se haya seleccionado un cliente
    if (!formData.cliente || !formData.codigoIdentificador) {
      Alert.alert('Error', 'Debes seleccionar un cliente válido');
      return;
    }

    const camposObligatorios = [
      'cliente', 'codigoIdentificador', 'barrio', 'direccion', 'telefono',
      'nombreServicio', 'observaciones', 'tecnicoAsignado', 'jefeAsignado'
    ];

    for (const campo of camposObligatorios) {
      if (!formData[campo] || formData[campo].trim() === '') {
        Alert.alert('Error', `El campo ${campo} es obligatorio`);
        return;
      }
    }

    if (!formData.telefonos || formData.telefonos.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un teléfono adicional');
      return;
    }

    // TODOS los servicios requieren foto
    if (!imagenBase64) {
      Alert.alert('Error', 'Debes subir una foto para este servicio');
      return;
    }

    setLoading(true);
    try {
      // ✅ SUBIR IMAGEN A CLOUDINARY
      let imagenUrl = null;
      try {
        imagenUrl = await subirImagenACloudinary(imagenBase64);
      } catch (uploadError) {
        Alert.alert('Error', uploadError.message || 'No se pudo subir la imagen');
        setLoading(false);
        return;
      }

      // ✅ ENVIAR SERVICIO CON URL DE CLOUDINARY
      const dataToSend = {
        cliente: formData.cliente,
        codigoIdentificador: formData.codigoIdentificador,
        barrio: formData.barrio,
        direccion: formData.direccion,
        telefono: formData.telefono,
        nombreServicio: formData.nombreServicio,
        telefonos: formData.telefonos,
        observaciones: formData.observaciones,
        tecnicoAsignado: formData.tecnicoAsignado,
        jefeAsignado: formData.jefeAsignado,
        imagen: imagenUrl, // ✅ URL DE CLOUDINARY
      };

      console.log('📤 Enviando servicio con imagen Cloudinary:', dataToSend);

      const response = await api.post('/servicios/tomar', dataToSend);
      console.log('✅ Servicio tomado:', response.data);

      Alert.alert(
        'Éxito',
        'Servicio tomado correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                cliente: '',
                codigoIdentificador: '',
                barrio: '',
                direccion: '',
                telefono: '',
                nombreServicio: 'INSTALACION DUO',
                telefonos: [],
                observaciones: '',
                tecnicoAsignado: '',
                jefeAsignado: '',
                imagen: null,
              });
              setImagenBase64(null);
              setTelefonoAdicional('');
              setResultadosBusqueda([]);
              setModalVisible(false);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error al tomar servicio:', error);
      console.error('❌ Detalles:', error.response?.data);
      Alert.alert('Error', error.response?.data?.message || 'Error al tomar el servicio');
    } finally {
      setLoading(false);
    }
  };

  // Agregar teléfono
  const agregarTelefono = () => {
    if (!telefonoAdicional || telefonoAdicional.length !== 9) {
      Alert.alert('Error', 'El teléfono debe tener 9 dígitos y no comenzar con 0');
      return;
    }
    if (formData.telefonos.includes(telefonoAdicional)) {
      Alert.alert('Error', 'Este teléfono ya fue agregado');
      return;
    }
    setFormData(prev => ({
      ...prev,
      telefonos: [...prev.telefonos, telefonoAdicional],
    }));
    setTelefonoAdicional('');
  };

  const eliminarTelefono = (index) => {
    setFormData(prev => ({
      ...prev,
      telefonos: prev.telefonos.filter((_, i) => i !== index),
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>📋 Tomar Servicio</Text>

        {/* Búsqueda por nombre */}
        <Text style={styles.label}>Nombre del Cliente *</Text>
        <TextInput
          style={styles.input}
          value={formData.cliente}
          onChangeText={handleNombreChange}
          placeholder="Buscar por nombre (ej: Perez)..."
        />
        {buscando && <Text style={styles.buscandoText}>🔍 Buscando...</Text>}

        {/* Búsqueda por código con botón */}
        <Text style={styles.label}>Código/Identificador *</Text>
        <View style={styles.codigoContainer}>
          <TextInput
            style={[styles.input, styles.codigoInput]}
            value={formData.codigoIdentificador}
            onChangeText={handleCodigoChange}
            placeholder="Buscar por código..."
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.buscarButton} onPress={buscarPorCodigo}>
            <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Datos autocompletados */}
        <Text style={styles.label}>Barrio *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.barrio}
          editable={false}
          placeholder="Se autocompleta al seleccionar cliente"
        />

        <Text style={styles.label}>Dirección *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.direccion}
          editable={false}
          placeholder="Se autocompleta al seleccionar cliente"
        />

        <Text style={styles.label}>Teléfono Principal *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.telefono}
          editable={false}
          placeholder="Se autocompleta al seleccionar cliente"
        />

        {/* Teléfonos adicionales */}
        <Text style={styles.label}>Teléfonos Adicionales</Text>
        <View style={styles.telefonoContainer}>
          <TextInput
            style={[styles.input, styles.telefonoInput]}
            value={telefonoAdicional}
            onChangeText={setTelefonoAdicional}
            placeholder="9 dígitos (sin 0)"
            keyboardType="numeric"
            maxLength={9}
          />
          <TouchableOpacity style={styles.agregarButton} onPress={agregarTelefono}>
            <Text style={styles.agregarButtonText}>➕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.telefonosLista}>
          {formData.telefonos.map((tel, index) => (
            <View key={index} style={styles.telefonoItem}>
              <Text style={styles.telefonoItemText}>📱 {tel}</Text>
              <TouchableOpacity onPress={() => eliminarTelefono(index)}>
                <Text style={styles.eliminarTelefonoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tipo de Servicio - CON LAS NUEVAS OPCIONES */}
        <Text style={styles.label}>Nombre del Servicio *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.nombreServicio}
            onValueChange={(itemValue) => setFormData(prev => ({ ...prev, nombreServicio: itemValue }))}
            style={styles.picker}
          >
            {opcionesServicio.map((opcion) => (
              <Picker.Item key={opcion} label={opcion} value={opcion} />
            ))}
          </Picker>
        </View>

        {/* Observaciones */}
        <Text style={styles.label}>Observaciones *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.observaciones}
          onChangeText={(text) => setFormData(prev => ({ ...prev, observaciones: text }))}
          placeholder="Ingresa observaciones..."
          multiline
          numberOfLines={3}
        />

        {/* Responsable (no editable) */}
        <Text style={styles.label}>Responsable *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={user?.nombre || ''}
          editable={false}
        />

        {/* ✅ Asignar Técnico */}
        <Text style={styles.label}>Asignar Técnico *</Text>
        <View style={styles.pickerContainer}>
          {cargandoUsuarios ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#6C5CE7" />
              <Text style={styles.loaderText}>Cargando técnicos...</Text>
            </View>
          ) : errorUsuarios ? (
            <Text style={styles.errorText}>⚠️ Error: {errorUsuarios}</Text>
          ) : tecnicos.length === 0 ? (
            <Text style={styles.errorText}>⚠️ No hay técnicos disponibles</Text>
          ) : (
            <Picker
              selectedValue={formData.tecnicoAsignado}
              onValueChange={(itemValue) => {
                console.log('📱 Técnico seleccionado:', itemValue);
                setFormData(prev => ({ ...prev, tecnicoAsignado: itemValue }));
              }}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona un técnico..." value="" />
              {tecnicos.map((t) => (
                <Picker.Item key={t._id} label={`${t.nombre} (${t.rol})`} value={t._id} />
              ))}
            </Picker>
          )}
        </View>

        {/* ✅ Asignar Jefe */}
        <Text style={styles.label}>Asignar Jefe *</Text>
        <View style={styles.pickerContainer}>
          {cargandoUsuarios ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color="#6C5CE7" />
              <Text style={styles.loaderText}>Cargando jefes...</Text>
            </View>
          ) : errorUsuarios ? (
            <Text style={styles.errorText}>⚠️ Error: {errorUsuarios}</Text>
          ) : jefes.length === 0 ? (
            <Text style={styles.errorText}>⚠️ No hay jefes disponibles</Text>
          ) : (
            <Picker
              selectedValue={formData.jefeAsignado}
              onValueChange={(itemValue) => {
                console.log('📱 Jefe seleccionado:', itemValue);
                setFormData(prev => ({ ...prev, jefeAsignado: itemValue }));
              }}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona un jefe..." value="" />
              {jefes.map((j) => (
                <Picker.Item key={j._id} label={`${j.nombre} (${j.rol})`} value={j._id} />
              ))}
            </Picker>
          )}
        </View>

        {/* Foto - TODOS los servicios requieren foto */}
        <Text style={styles.label}>Foto *</Text>
        <View style={styles.fotoContainer}>
          <TouchableOpacity style={styles.fotoButton} onPress={tomarFoto}>
            <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fotoButton} onPress={seleccionarFoto}>
            <Text style={styles.fotoButtonText}>🖼️ Galería</Text>
          </TouchableOpacity>
        </View>
        {formData.imagen && (
          <View style={styles.fotoPreviewContainer}>
            <Image source={{ uri: formData.imagen }} style={styles.fotoPreview} />
            <TouchableOpacity
              style={styles.eliminarFotoButton}
              onPress={() => {
                setFormData(prev => ({ ...prev, imagen: null }));
                setImagenBase64(null);
              }}
            >
              <Text style={styles.eliminarFotoText}>✕ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botón Subir */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>📤 Subir Servicio</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de resultados de búsqueda */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Selecciona un cliente</Text>
            {terminoBusqueda && (
              <Text style={styles.modalSubtitle}>
                {resultadosBusqueda.length} coincidencia(s) encontradas para "{terminoBusqueda}"
              </Text>
            )}
            <FlatList
              data={resultadosBusqueda}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultadoItem}
                  onPress={() => seleccionarCliente(item)}
                >
                  <Text style={styles.resultadoNombre}>{item.nombre}</Text>
                  <Text style={styles.resultadoCodigo}>Código: {item.identificador}</Text>
                  <Text style={styles.resultadoInfo}>{item.barrio} - {item.direccion}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noResultados}>No se encontraron clientes</Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 20,
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
    backgroundColor: '#F0F0F0',
    color: '#636E72',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buscandoText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: -10,
    marginBottom: 10,
  },
  codigoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codigoInput: {
    flex: 1,
    marginBottom: 0,
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 10,
  },
  loaderText: {
    fontSize: 14,
    color: '#636E72',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    overflow: 'hidden',
    minHeight: 50,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  telefonoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telefonoInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  agregarButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  agregarButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  telefonosLista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  telefonoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    margin: 4,
  },
  telefonoItemText: {
    fontSize: 14,
    color: '#2D3436',
    marginRight: 8,
  },
  eliminarTelefonoText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
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
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 15,
  },
  resultadoItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultadoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  resultadoCodigo: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  resultadoInfo: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  noResultados: {
    textAlign: 'center',
    color: '#636E72',
    padding: 20,
    fontSize: 16,
  },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#2D3436',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TomarServicio;