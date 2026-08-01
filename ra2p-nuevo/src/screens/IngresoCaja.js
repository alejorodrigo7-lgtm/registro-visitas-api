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

const IngresoCaja = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [zona, setZona] = useState('TOLA');
  const [fecha, setFecha] = useState(new Date());
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saldoInicialEdit, setSaldoInicialEdit] = useState('');
  const [cobroOficina, setCobroOficina] = useState('');
  const [cobroCoordinador, setCobroCoordinador] = useState('');
  const [egresos, setEgresos] = useState([]);
  const [egresoDescripcion, setEgresoDescripcion] = useState('');
  const [egresoValor, setEgresoValor] = useState('');
  const [egresoImagen, setEgresoImagen] = useState(null);
  const [egresoImagenBase64, setEgresoImagenBase64] = useState(null);
  const [saldoFinal, setSaldoFinal] = useState(0);

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];

  // Cargar saldo disponible de la zona
  const cargarSaldoDisponible = async () => {
    setCargandoSaldo(true);
    try {
      const response = await api.get(`/cajas/saldo-disponible?zona=${zona}`);
      if (response.data.success && response.data.data) {
        const saldo = response.data.data.saldoFinal || 0;
        setSaldoInicial(saldo.toFixed(2));
        setSaldoInicialEdit(saldo.toFixed(2));
      } else {
        setSaldoInicial('0.00');
        setSaldoInicialEdit('0.00');
      }
    } catch (error) {
      console.error('Error al cargar saldo:', error);
      setSaldoInicial('0.00');
      setSaldoInicialEdit('0.00');
    } finally {
      setCargandoSaldo(false);
    }
  };

  useEffect(() => {
    cargarSaldoDisponible();
  }, [zona]);

  // Calcular saldo final
  useEffect(() => {
    const inicial = parseFloat(saldoInicialEdit) || 0;
    const oficina = parseFloat(cobroOficina) || 0;
    const coordinador = parseFloat(cobroCoordinador) || 0;
    const totalEgresos = egresos.reduce((sum, e) => sum + (e.valor || 0), 0);
    setSaldoFinal(inicial + oficina + coordinador - totalEgresos);
  }, [saldoInicialEdit, cobroOficina, cobroCoordinador, egresos]);

  // Agregar egreso
  const agregarEgreso = () => {
    if (!egresoDescripcion.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria');
      return;
    }
    const valor = parseFloat(egresoValor);
    if (isNaN(valor) || valor <= 0) {
      Alert.alert('Error', 'El valor debe ser mayor a 0');
      return;
    }
    if (!egresoImagenBase64) {
      Alert.alert('Error', 'Debes subir una imagen del egreso');
      return;
    }

    setEgresos([...egresos, {
      descripcion: egresoDescripcion.trim(),
      valor,
      imagen: egresoImagenBase64,
    }]);
    setEgresoDescripcion('');
    setEgresoValor('');
    setEgresoImagen(null);
    setEgresoImagenBase64(null);
  };

  const eliminarEgreso = (index) => {
    setEgresos(egresos.filter((_, i) => i !== index));
  };

  // Tomar foto para egreso
  const tomarFotoEgreso = async () => {
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
        setEgresoImagen(asset.uri);
        setEgresoImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarFotoEgreso = async () => {
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
        setEgresoImagen(asset.uri);
        setEgresoImagenBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Guardar caja
  const handleSubmit = async () => {
    const inicial = parseFloat(saldoInicialEdit);
    if (isNaN(inicial) || inicial < 0) {
      Alert.alert('Error', 'El saldo inicial debe ser un número válido');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        zona,
        fecha: fecha.toISOString(),
        saldoInicial: inicial,
        cobroOficina: parseFloat(cobroOficina) || 0,
        cobroCoordinador: parseFloat(cobroCoordinador) || 0,
        egresos: egresos.map(e => ({
          descripcion: e.descripcion,
          valor: e.valor,
          imagen: e.imagen,
        })),
      };

      await api.post('/cajas/ingresar', dataToSend);

      Alert.alert(
        'Éxito',
        'Caja ingresada correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setEgresos([]);
              setCobroOficina('');
              setCobroCoordinador('');
              setSaldoInicialEdit('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al ingresar la caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>📥 Ingreso de Caja</Text>

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

        {/* Fecha (no editable) */}
        <Text style={styles.label}>Fecha *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={fecha.toLocaleDateString('es-ES')}
          editable={false}
        />

        {/* Saldo Inicial */}
        <Text style={styles.label}>Saldo Inicial *</Text>
        {cargandoSaldo ? (
          <ActivityIndicator size="small" color="#6C5CE7" />
        ) : (
          <TextInput
            style={styles.input}
            value={saldoInicialEdit}
            onChangeText={setSaldoInicialEdit}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        )}

        {/* Cobro Oficina */}
        <Text style={styles.label}>Cobro Oficina</Text>
        <TextInput
          style={styles.input}
          value={cobroOficina}
          onChangeText={setCobroOficina}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {/* Cobro Coordinador */}
        <Text style={styles.label}>Cobro Coordinador</Text>
        <TextInput
          style={styles.input}
          value={cobroCoordinador}
          onChangeText={setCobroCoordinador}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {/* Egresos */}
        <Text style={styles.sectionTitle}>💰 Egresos</Text>

        <View style={styles.egresoContainer}>
          <TextInput
            style={[styles.input, styles.egresoInput]}
            value={egresoDescripcion}
            onChangeText={setEgresoDescripcion}
            placeholder="Descripción"
          />
          <TextInput
            style={[styles.input, styles.egresoInputValor]}
            value={egresoValor}
            onChangeText={setEgresoValor}
            placeholder="Valor"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.egresoFotoContainer}>
          <TouchableOpacity style={styles.fotoButton} onPress={tomarFotoEgreso}>
            <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fotoButton} onPress={seleccionarFotoEgreso}>
            <Text style={styles.fotoButtonText}>🖼️ Galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.agregarEgresoButton} onPress={agregarEgreso}>
            <Text style={styles.agregarEgresoText}>➕</Text>
          </TouchableOpacity>
        </View>

        {egresoImagen && (
          <Image source={{ uri: egresoImagen }} style={styles.fotoPreview} />
        )}

        {egresos.map((egreso, index) => (
          <View key={index} style={styles.egresoItem}>
            <Text style={styles.egresoItemText}>
              {egreso.descripcion} - ${egreso.valor.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => eliminarEgreso(index)}>
              <Text style={styles.eliminarEgresoText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Saldo Final */}
        <Text style={styles.label}>Saldo Final</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={saldoFinal.toFixed(2)}
          editable={false}
        />

        {/* Botón Subir */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>📤 Subir Caja</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 10,
    marginBottom: 15,
  },
  egresoContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  egresoInput: {
    flex: 2,
    marginBottom: 10,
  },
  egresoInputValor: {
    flex: 1,
    marginBottom: 10,
  },
  egresoFotoContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  fotoButton: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
  },
  fotoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  agregarEgresoButton: {
    backgroundColor: '#00B894',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  agregarEgresoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  fotoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  egresoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  egresoItemText: {
    fontSize: 14,
    color: '#2D3436',
  },
  eliminarEgresoText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default IngresoCaja;