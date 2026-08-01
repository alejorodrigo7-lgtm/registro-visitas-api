import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

const SubirDeposito = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [jefes, setJefes] = useState([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState('');
  // ✅ Nombre del usuario por defecto
  const [nombreDepositante, setNombreDepositante] = useState(user?.nombre || '');
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [banco, setBanco] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);
  const [jefesSeleccionados, setJefesSeleccionados] = useState([]);
  
  // ✅ Estado para "OTROS"
  const [mostrarOtro, setMostrarOtro] = useState(false);
  const [otroNumero, setOtroNumero] = useState('');
  const [otroNombre, setOtroNombre] = useState('');
  const [otroBanco, setOtroBanco] = useState('');

  const cuentas = [
    { numero: '4738408100', nombre: 'MARY CORDOBA', banco: 'BANCO PICHINCHA' },
    { numero: '27212641', nombre: 'ISABELA CORDOBA', banco: 'BANCO GUAYAQUIL' },
    { numero: '27230428', nombre: 'ISABELA CORDOBA', banco: 'BANCO GUAYAQUIL' },
  ];

  useEffect(() => {
    cargarJefes();
    // ✅ Actualizar nombre si cambia el usuario
    if (user?.nombre) {
      setNombreDepositante(user.nombre);
    }
    
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    
    return () => unsubscribe();
  }, [user]);

  const cargarJefes = async () => {
    try {
      const response = await api.get('/auth/usuarios');
      const jefesFiltrados = response.data.data.filter(u => 
        u.rol === 'Admin' || u.rol === 'Jefe'
      );
      setJefes(jefesFiltrados);
    } catch (error) {
      console.error('❌ Error cargando jefes:', error);
    }
  };

  const toggleJefe = (jefeId) => {
    setJefesSeleccionados(prev => 
      prev.includes(jefeId)
        ? prev.filter(id => id !== jefeId)
        : [...prev, jefeId]
    );
  };

  const seleccionarCuenta = (cuenta) => {
    if (cuenta === 'OTRO') {
      setMostrarOtro(true);
      setCuentaSeleccionada('');
      setNombreCuenta('');
      setBanco('');
      return;
    }
    
    setMostrarOtro(false);
    setCuentaSeleccionada(cuenta.numero);
    setNombreCuenta(cuenta.nombre);
    setBanco(cuenta.banco);
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
        setImagen(asset.uri);
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
        setImagen(asset.uri);
        setImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleSubmit = async () => {
    // ✅ Validar nombre del depositante
    if (!nombreDepositante.trim()) {
      Alert.alert('Error', 'El nombre del depositante es obligatorio');
      return;
    }

    if (!valor || parseFloat(valor) <= 0) {
      Alert.alert('Error', 'El valor debe ser mayor a 0');
      return;
    }

    // Validar cuenta seleccionada o "OTRO"
    if (mostrarOtro) {
      if (!otroNumero.trim() || !otroNombre.trim() || !otroBanco.trim()) {
        Alert.alert('Error', 'Debes completar todos los campos de la cuenta');
        return;
      }
    } else if (!cuentaSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar una cuenta');
      return;
    }

    if (!imagenBase64) {
      Alert.alert('Error', 'Debes subir una imagen del comprobante');
      return;
    }

    if (jefesSeleccionados.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un jefe');
      return;
    }

    setLoading(true);
    try {
      // ✅ Si es "OTRO", usar los datos personalizados
      const cuentaFinal = mostrarOtro ? otroNumero : cuentaSeleccionada;
      const nombreFinal = mostrarOtro ? otroNombre : nombreCuenta;
      const bancoFinal = mostrarOtro ? otroBanco : banco;

      const dataToSend = {
        fecha: new Date(fecha).toISOString(),
        valor: parseFloat(valor),
        nombreDepositante: nombreDepositante.trim(),
        cuenta: cuentaFinal,
        nombreCuenta: nombreFinal,
        banco: bancoFinal,
        esCuentaPersonalizada: mostrarOtro,
        cuentaPersonalizada: mostrarOtro ? {
          numero: otroNumero,
          nombre: otroNombre,
          banco: otroBanco
        } : null,
        jefesSeleccionados: jefesSeleccionados,
        observaciones: observaciones.trim(),
        imagenComprobante: imagenBase64,
      };

      console.log('📤 Enviando depósito:', dataToSend);

      await api.post('/depositos', dataToSend);

      Alert.alert(
        '✅ Éxito',
        'Depósito subido correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setValor('');
              setObservaciones('');
              setImagen(null);
              setImagenBase64(null);
              setJefesSeleccionados([]);
              setMostrarOtro(false);
              setOtroNumero('');
              setOtroNombre('');
              setOtroBanco('');
              setCuentaSeleccionada('');
              // ✅ No resetear el nombre del depositante
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error al subir depósito:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al subir el depósito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>💰 Subir Depósito</Text>
          <Text style={styles.subtitle}>Registrar un nuevo depósito</Text>
        </View>

        <View style={styles.form}>
          {/* Fecha */}
          <Text style={styles.label}>📅 Fecha *</Text>
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="YYYY-MM-DD"
          />

          {/* Valor */}
          <Text style={styles.label}>💰 Valor (USD) *</Text>
          <TextInput
            style={styles.input}
            value={valor}
            onChangeText={setValor}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          {/* ✅ Nombre del depositante (precargado con el usuario logueado) */}
          <Text style={styles.label}>👤 Persona que deposita *</Text>
          <TextInput
            style={styles.input}
            value={nombreDepositante}
            onChangeText={setNombreDepositante}
            placeholder="Nombre de la persona que deposita"
          />

          {/* Cuenta */}
          <Text style={styles.label}>🏦 Cuenta *</Text>
          <View style={styles.cuentasContainer}>
            {cuentas.map((cuenta) => (
              <TouchableOpacity
                key={cuenta.numero}
                style={[
                  styles.cuentaButton,
                  cuentaSeleccionada === cuenta.numero && styles.cuentaButtonSelected,
                ]}
                onPress={() => seleccionarCuenta(cuenta)}
              >
                <Text style={styles.cuentaNumero}>{cuenta.numero}</Text>
                <Text style={styles.cuentaNombre}>{cuenta.nombre}</Text>
                <Text style={styles.cuentaBanco}>{cuenta.banco}</Text>
              </TouchableOpacity>
            ))}
            {/* ✅ Botón OTROS */}
            <TouchableOpacity
              style={[
                styles.cuentaButton,
                styles.cuentaOtroButton,
                mostrarOtro && styles.cuentaButtonSelected,
              ]}
              onPress={() => seleccionarCuenta('OTRO')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#6C5CE7" />
              <Text style={styles.cuentaOtroText}>OTRA CUENTA</Text>
            </TouchableOpacity>
          </View>

          {/* ✅ Submenú para "OTRO" - Se despliega cuando se selecciona */}
          {mostrarOtro && (
            <View style={styles.otroContainer}>
              <Text style={styles.label}>Número de Cuenta *</Text>
              <TextInput
                style={styles.input}
                value={otroNumero}
                onChangeText={setOtroNumero}
                placeholder="Ingresa el número de cuenta"
              />
              <Text style={styles.label}>Nombre del Titular *</Text>
              <TextInput
                style={styles.input}
                value={otroNombre}
                onChangeText={setOtroNombre}
                placeholder="Ingresa el nombre del titular"
              />
              <Text style={styles.label}>Banco *</Text>
              <TextInput
                style={styles.input}
                value={otroBanco}
                onChangeText={setOtroBanco}
                placeholder="Ingresa el nombre del banco"
              />
            </View>
          )}

          {/* Usuario que sube (por defecto) */}
          <Text style={styles.label}>👤 Usuario que sube</Text>
          <View style={styles.usuarioContainer}>
            <Text style={styles.usuarioNombre}>{user?.nombre || 'Usuario'}</Text>
            <Text style={styles.usuarioRol}>{user?.rol || ''}</Text>
          </View>

          {/* Selección de Jefes */}
          <Text style={styles.label}>👔 Jefes a notificar *</Text>
          <View style={styles.jefesContainer}>
            {jefes.map((jefe) => (
              <TouchableOpacity
                key={jefe._id}
                style={[
                  styles.jefeButton,
                  jefesSeleccionados.includes(jefe._id) && styles.jefeButtonSelected,
                ]}
                onPress={() => toggleJefe(jefe._id)}
              >
                <Text style={[
                  styles.jefeButtonText,
                  jefesSeleccionados.includes(jefe._id) && styles.jefeButtonTextSelected,
                ]}>
                  {jefe.nombre}
                </Text>
                {jefesSeleccionados.includes(jefe._id) && (
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Observaciones */}
          <Text style={styles.label}>📝 Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Observaciones adicionales..."
            multiline
            numberOfLines={3}
          />

          {/* Imagen */}
          <Text style={styles.label}>📸 Comprobante *</Text>
          <View style={styles.fotoContainer}>
            <TouchableOpacity style={styles.fotoButton} onPress={tomarFoto}>
              <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fotoButton} onPress={seleccionarFoto}>
              <Text style={styles.fotoButtonText}>🖼️ Galería</Text>
            </TouchableOpacity>
          </View>

          {imagen && (
            <View style={styles.fotoPreviewContainer}>
              <Image source={{ uri: imagen }} style={styles.fotoPreview} />
              <TouchableOpacity
                style={styles.eliminarFotoButton}
                onPress={() => {
                  setImagen(null);
                  setImagenBase64(null);
                }}
              >
                <Text style={styles.eliminarFotoText}>✕ Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Estado de conexión */}
          {!isConnected && (
            <View style={styles.offlineContainer}>
              <Text style={styles.offlineText}>⚠️ Sin conexión - Los datos se guardarán localmente</Text>
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
              <Text style={styles.submitButtonText}>💰 Subir Depósito</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
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
  form: {
    padding: 20,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  cuentasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  cuentaButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
  },
  cuentaButtonSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#F0E6FF',
  },
  cuentaNumero: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  cuentaNombre: {
    fontSize: 12,
    color: '#636E72',
  },
  cuentaBanco: {
    fontSize: 11,
    color: '#B2BEC3',
  },
  cuentaOtroButton: {
    borderStyle: 'dashed',
    borderColor: '#6C5CE7',
    minWidth: '30%',
  },
  cuentaOtroText: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
    marginTop: 2,
  },
  otroContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  usuarioContainer: {
    backgroundColor: '#F0F0F0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  usuarioRol: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  jefesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  jefeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    gap: 6,
  },
  jefeButtonSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  jefeButtonText: {
    fontSize: 14,
    color: '#2D3436',
  },
  jefeButtonTextSelected: {
    color: '#FFFFFF',
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
  offlineContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },
  offlineText: {
    color: '#FF6B6B',
    fontSize: 14,
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

export default SubirDeposito;