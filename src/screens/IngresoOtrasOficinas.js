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
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MESES = [
  { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' },
  { num: 3, nombre: 'Marzo' },
  { num: 4, nombre: 'Abril' },
  { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' },
  { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' },
  { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' },
];

const IngresoOtrasOficinas = ({ navigation }) => {
  const { token } = useAuth();
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [mes, setMes] = useState(mesActual);
  const [modalVisible, setModalVisible] = useState(false);
  const [valor, setValor] = useState('');
  const [nombreOficina, setNombreOficina] = useState('');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const nombreMes = MESES.find(m => m.num === mes)?.nombre || '';

  const guardar = async () => {
    if (!nombreOficina || nombreOficina.trim() === '') {
      Alert.alert('Error', 'Ingresa el nombre de la oficina');
      return;
    }
    if (!valor || isNaN(Number(valor)) || Number(valor) < 0) {
      Alert.alert('Error', 'Ingresa un valor valido mayor o igual a 0');
      return;
    }

    setGuardando(true);
    try {
      const resp = await api.post('/ingresos-oficinas', {
        tipo: 'otra',
        mes: mes,
        valor: Number(valor),
        nombreOficina: nombreOficina.trim(),
        observacion: observacion.trim(),
      });

      if (resp.data.success) {
        Alert.alert('OK', 'Ingreso registrado para ' + nombreMes);
        setValor('');
        setNombreOficina('');
        setObservacion('');
      } else {
        Alert.alert('Error', resp.data.message || 'No se pudo guardar');
      }
    } catch (err) {
      console.error('Error guardando ingreso Otra:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error de conexion');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Mes</Text>
          <TouchableOpacity style={styles.inputFecha} onPress={() => setModalVisible(true)}>
            <Text style={styles.inputFechaText}>{nombreMes} {anioActual}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 20 }]}>Nombre de la Oficina</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Oficina Centro"
            placeholderTextColor="#999"
            value={nombreOficina}
            onChangeText={setNombreOficina}
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Valor (USD)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#999"
            value={valor}
            onChangeText={setValor}
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Observacion</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Observacion opcional"
            placeholderTextColor="#999"
            value={observacion}
            onChangeText={setObservacion}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.boton, guardando && styles.botonDisabled]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonText}>GUARDAR INGRESO</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar mes</Text>
            <FlatList
              data={MESES}
              keyExtractor={(item) => String(item.num)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.num === mes && styles.modalItemActive]}
                  onPress={() => { setMes(item.num); setModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, item.num === mes && styles.modalItemTextActive]}>
                    {item.nombre} {anioActual}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
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
    backgroundColor: '#0984E3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 30,
  },
  botonDisabled: { backgroundColor: '#B2BEC3' },
  botonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', textAlign: 'center', marginBottom: 15 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 24 },
  modalItemActive: { backgroundColor: '#E8F4FD' },
  modalItemText: { fontSize: 16, color: '#2D3436' },
  modalItemTextActive: { color: '#0984E3', fontWeight: '700' },
  modalCancelar: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
  },
  modalCancelarText: { fontSize: 15, color: '#636E72', fontWeight: '600' },
});

export default IngresoOtrasOficinas;