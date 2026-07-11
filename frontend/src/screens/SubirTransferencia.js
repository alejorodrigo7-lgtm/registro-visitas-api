import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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

const SubirTransferencia = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [soporteBase64, setSoporteBase64] = useState(null);
  const [formData, setFormData] = useState({
    responsable: user?.nombre || '',
    fechaTransferencia: new Date(),
    codigoIdentificador: '',
    nombreUsuario: '',
    numeroDocumento: '',
    valor: '',
    zonaSector: 'TOLA',
    barrio: '',
    bancoCuenta: '',
    soporte: null,
  });

  const zonasSector = ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'];

  const barriosPorZona = {
    'TOLA': ['TOLA 1', 'TOLA 2', 'EL DORADO', 'LOMA GRANDE'],
    'SAN JOSE DE CHILIBULO': ['SAN JOSE DE CHILIBULO'],
    'MAGDALENA': ['MAGDALENA', 'ATAHUALPA OCCIDENTAL', 'SANTA ANA'],
  };

  const bancosCuentas = [
    'Nº 4738408100 Banco Pichincha de Mary Luz Cordoba',
    'DE UNA PICHINCHA',
    'Nº 440777713 Banco Internacional de mary luz cordoba',
    'Nº 1062290134 Banco Pacifico de Mary Luz Cordoba',
    'Nº 0002883320 Banco Guayaquil de Mary Luz Córdoba',
    'Nº 12673124431 Produbanco de Isabela Cordoba',
    'Nº 10686771544 Banco Pacifico de Isabela Cordoba',
    'Nº 00027212641 Banco Guayaquil de Isabela Córdoba',
    'Nº 2213045031 Banco Pichincha de Mary Luz Cordoba',
    'WRIVERA',
  ];

  // Actualizar barrio cuando cambia la zona
  useEffect(() => {
    const barriosDisponibles = barriosPorZona[formData.zonaSector] || [];
    setFormData(prev => ({
      ...prev,
      barrio: barriosDisponibles[0] || '',
    }));
  }, [formData.zonaSector]);

  // ============================================
  // 🔍 BUSCAR CLIENTE POR CÓDIGO/IDENTIFICADOR
  // ============================================
  const buscarUsuario = async (codigo) => {
    if (!codigo || codigo.length < 2) {
      setFormData(prev => ({ ...prev, nombreUsuario: '' }));
      return;
    }

    try {
      console.log('🔍 Buscando cliente con código:', codigo);
      const response = await api.get(`/clientes/buscar/${codigo}`);
      console.log('📡 Respuesta:', response.data);
      
      if (response.data.success) {
        const cliente = response.data.data;
        setFormData(prev => ({
          ...prev,
          nombreUsuario: cliente.nombre || '',
        }));
        console.log('✅ Cliente encontrado:', cliente.nombre);
      } else {
        setFormData(prev => ({
          ...prev,
          nombreUsuario: '',
        }));
        console.log('⚠️ Cliente no encontrado');
      }
    } catch (error) {
      console.error('❌ Error al buscar cliente:', error);
      setFormData(prev => ({
        ...prev,
        nombreUsuario: '',
      }));
    }
  };

  // Manejar cambio de código con debounce
  const handleCodigoChange = (text) => {
    setFormData(prev => ({ ...prev, codigoIdentificador: text }));
    if (window.timeoutId) {
      clearTimeout(window.timeoutId);
    }
    window.timeoutId = setTimeout(() => buscarUsuario(text), 500);
  };

  // ============================================
  // 📸 SOPORTE - TOMAR/SELECCIONAR FOTO
  // ============================================
  const tomarSoporte = async () => {
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
        setFormData(prev => ({ ...prev, soporte: asset.uri }));
        setSoporteBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarSoporte = async () => {
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
        setFormData(prev => ({ ...prev, soporte: asset.uri }));
        setSoporteBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // ============================================
  // 📤 SUBIR TRANSFERENCIA
  // ============================================
  const handleSubmit = async () => {
    // Validar campos obligatorios
    const camposObligatorios = [
      { key: 'codigoIdentificador', label: 'Código/Identificador' },
      { key: 'nombreUsuario', label: 'Nombre del Usuario' },
      { key: 'numeroDocumento', label: 'Número de Documento' },
      { key: 'valor', label: 'Valor' },
      { key: 'zonaSector', label: 'Zona/Sector' },
      { key: 'barrio', label: 'Barrio' },
      { key: 'bancoCuenta', label: 'Banco y Cuenta' },
    ];

    for (const campo of camposObligatorios) {
      if (!formData[campo.key] || formData[campo.key].trim() === '') {
        Alert.alert('Error', `El campo ${campo.label} es obligatorio`);
        return;
      }
    }

    if (!soporteBase64) {
      Alert.alert('Error', 'Debes subir un soporte de transferencia');
      return;
    }

    if (parseFloat(formData.valor) <= 0) {
      Alert.alert('Error', 'El valor debe ser mayor a 0');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        fechaTransferencia: fechaSeleccionada.toISOString(),
        codigoIdentificador: formData.codigoIdentificador,
        nombreUsuario: formData.nombreUsuario,
        numeroDocumento: formData.numeroDocumento,
        valor: parseFloat(formData.valor),
        zonaSector: formData.zonaSector,
        barrio: formData.barrio,
        bancoCuenta: formData.bancoCuenta,
        soporte: 'Soporte adjunto',
        imagenComprobante: soporteBase64,
      };

      console.log('📤 Enviando transferencia...');
      const response = await api.post('/transferencias/subir', dataToSend);
      console.log('✅ Transferencia subida:', response.data);

      Alert.alert(
        'Éxito',
        'Transferencia subida correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                responsable: user?.nombre || '',
                fechaTransferencia: new Date(),
                codigoIdentificador: '',
                nombreUsuario: '',
                numeroDocumento: '',
                valor: '',
                zonaSector: 'TOLA',
                barrio: '',
                bancoCuenta: '',
                soporte: null,
              });
              setSoporteBase64(null);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error al subir transferencia:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al subir la transferencia');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>📤 Subir Transferencia</Text>

        <Text style={styles.label}>Responsable *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.responsable}
          editable={false}
        />

        <Text style={styles.label}>Fecha de Transferencia *</Text>
        <TouchableOpacity
          style={styles.fechaButton}
          onPress={() => setMostrarCalendario(true)}
        >
          <Text style={styles.fechaButtonText}>
            {fechaSeleccionada.toLocaleDateString('es-ES')}
          </Text>
        </TouchableOpacity>

        {mostrarCalendario && (
          <DateTimePicker
            value={fechaSeleccionada}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setMostrarCalendario(false);
              if (selectedDate) {
                setFechaSeleccionada(selectedDate);
                setFormData(prev => ({ ...prev, fechaTransferencia: selectedDate }));
              }
            }}
          />
        )}

        <Text style={styles.label}>Código/Identificador *</Text>
        <TextInput
          style={styles.input}
          value={formData.codigoIdentificador}
          onChangeText={handleCodigoChange}
          placeholder="Ingresa el código del cliente"
        />

        <Text style={styles.label}>Nombre del Usuario *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={formData.nombreUsuario}
          editable={false}
          placeholder="Se autocompleta con el código"
        />

        <Text style={styles.label}>Número de Documento *</Text>
        <TextInput
          style={styles.input}
          value={formData.numeroDocumento}
          onChangeText={(text) => setFormData(prev => ({ ...prev, numeroDocumento: text.replace(/[^0-9]/g, '') }))}
          placeholder="Solo números"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Valor (USD) *</Text>
        <TextInput
          style={styles.input}
          value={formData.valor}
          onChangeText={(text) => setFormData(prev => ({ ...prev, valor: text.replace(/[^0-9.]/g, '') }))}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Zona/Sector *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.zonaSector}
            onValueChange={(itemValue) =>
              setFormData(prev => ({ ...prev, zonaSector: itemValue }))
            }
            style={styles.picker}
          >
            {zonasSector.map((zona) => (
              <Picker.Item key={zona} label={zona} value={zona} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Barrio *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.barrio}
            onValueChange={(itemValue) =>
              setFormData(prev => ({ ...prev, barrio: itemValue }))
            }
            style={styles.picker}
            enabled={formData.zonaSector !== 'SAN JOSE DE CHILIBULO'}
          >
            {(barriosPorZona[formData.zonaSector] || []).map((barrio) => (
              <Picker.Item key={barrio} label={barrio} value={barrio} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Banco y Cuenta *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.bancoCuenta}
            onValueChange={(itemValue) =>
              setFormData(prev => ({ ...prev, bancoCuenta: itemValue }))
            }
            style={styles.picker}
          >
            {bancosCuentas.map((banco) => (
              <Picker.Item key={banco} label={banco} value={banco} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Soporte de Transferencia *</Text>
        <View style={styles.soporteContainer}>
          <TouchableOpacity style={styles.soporteButton} onPress={tomarSoporte}>
            <Text style={styles.soporteButtonText}>📷 Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.soporteButton} onPress={seleccionarSoporte}>
            <Text style={styles.soporteButtonText}>🖼️ Galería</Text>
          </TouchableOpacity>
        </View>

        {formData.soporte && (
          <View style={styles.soportePreviewContainer}>
            <Image source={{ uri: formData.soporte }} style={styles.soportePreview} />
            <TouchableOpacity
              style={styles.eliminarSoporteButton}
              onPress={() => {
                setFormData(prev => ({ ...prev, soporte: null }));
                setSoporteBase64(null);
              }}
            >
              <Text style={styles.eliminarSoporteText}>✕ Eliminar</Text>
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
            <Text style={styles.submitButtonText}>📤 Subir Transferencia</Text>
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
  fechaButton: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  fechaButtonText: {
    fontSize: 16,
    color: '#2D3436',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  soporteContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  soporteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
  },
  soporteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  soportePreviewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  soportePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  eliminarSoporteButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  eliminarSoporteText: {
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

export default SubirTransferencia;  // 👈 ESTA LÍNEA ES CRUCIAL