import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  FlatList, Alert, ActivityIndicator, TextInput, Modal, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';  // ✅ IMPORTACIÓN AGREGADA
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EjecutarOrden = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
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
  const [coordinadorFiltro, setCoordinadorFiltro] = useState('');
  const [coordinadores, setCoordinadores] = useState([]);

  const isCoordinador = user?.rol === 'Coordinador';
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  // Cargar coordinadores para el filtro
  useEffect(() => {
    const fetchCoordinadores = async () => {
      try {
        const res = await api.get('/recuperacion/coordinadores');
        if (res.data.success) {
          setCoordinadores(res.data.data);
        }
      } catch (error) {
        console.error('Error cargando coordinadores:', error);
      }
    };
    if (isAdminOrJefe) {
      fetchCoordinadores();
    }
  }, []);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      let url = '/recuperacion/ordenes/estado/asignada';
      const res = await api.get(url);
      
      if (res.data.success) {
        let data = res.data.data;
        if (isCoordinador) {
          data = data.filter(o => o.coordinadorAsignado?._id === user._id);
        }
        if (isAdminOrJefe && coordinadorFiltro) {
          data = data.filter(o => o.coordinadorAsignado?._id === coordinadorFiltro);
        }
        setOrdenes(data);
        setFilteredOrdenes(data);
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOrdenes();
  }, [coordinadorFiltro]);

  // Filtrar por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrdenes(ordenes);
    } else {
      const filtered = ordenes.filter(o =>
        o.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrdenes(filtered);
    }
  }, [searchTerm, ordenes]);

  const openModal = (orden) => {
    setSelectedOrden(orden);
    setFecha(new Date());
    setHora(new Date());
    setMac('');
    setReceptor('');
    setAdicionales('');
    setObservaciones('');
    setFoto(null);
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
      Alert.alert('Error', 'La foto de visita es obligatoria');
      return;
    }

    const fechaStr = fecha.toISOString().split('T')[0];
    const horaStr = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

    setCargando(true);
    try {
      const payload = {
        fecha: fechaStr,
        hora: horaStr,
        mac: mac.trim(),
        receptor: receptor.trim(),
        adicionales: adicionales.trim(),
        observaciones: observaciones.trim(),
        foto: foto,
        retirado: retirado
      };

      const res = await api.put(`/recuperacion/orden/${selectedOrden._id}/visita`, payload);
      if (res.data.success) {
        Alert.alert('✅ Éxito', `Orden ${retirado ? 'retirada' : 'no retirada'} correctamente`);
        setModalVisible(false);
        setSelectedOrden(null);
        cargarOrdenes();
      } else {
        Alert.alert('Error', res.data.message || 'Error al ejecutar la orden');
      }
    } catch (error) {
      console.error('Error ejecutando orden:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al ejecutar la orden');
    } finally {
      setCargando(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCliente}>{item.cliente.nombre}</Text>
        <Text style={styles.cardCodigo}>Código: {item.cliente.codigo}</Text>
      </View>
      <Text style={styles.cardInfo}>📶 MAC: {item.mac}</Text>
      <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
      <Text style={styles.cardInfo}>📅 Subida: {new Date(item.fechaSubida).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Ejecutar Orden</Text>
        <TouchableOpacity onPress={cargarOrdenes}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente..."
            placeholderTextColor="#999"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        {isAdminOrJefe && (
          <View style={styles.filterPickerContainer}>
            <Picker
              selectedValue={coordinadorFiltro}
              onValueChange={(itemValue) => setCoordinadorFiltro(itemValue)}
              style={styles.filterPicker}
            >
              <Picker.Item label="Todos los coordinadores" value="" />
              {coordinadores.map((c) => (
                <Picker.Item key={c._id} label={c.nombre} value={c._id} />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando órdenes...</Text>
        </View>
      ) : filteredOrdenes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay órdenes asignadas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrdenes}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Modal de ejecución */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Ejecutar Orden</Text>
            
            {selectedOrden && (
              <View style={styles.ordenResumen}>
                <Text style={styles.ordenResumenText}>Cliente: {selectedOrden.cliente.nombre}</Text>
                <Text style={styles.ordenResumenText}>Código: {selectedOrden.cliente.codigo}</Text>
                <Text style={styles.ordenResumenText}>MAC: {selectedOrden.mac}</Text>
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
            <TextInput style={styles.modalInput} placeholder="MAC del equipo" value={mac} onChangeText={setMac} />

            <Text style={styles.modalLabel}>📡 RECEPTOR (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="Receptor" value={receptor} onChangeText={setReceptor} />

            <Text style={styles.modalLabel}>📝 Adicionales (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="Información adicional" value={adicionales} onChangeText={setAdicionales} />

            <Text style={styles.modalLabel}>📝 Observaciones (obligatorio)</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Observaciones de la visita"
              value={observaciones}
              onChangeText={setObservaciones}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>📸 Foto de visita (obligatorio)</Text>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name={foto ? 'checkmark-circle' : 'camera'} size={24} color={foto ? '#00B894' : '#6C5CE7'} />
              <Text style={styles.photoButtonText}>{foto ? '✅ Foto tomada' : 'Tomar foto'}</Text>
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
  filterContainer: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8ECF1' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 8, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterPickerContainer: { marginTop: 8, backgroundColor: '#F5F7FA', borderRadius: 8, overflow: 'hidden' },
  filterPicker: { height: 40, width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#636E72' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, textAlign: 'center' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  cardCodigo: { fontSize: 13, color: '#636E72' },
  cardInfo: { fontSize: 14, color: '#555', marginVertical: 2 },
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

export default EjecutarOrden;