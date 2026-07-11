import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
  const [identificador, setIdentificador] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [clienteNoEncontrado, setClienteNoEncontrado] = useState(false);
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

  // Tipos de visita completos
  const tiposVisita = [
    'Visita',
    'Cobro',
    'Instalación',
    'Servicio Técnico',
    'Otro'
  ];

  // Buscar cliente por identificador
  const buscarCliente = async () => {
    if (!identificador || identificador.trim() === '') {
      Alert.alert('Error', 'Por favor ingresa un identificador');
      return;
    }

    setBuscando(true);
    setClienteNoEncontrado(false);
    setClienteEncontrado(null);
    
    try {
      const response = await api.get(`/clientes/buscar/${identificador.trim()}`);
      
      if (response.data.success) {
        const cliente = response.data.data;
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
        Alert.alert('Éxito', `Cliente encontrado: ${cliente.nombre}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
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
        Alert.alert('Error', 'Error al buscar el cliente');
        console.error(error);
      }
    } finally {
      setBuscando(false);
    }
  };

  // Tomar foto con la cámara
  const tomarFoto = async () => {
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
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
      console.log(error);
    }
  };

  // Seleccionar foto de la galería
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
        setFormData({ ...formData, foto: asset.uri });
        setFotoBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la foto');
      console.log(error);
    }
  };

  // Validar campos obligatorios
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

  // Registrar visita
  const handleSubmit = async () => {
    if (!validarCampos()) return;

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
        tecnico: user?.id,
      };

      const response = await api.post('/visitas', dataToSend);

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
              setClienteEncontrado(null);
              setClienteNoEncontrado(false);
              setFotoBase64(null);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al registrar la visita');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el icono según el tipo
  const getIconForTipo = (tipo) => {
    const icons = {
      'Visita': '📋',
      'Cobro': '💰',
      'Instalación': '🔧',
      'Servicio Técnico': '🛠️',
      'Otro': '📌'
    };
    return icons[tipo] || '📌';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Identificador con botón de búsqueda */}
        <Text style={styles.label}>Identificador *</Text>
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

        {/* Mensaje de cliente no encontrado */}
        {clienteNoEncontrado && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ Cliente no encontrado</Text>
            <Text style={styles.errorSubText}>El identificador ingresado no corresponde a ningún cliente</Text>
          </View>
        )}

        {/* Cliente encontrado - información */}
        {clienteEncontrado && (
          <View style={styles.clienteInfo}>
            <Text style={styles.clienteInfoTitle}>✅ Cliente encontrado</Text>
            <Text style={styles.clienteInfoText}>Nombre: {clienteEncontrado.nombre}</Text>
            <Text style={styles.clienteInfoText}>Barrio: {clienteEncontrado.barrio}</Text>
          </View>
        )}

        {/* Campos de cliente (autocompletados) */}
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

        {/* Tipo de Visita - Todos los tipos */}
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
                // Solo permitir números y punto decimal
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