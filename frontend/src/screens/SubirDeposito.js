import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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

const SubirDeposito = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [zona, setZona] = useState('TOLA');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nombre, setNombre] = useState('');
  const [cuenta, setCuenta] = useState('4738408100 MARY CORDOBA');
  const [observaciones, setObservaciones] = useState('');
  const [imagen, setImagen] = useState(null);
  const [imagenBase64, setImagenBase64] = useState(null);

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];

  const cuentas = [
    '4738408100 MARY CORDOBA',
    '27230428 ISABELA CORDOBA',
    '27212641 ISABELA CORDOBA',
    'OTROS',
  ];

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
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!imagenBase64) {
      Alert.alert('Error', 'Debes subir una imagen del comprobante');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        zona,
        fecha,
        nombre: nombre.trim(),
        cuenta,
        observaciones: observaciones.trim(),
        imagen: imagenBase64,
      };

      await api.post('/cajas/depositos/subir', dataToSend);

      Alert.alert(
        'Éxito',
        'Depósito subido correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setNombre('');
              setObservaciones('');
              setImagen(null);
              setImagenBase64(null);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al subir el depósito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>📤 Subir Depósito</Text>
          <Text style={styles.subtitle}>Registrar un nuevo depósito</Text>
        </View>

        <View style={styles.form}>
          {/* Zona */}
          <Text style={styles.label}>Zona *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={zona}
              onValueChange={setZona}
              style={styles.picker}
            >
              {zonas.map((z) => (
                <Picker.Item key={z} label={z} value={z} />
              ))}
            </Picker>
          </View>

          {/* Fecha */}
          <Text style={styles.label}>Fecha *</Text>
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="YYYY-MM-DD"
          />

          {/* Nombre */}
          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre de la persona que deposita"
          />

          {/* Cuenta */}
          <Text style={styles.label}>Cuenta *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={cuenta}
              onValueChange={setCuenta}
              style={styles.picker}
            >
              {cuentas.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>
          </View>

          {/* Observaciones */}
          <Text style={styles.label}>Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Observaciones adicionales..."
            multiline
            numberOfLines={3}
          />

          {/* Imagen */}
          <Text style={styles.label}>Imagen del Comprobante *</Text>
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

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>📤 Subir Depósito</Text>
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
    backgroundColor: '#FDCB6E',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 14,
    color: '#2D3436',
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

export default SubirDeposito;