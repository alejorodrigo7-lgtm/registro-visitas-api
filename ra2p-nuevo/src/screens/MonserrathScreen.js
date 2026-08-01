import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import NetInfo from '@react-native-community/netinfo';
import {
  initDatabase,
  guardarMonserrathOffline,
  contarPendientes,
} from '../services/database';

const MonserrathScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [pendientes, setPendientes] = useState(0);

  // 📋 Formulario
  const [formData, setFormData] = useState({
    cliente: '',
    identificador: '',
    barrio: '',
    direccion: '',
    telefono: '',
    hora_llegada: '',
    hora_salida: '',
    material_usado: '',
    observaciones: '',
  });

  // 📍 Ubicación
  const [ubicacion, setUbicacion] = useState({
    latitude: null,
    longitude: null,
    address: null,
    loadingLocation: false,
    error: null,
  });

  // 📅 Fecha
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ⏰ Horas
  const [showHoraLlegadaPicker, setShowHoraLlegadaPicker] = useState(false);
  const [showHoraSalidaPicker, setShowHoraSalidaPicker] = useState(false);
  const [horaLlegadaTemp, setHoraLlegadaTemp] = useState(new Date());
  const [horaSalidaTemp, setHoraSalidaTemp] = useState(new Date());

  // 📸 Foto
  const [foto, setFoto] = useState(null);
  const [fotoBase64, setFotoBase64] = useState(null);

  // ============================================
  // 📡 INICIALIZAR
  // ============================================
  useEffect(() => {
    const inicializar = async () => {
      await initDatabase();
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected);
      const total = await contarPendientes();
      setPendientes(total.total || 0);
    };
    inicializar();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // 📍 OBTENER UBICACIÓN
  // ============================================
  const obtenerUbicacion = async () => {
    setUbicacion(prev => ({ ...prev, loadingLocation: true, error: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUbicacion(prev => ({
          ...prev,
          loadingLocation: false,
          error: 'Permiso de ubicación denegado',
        }));
        Alert.alert('Permiso denegado', 'Necesitas permitir el acceso a la ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      let address = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = `${addr.street || ''} ${addr.name || ''}, ${addr.district || ''}, ${addr.city || ''}`.trim();
        }
      } catch (geoError) {
        console.log('⚠️ Error geocodificando:', geoError);
      }

      setUbicacion({ latitude, longitude, address, loadingLocation: false, error: null });

      Alert.alert('📍 Ubicación registrada',
        address ? `Dirección: ${address}` : `Lat: ${latitude.toFixed(6)}\nLng: ${longitude.toFixed(6)}`
      );

    } catch (error) {
      setUbicacion(prev => ({
        ...prev,
        loadingLocation: false,
        error: error.message || 'Error al obtener ubicación',
      }));
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  // ============================================
  // 📸 TOMAR FOTO
  // ============================================
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
        setFoto(asset.uri);
        setFotoBase64(asset.base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  // ============================================
  // ✅ VALIDAR Y GUARDAR
  // ============================================
  const validarCampos = () => {
    if (!formData.cliente.trim()) {
      Alert.alert('Error', 'El nombre del cliente es obligatorio');
      return false;
    }
    if (!formData.identificador.trim()) {
      Alert.alert('Error', 'El identificador es obligatorio');
      return false;
    }
    if (!formData.barrio.trim()) {
      Alert.alert('Error', 'El barrio es obligatorio');
      return false;
    }
    if (!formData.direccion.trim()) {
      Alert.alert('Error', 'La dirección es obligatoria');
      return false;
    }
    if (!formData.telefono.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    if (!formData.hora_llegada) {
      Alert.alert('Error', 'La hora de llegada es obligatoria');
      return false;
    }
    if (!formData.hora_salida) {
      Alert.alert('Error', 'La hora de salida es obligatoria');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      cliente: '',
      identificador: '',
      barrio: '',
      direccion: '',
      telefono: '',
      hora_llegada: '',
      hora_salida: '',
      material_usado: '',
      observaciones: '',
    });
    setFoto(null);
    setFotoBase64(null);
    setUbicacion({ latitude: null, longitude: null, address: null, loadingLocation: false, error: null });
    setFecha(new Date());
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!validarCampos()) return;

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        fecha: fecha.toISOString(),
        ubicacion: ubicacion.latitude && ubicacion.longitude ? {
          latitude: ubicacion.latitude,
          longitude: ubicacion.longitude,
          address: ubicacion.address,
        } : null,
        foto: fotoBase64,
        tecnico: user?.id || user?._id,
        tecnicoNombre: user?.nombre || 'Usuario',
      };

      // 📌 SI NO HAY INTERNET, GUARDAR OFFLINE
      if (!isConnected) {
        await guardarMonserrathOffline(dataToSend);
        const total = await contarPendientes();
        setPendientes(total.total || 0);
        Alert.alert(
          '📱 Sin conexión',
          `El registro ha sido guardado localmente.\nPendientes: ${total.total || 0} por sincronizar`,
          [{ text: 'OK', onPress: resetForm }]
        );
        setLoading(false);
        return;
      }

      // SI HAY INTERNET, ENVIAR NORMALMENTE
      const response = await api.post('/monserrath', dataToSend);
      Alert.alert('✅ Éxito', 'Registro guardado correctamente', [{ text: 'OK', onPress: resetForm }]);

    } catch (error) {
      // Guardar offline como respaldo
      try {
        const dataToSend = {
          ...formData,
          fecha: fecha.toISOString(),
          ubicacion: ubicacion.latitude && ubicacion.longitude ? {
            latitude: ubicacion.latitude,
            longitude: ubicacion.longitude,
            address: ubicacion.address,
          } : null,
          foto: fotoBase64,
          tecnico: user?.id || user?._id,
          tecnicoNombre: user?.nombre || 'Usuario',
        };
        await guardarMonserrathOffline(dataToSend);
        const total = await contarPendientes();
        setPendientes(total.total || 0);
        Alert.alert(
          '⚠️ Error de conexión',
          `El registro ha sido guardado localmente.\nPendientes: ${total.total || 0} por sincronizar`,
          [{ text: 'OK', onPress: resetForm }]
        );
      } catch (offlineError) {
        Alert.alert('Error', 'No se pudo guardar el registro');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Monserrath</Text>
        <Text style={styles.subtitle}>Registro de visitas y servicios</Text>
        <View style={styles.connectionStatus}>
          <Text style={[styles.connectionText, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? '🟢 Conectado' : '🔴 Sin conexión'}
          </Text>
          {pendientes > 0 && (
            <Text style={styles.pendientesText}>📤 {pendientes} pendiente{pendientes > 1 ? 's' : ''}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.formContainer}>
        {/* 📅 FECHA */}
        <Text style={styles.label}>📅 Fecha</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{fecha.toLocaleDateString('es-ES')}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={fecha}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setFecha(selectedDate);
            }}
          />
        )}

        {/* 📍 UBICACIÓN */}
        <Text style={styles.label}>📍 Ubicación</Text>
        <TouchableOpacity style={styles.ubicacionButton} onPress={obtenerUbicacion} disabled={ubicacion.loadingLocation}>
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
            <Text style={styles.ubicacionCoords}>Lat: {ubicacion.latitude.toFixed(6)} • Lng: {ubicacion.longitude.toFixed(6)}</Text>
            {ubicacion.address && <Text style={styles.ubicacionAddress} numberOfLines={2}>📌 {ubicacion.address}</Text>}
          </View>
        )}

        {/* 📝 DATOS CLIENTE */}
        <Text style={styles.label}>👤 Cliente *</Text>
        <TextInput style={styles.input} value={formData.cliente} onChangeText={(text) => setFormData({ ...formData, cliente: text })} placeholder="Nombre del cliente" />

        <Text style={styles.label}>🆔 Identificador *</Text>
        <TextInput style={styles.input} value={formData.identificador} onChangeText={(text) => setFormData({ ...formData, identificador: text })} placeholder="Cédula / RUC" />

        <Text style={styles.label}>🏘️ Barrio *</Text>
        <TextInput style={styles.input} value={formData.barrio} onChangeText={(text) => setFormData({ ...formData, barrio: text })} placeholder="Barrio" />

        <Text style={styles.label}>📍 Dirección *</Text>
        <TextInput style={styles.input} value={formData.direccion} onChangeText={(text) => setFormData({ ...formData, direccion: text })} placeholder="Dirección completa" />

        <Text style={styles.label}>📞 Teléfono *</Text>
        <TextInput style={styles.input} value={formData.telefono} onChangeText={(text) => setFormData({ ...formData, telefono: text })} placeholder="Número de teléfono" keyboardType="phone-pad" />

        {/* ⏰ HORAS */}
        <View style={styles.row}>
          <View style={styles.horaContainer}>
            <Text style={styles.label}>🕐 Hora Llegada *</Text>
            <TouchableOpacity style={styles.horaInput} onPress={() => setShowHoraLlegadaPicker(true)}>
              <Text style={styles.horaText}>{formData.hora_llegada || 'Seleccionar hora'}</Text>
            </TouchableOpacity>
            {showHoraLlegadaPicker && (
              <DateTimePicker
                value={horaLlegadaTemp}
                mode="time"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowHoraLlegadaPicker(false);
                  if (selectedDate) {
                    setHoraLlegadaTemp(selectedDate);
                    const horas = selectedDate.getHours().toString().padStart(2, '0');
                    const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
                    setFormData({ ...formData, hora_llegada: `${horas}:${minutos}` });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.horaContainer}>
            <Text style={styles.label}>🕐 Hora Salida *</Text>
            <TouchableOpacity style={styles.horaInput} onPress={() => setShowHoraSalidaPicker(true)}>
              <Text style={styles.horaText}>{formData.hora_salida || 'Seleccionar hora'}</Text>
            </TouchableOpacity>
            {showHoraSalidaPicker && (
              <DateTimePicker
                value={horaSalidaTemp}
                mode="time"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowHoraSalidaPicker(false);
                  if (selectedDate) {
                    setHoraSalidaTemp(selectedDate);
                    const horas = selectedDate.getHours().toString().padStart(2, '0');
                    const minutos = selectedDate.getMinutes().toString().padStart(2, '0');
                    setFormData({ ...formData, hora_salida: `${horas}:${minutos}` });
                  }
                }}
              />
            )}
          </View>
        </View>

        {/* 🔧 MATERIAL USADO */}
        <Text style={styles.label}>🔧 Material Usado</Text>
        <TextInput style={[styles.input, styles.textArea]} value={formData.material_usado} onChangeText={(text) => setFormData({ ...formData, material_usado: text })} placeholder="Materiales utilizados..." multiline numberOfLines={2} />

        {/* 📝 OBSERVACIONES */}
        <Text style={styles.label}>📝 Observaciones</Text>
        <TextInput style={[styles.input, styles.textArea]} value={formData.observaciones} onChangeText={(text) => setFormData({ ...formData, observaciones: text })} placeholder="Observaciones adicionales..." multiline numberOfLines={3} />

        {/* 📸 FOTO */}
        <Text style={styles.label}>📸 Foto</Text>
        <TouchableOpacity style={styles.fotoButton} onPress={tomarFoto}>
          <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
        </TouchableOpacity>
        {foto && (
          <View style={styles.fotoPreviewContainer}>
            <Image source={{ uri: foto }} style={styles.fotoPreview} />
            <TouchableOpacity style={styles.eliminarFotoButton} onPress={() => { setFoto(null); setFotoBase64(null); }}>
              <Text style={styles.eliminarFotoText}>✕ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTÓN GUARDAR */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>💾 Guardar Registro</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#6C5CE7', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 5 },
  connectionStatus: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  connectionText: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  connected: { color: '#FFFFFF', backgroundColor: 'rgba(0,184,148,0.5)' },
  disconnected: { color: '#FFFFFF', backgroundColor: 'rgba(255,107,107,0.5)' },
  pendientesText: { fontSize: 12, color: '#FFFFFF', backgroundColor: 'rgba(255,107,107,0.7)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  formContainer: { padding: 20 },
  label: { fontSize: 16, color: '#2D3436', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  dateInput: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 15 },
  dateText: { fontSize: 16, color: '#2D3436' },
  row: { flexDirection: 'row', gap: 10 },
  horaContainer: { flex: 1 },
  horaInput: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 15 },
  horaText: { fontSize: 16, color: '#2D3436' },
  ubicacionButton: { backgroundColor: '#0984E3', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  ubicacionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  ubicacionInfo: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#DFE6E9' },
  ubicacionCoords: { fontSize: 13, color: '#2D3436', fontWeight: '500' },
  ubicacionAddress: { fontSize: 13, color: '#636E72', marginTop: 4 },
  fotoButton: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  fotoButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  fotoPreviewContainer: { alignItems: 'center', marginBottom: 15 },
  fotoPreview: { width: '100%', height: 200, borderRadius: 10, resizeMode: 'cover' },
  eliminarFotoButton: { marginTop: 8, padding: 8, backgroundColor: '#FF6B6B', borderRadius: 8 },
  eliminarFotoText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  submitButton: { backgroundColor: '#00B894', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});

export default MonserrathScreen;