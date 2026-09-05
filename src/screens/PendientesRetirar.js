import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PendientesRetirar = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoVisita, setEditandoVisita] = useState(null);
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mac, setMac] = useState('');
  const [receptor, setReceptor] = useState('');
  const [adicionales, setAdicionales] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [foto, setFoto] = useState(null);
  const [cargando, setCargando] = useState(false);

  // ✅ Obtener ID correctamente
  const userId = user?.id || user?._id;
  const isCoordinador = user?.rol?.toLowerCase() === 'coordinador';

  const cargarPendientes = async () => {
    setLoading(true);
    try {
      // ✅ CORREGIDO: Usar 'no_retirado' en lugar de 'en_progreso'
      const res = await api.get('/recuperacion/ordenes/estado/no_retirado');
      
      if (res.data.success) {
        let data = res.data.data || [];
        console.log(`📋 Órdenes no retiradas: ${data.length}`);

        // ✅ CORREGIDO: Filtrar por Coordinador usando userId
        if (isCoordinador) {
          const userIdStr = String(userId);
          data = data.filter(o => {
            const coordId = o.coordinadorAsignado?._id || o.coordinadorAsignado;
            return String(coordId) === userIdStr;
          });
          console.log(`📋 Filtradas para Coordinador: ${data.length}`);
        }

        setOrdenes(data);
        setFilteredOrdenes(data);
      }
    } catch (error) {
      console.error('Error cargando pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  // Filtrar por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrdenes(ordenes);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = ordenes.filter(o =>
        o.cliente?.nombre?.toLowerCase().includes(term) ||
        o.cliente?.codigo?.toLowerCase().includes(term) ||
        o.mac?.toLowerCase().includes(term)
      );
      setFilteredOrdenes(filtered);
    }
  }, [searchTerm, ordenes]);

  const openModal = (orden) => {
    setSelectedOrden(orden);
    const ultimaVisita = orden.visitas?.[orden.visitas.length - 1];
    if (ultimaVisita) {
      setEditandoVisita(ultimaVisita._id);
      setFecha(new Date(ultimaVisita.fecha));
      const [hours, minutes] = ultimaVisita.hora.split(':').map(Number);
      const h = new Date();
      h.setHours(hours, minutes);
      setHora(h);
      setMac(ultimaVisita.mac || '');
      setReceptor(ultimaVisita.receptor || '');
      setAdicionales(ultimaVisita.adicionales || '');
      setObservaciones(ultimaVisita.observaciones || '');
      setFoto(ultimaVisita.foto || null);
    }
    setModalVisible(true);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setFoto(base64);
    }
  };

  const handleSubmit = async (retirado) => {
    if (!selectedOrden) return;
    if (!observaciones.trim()) {
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return;
    }
    if (!foto) {
      Alert.alert('Error', 'La foto es obligatoria');
      return;
    }

    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

    setCargando(true);
    try {
      let res;
      if (editandoVisita) {
        res = await api.put(`/recuperacion/orden/${selectedOrden._id}/visita/${editandoVisita}`, {
          fecha: fechaStr,
          hora: horaStr,
          mac: mac.trim(),
          receptor: receptor.trim(),
          adicionales: adicionales.trim(),
          observaciones: observaciones.trim(),
          foto: foto,
          retirado: retirado
        });
      } else {
        // Si no hay visita, crear una nueva
        res = await api.put(`/recuperacion/orden/${selectedOrden._id}/visita`, {
          fecha: fechaStr,
          hora: horaStr,
          mac: mac.trim(),
          receptor: receptor.trim(),
          adicionales: adicionales.trim(),
          observaciones: observaciones.trim(),
          foto: foto,
          retirado: retirado
        });
      }

      if (res.data.success) {
        const mensaje = retirado ? 'retirada' : 'actualizada';
        Alert.alert('✅ Éxito', `Orden ${mensaje} correctamente`);
        setModalVisible(false);
        setSelectedOrden(null);
        cargarPendientes();
        // ✅ Si fue retirada, ir a RevisarOrdenes
        if (retirado) {
          navigation.navigate('RevisarOrdenes');
        }
      } else {
        Alert.alert('Error', res.data.message || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error actualizando:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar');
    } finally {
      setCargando(false);
    }
  };

  const renderItem = ({ item }) => {
    const ultimaVisita = item.visitas?.[item.visitas.length - 1];
    const fechaVisita = ultimaVisita ? new Date(ultimaVisita.fechaVisita).toLocaleDateString() : 'N/A';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#E74C3C20' }]}>
            <Text style={[styles.statusText, { color: '#E74C3C' }]}>
              ⏳ No Retirado
            </Text>
          </View>
        </View>
        <Text style={styles.cardInfo}>📶 MAC: {item.mac || 'N/A'}</Text>
        <Text style={styles.cardInfo}>🔄 Visitas: {item.numeroVisitas || 0}</Text>
        <Text style={styles.cardInfo}>📅 Última visita: {fechaVisita}</Text>
        <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
        {item.observacionesSubida && (
          <Text style={styles.cardObservaciones} numberOfLines={2}>
            📝 {item.observacionesSubida}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⏳ Pendientes por Retirar</Text>
        <TouchableOpacity onPress={cargarPendientes}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente, código o MAC..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          📋 {filteredOrdenes.length} órdenes pendientes por retirar
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : filteredOrdenes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay órdenes pendientes por retirar</Text>
          <Text style={styles.emptySubtext}>
            Todas las órdenes han sido retiradas o aún no se han visitado
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrdenes}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Modal para editar visita */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Editar Visita</Text>
            {selectedOrden && (
              <View style={styles.ordenResumen}>
                <Text style={styles.ordenResumenText}>Cliente: {selectedOrden.cliente?.nombre || 'N/A'}</Text>
                <Text style={styles.ordenResumenText}>Visitas: {selectedOrden.numeroVisitas || 0}</Text>
                <Text style={styles.ordenResumenText}>Estado: ⏳ No Retirado</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>📅 Fecha</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.datePickerText}>{fecha.toLocaleDateString()}</Text>
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

            <Text style={styles.modalLabel}>🕒 Hora</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.datePickerText}>
                {`${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={hora}
                mode="time"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowTimePicker(false);
                  if (selectedDate) setHora(selectedDate);
                }}
              />
            )}

            <Text style={styles.modalLabel}>📶 MAC (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="MAC" value={mac} onChangeText={setMac} />

            <Text style={styles.modalLabel}>📡 RECEPTOR (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="Receptor" value={receptor} onChangeText={setReceptor} />

            <Text style={styles.modalLabel}>📝 Adicionales (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="Adicionales" value={adicionales} onChangeText={setAdicionales} />

            <Text style={styles.modalLabel}>📝 Observaciones (obligatorio)</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Observaciones"
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>📸 Foto (obligatorio)</Text>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name={foto ? 'checkmark-circle' : 'camera'} size={24} color={foto ? '#00B894' : '#6C5CE7'} />
              <Text style={styles.photoButtonText}>{foto ? '✅ Foto actualizada' : 'Tomar foto'}</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.noRetiradoButton]} onPress={() => handleSubmit(false)} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>🚫 No Retirado</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.retiradoButton]} onPress={() => handleSubmit(true)} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>✅ Retirado</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    height: 40,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#2D3436' },
  infoContainer: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#636E72' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#B2BEC3', marginTop: 4, textAlign: 'center' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', flex: 1 },
  cardCodigo: { fontSize: 13, color: '#636E72' },
  cardInfo: { fontSize: 14, color: '#555', marginVertical: 2 },
  cardObservaciones: { fontSize: 13, color: '#666', marginTop: 6, fontStyle: 'italic' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  ordenResumen: { backgroundColor: '#F0F4FF', padding: 12, borderRadius: 10, marginBottom: 12 },
  ordenResumenText: { fontSize: 14, color: '#2D3436' },
  modalLabel: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#DFE6E9' },
  textArea: { height: 80, textAlignVertical: 'top' },
  datePickerButton: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DFE6E9' },
  datePickerText: { fontSize: 16, color: '#2D3436' },
  photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#6C5CE7', borderStyle: 'dashed' },
  photoButtonText: { fontSize: 16, color: '#6C5CE7', marginLeft: 8 },
  modalButtons: { flexDirection: 'row', marginTop: 16, gap: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  retiradoButton: { backgroundColor: '#00B894' },
  noRetiradoButton: { backgroundColor: '#FDCB6E' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeModalButton: { marginTop: 12, alignItems: 'center' },
  closeModalText: { color: '#6C5CE7', fontSize: 16, fontWeight: '600' },
});

export default PendientesRetirar;