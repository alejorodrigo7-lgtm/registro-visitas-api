import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const IngresoOficinaTola = ({ navigation }) => {
  const { token } = useAuth();
  const [fecha, setFecha] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);

  const formatFecha = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  };

  const formatFechaVisible = (d) => {
    return d.toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const onChangeFecha = (event, selectedDate) => {
    setMostrarPicker(Platform.OS === 'ios');
    if (selectedDate) setFecha(selectedDate);
  };

  const guardar = async () => {
    if (!valor || isNaN(Number(valor)) || Number(valor) < 0) {
      Alert.alert('Error', 'Ingresa un valor valido mayor o igual a 0');
      return;
    }

    setGuardando(true);
    try {
      const resp = await api.post('/ingresos-oficinas', {
        tipo: 'tola',
        fecha: formatFecha(fecha),
        valor: Number(valor),
      });

      if (resp.data.success) {
        Alert.alert('OK', 'Ingreso Oficina Tola registrado correctamente');
        setValor('');
        setFecha(new Date());
      } else {
        Alert.alert('Error', resp.data.message || 'No se pudo guardar');
      }
    } catch (err) {
      console.error('Error guardando ingreso Tola:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error de conexion');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Fecha</Text>
          <TouchableOpacity style={styles.inputFecha} onPress={() => setMostrarPicker(true)}>
            <Text style={styles.inputFechaText}>{formatFechaVisible(fecha)}</Text>
          </TouchableOpacity>
          {mostrarPicker && (
            <DateTimePicker
              value={fecha}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeFecha}
            />
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Valor (USD)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#999"
            value={valor}
            onChangeText={setValor}
          />

          <TouchableOpacity
            style={[styles.boton, guardando && styles.botonDisabled]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonText}>GUARDAR INGRESO TOLA</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#2D3436', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3436',
    backgroundColor: '#FFF',
  },
  inputFecha: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFF',
  },
  inputFechaText: { fontSize: 16, color: '#2D3436' },
  boton: {
    backgroundColor: '#00B894',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  botonDisabled: { backgroundColor: '#B2BEC3' },
  botonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

export default IngresoOficinaTola;