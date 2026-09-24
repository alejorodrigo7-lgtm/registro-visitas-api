import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import api, { gestionService } from '../services/api';

const ServiciosGestion = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [imagenBase64, setImagenBase64] = useState(null);
  const [timeoutId, setTimeoutId] = useState(null);
  const [formData, setFormData] = useState({
    cliente: '',
    codigoIdentificador: '',
    barrio: '',
    direccion: '',
    telefono: '',
    telefonoContacto: '',
    tipoContacto: 'Llamada normal',
    observaciones: '',
    imagen: null,
  });

  const subirImagenACloudinary = async (base64Image) => {
    try {
      if (!base64Image) return null;
      const response = await api.post('/upload/subir', {
        imagenBase64: base64Image,
        carpeta: 'servicios',
      });
      return response.data.url;
    } catch (error) {
      throw new Error('No se pudo subir la imagen. Intenta de nuevo.');
    }
  };

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
        const resultados = response.data.data.filter((c) => {
          const nombreMatch =
            c.nombre && c.nombre.toLowerCase().includes(termino.toLowerCase());
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
      console.error('Error buscando clientes:', error);
      setResultadosBusqueda([]);
      setModalVisible(false);
    } finally {
      setBuscando(false);
    }
  };

  const buscarPorCodigo = () => {
    if (!formData.codigoIdentificador || formData.codigoIdentificador.length < 1) {
      Alert.alert('Error', 'Ingresa un código para buscar');
      return;
    }
    buscarClientes(formData.codigoIdentificador);
  };

  const handleNombreChange = (text) => {
    setFormData((prev) => ({ ...prev, cliente: text }));
    if (timeoutId) clearTimeout(timeoutId);
    if (text.length < 2) {
      setResultadosBusqueda([]);
      setModalVisible(false);
      return;
    }
    const newTimeoutId = setTimeout(() => buscarClientes(text), 500);
    setTimeoutId(newTimeoutId);
  };

  const handleCodigoChange = (text) => {
    setFormData((prev) => ({ ...prev, codigoIdentificador: text }));
  };

  const seleccionarCliente = (cliente) => {
    setFormData((prev) => ({
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
        setFormData((prev) => ({ ...prev, imagen: asset.uri }));
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
        setFormData((prev) => ({ ...prev, imagen: asset.uri }));
        setImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const seleccionarTipoContacto = () => {
    Alert.alert('Tipo de contacto', 'Selecciona una opción', [
      {
        text: 'Llamada normal',
        onPress: () =>
          setFormData((p) => ({ ...p, tipoContacto: 'Llamada normal' })),
      },
      {
        text: 'WhatsApp llamada',
        onPress: () =>
          setFormData((p) => ({ ...p, tipoContacto: 'WhatsApp llamada' })),
      },
      {
        text: 'WhatsApp mensaje',
        onPress: () =>
          setFormData((p) => ({ ...p, tipoContacto: 'WhatsApp mensaje' })),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.cliente || !formData.codigoIdentificador) {
      Alert.alert('Error', 'Debes seleccionar un cliente válido');
      return;
    }

    if (
      !formData.telefonoContacto ||
      formData.telefonoContacto.length !== 9
    ) {
      Alert.alert('Error', 'El teléfono de contacto debe tener 9 dígitos');
      return;
    }

    if (!formData.tipoContacto) {
      Alert.alert('Error', 'Debes seleccionar el tipo de contacto');
      return;
    }

    if (!formData.observaciones || formData.observaciones.trim() === '') {
      Alert.alert('Error', 'La descripción es obligatoria');
      return;
    }

    if (!imagenBase64) {
      Alert.alert('Error', 'Debes subir una foto');
      return;
    }

    setLoading(true);
    try {
      let imagenUrl = null;
      try {
        imagenUrl = await subirImagenACloudinary(imagenBase64);
      } catch (uploadError) {
        Alert.alert('Error', uploadError.message);
        setLoading(false);
        return;
      }

      const dataToSend = {
        cliente: formData.cliente,
        codigoIdentificador: formData.codigoIdentificador,
        barrio: formData.barrio,
        direccion: formData.direccion,
        telefono: formData.telefono,
        telefonoContacto: formData.telefonoContacto,
        tipoContacto: formData.tipoContacto,
        observaciones: formData.observaciones,
        imagen: imagenUrl,
      };

      await gestionService.crearServicioGestion(dataToSend);

      Alert.alert('Enviado', 'Servicio enviado a revisión de gestión', [
        {
          text: 'OK',
          onPress: () => {
            setFormData({
              cliente: '',
              codigoIdentificador: '',
              barrio: '',
              direccion: '',
              telefono: '',
              telefonoContacto: '',
              tipoContacto: 'Llamada normal',
              observaciones: '',
              imagen: null,
            });
            setImagenBase64(null);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creando servicio:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Servicios Gestión</Text>
        <Text style={styles.subtitle}>
          Reporta el problema. Se enviará a revisión de gestión.
        </Text>

        <Text style={styles.label}>Nombre del Cliente *</Text>
        <TextInput
          style={styles.input}
          value={formData.cliente}
          onChangeText={handleNombreChange}
          placeholder="Buscar por nombre..."
        />
        {buscando && <Text style={styles.buscandoText}>Buscando...</Text>}

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
            <Text style={styles.buscarButtonText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Barrio</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.barrio}
          editable={false}
          placeholder="Se autocompleta"
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.direccion}
          editable={false}
          placeholder="Se autocompleta"
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.telefono}
          editable={false}
          placeholder="Se autocompleta"
        />

        <Text style={styles.label}>Teléfono de contacto (9 dígitos) *</Text>
        <TextInput
          style={styles.input}
          value={formData.telefonoContacto}
          onChangeText={(text) =>
            setFormData((prev) => ({
              ...prev,
              telefonoContacto: text.replace(/[^0-9]/g, '').slice(0, 9),
            }))
          }
          placeholder="Ej: 995786159"
          keyboardType="numeric"
          maxLength={9}
        />

        <Text style={styles.label}>Tipo de contacto *</Text>
        <TouchableOpacity
          style={styles.pickerWrapper}
          onPress={seleccionarTipoContacto}
        >
          <Text style={styles.pickerTrigger}>{formData.tipoContacto}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Descripción del problema *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.observaciones}
          onChangeText={(text) =>
            setFormData((prev) => ({ ...prev, observaciones: text }))
          }
          placeholder="Detalla el problema..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Foto *</Text>
        <View style={styles.fotoContainer}>
          <TouchableOpacity style={styles.fotoButton} onPress={tomarFoto}>
            <Text style={styles.fotoButtonText}>Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fotoButton} onPress={seleccionarFoto}>
            <Text style={styles.fotoButtonText}>Galería</Text>
          </TouchableOpacity>
        </View>
        {formData.imagen && (
          <View style={styles.fotoPreviewContainer}>
            <Image source={{ uri: formData.imagen }} style={styles.fotoPreview} />
            <TouchableOpacity
              style={styles.eliminarFotoButton}
              onPress={() => {
                setFormData((prev) => ({ ...prev, imagen: null }));
                setImagenBase64(null);
              }}
            >
              <Text style={styles.eliminarFotoText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar a Revisión</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona un cliente</Text>
            <FlatList
              data={resultadosBusqueda}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultadoItem}
                  onPress={() => seleccionarCliente(item)}
                >
                  <Text style={styles.resultadoNombre}>{item.nombre}</Text>
                  <Text style={styles.resultadoCodigo}>
                    Código: {item.identificador}
                  </Text>
                  <Text style={styles.resultadoInfo}>
                    {item.barrio} - {item.direccion}
                  </Text>
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  form: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#636E72',
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
  inputDisabled: { backgroundColor: '#F0F0F0', color: '#636E72' },
  textArea: { height: 100, textAlignVertical: 'top' },
  buscandoText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: -10,
    marginBottom: 10,
  },
  codigoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codigoInput: { flex: 1, marginBottom: 0 },
  buscarButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  buscarButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    padding: 15,
  },
  pickerTrigger: {
    fontSize: 16,
    color: '#2D3436',
  },
  fotoContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  fotoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
  },
  fotoButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  fotoPreviewContainer: { alignItems: 'center', marginBottom: 15 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 10 },
  eliminarFotoButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  eliminarFotoText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  submitButton: {
    backgroundColor: '#00B894',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
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
    marginBottom: 15,
  },
  resultadoItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultadoNombre: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  resultadoCodigo: { fontSize: 14, color: '#636E72', marginTop: 2 },
  resultadoInfo: { fontSize: 14, color: '#636E72', marginTop: 2 },
  noResultados: { textAlign: 'center', color: '#636E72', padding: 20 },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: { color: '#2D3436', fontSize: 14, fontWeight: '500' },
});

export default ServiciosGestion;