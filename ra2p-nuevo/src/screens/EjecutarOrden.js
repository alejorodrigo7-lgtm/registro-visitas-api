import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  FlatList, Alert, ActivityIndicator, TextInput, Modal, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

  // ✅ Obtener ID correctamente
  const userId = user?.id || user?._id;
  const rolUsuario = user?.rol?.toLowerCase() || '';
  const isCoordinador = rolUsuario === 'coordinador';
  const isAdminOrJefe = ['admin', 'jefe'].includes(rolUsuario);

  console.log('👤 ===== DATOS DEL USUARIO =====');
  console.log('👤 user.id:', user?.id);
  console.log('👤 user._id:', user?._id);
  console.log('👤 userId (final):', userId);
  console.log('👤 Rol:', user?.rol);
  console.log('👤 isAdminOrJefe:', isAdminOrJefe);

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
    console.log('🔄 ===== CARGANDO ÓRDENES =====');
    setLoading(true);
    try {
      let url = '/recuperacion/ordenes/estado/asignada';
      const res = await api.get(url);
      
      if (res.data.success) {
        let data = res.data.data || [];
        console.log('📋 Órdenes recibidas:', data.length);
        
        // ✅ Filtrar para Coordinador
        if (isCoordinador) {
          const userIdStr = String(userId);
          data = data.filter(o => {
            const coordId = o.coordinadorAsignado?._id || o.coordinadorAsignado;
            return String(coordId) === userIdStr;
          });
          console.log(`📋 Órdenes filtradas para Coordinador: ${data.length}`);
        }
        
        // Filtro para Admin/Jefe
        if (isAdminOrJefe && coordinadorFiltro) {
          data = data.filter(o => {
            const coordId = o.coordinadorAsignado?._id || o.coordinadorAsignado;
            return String(coordId) === String(coordinadorFiltro);
          });
          console.log(`📋 Órdenes filtradas por coordinador: ${data.length}`);
        }
        
        setOrdenes(data);
        setFilteredOrdenes(data);
      }
    } catch (error) {
      console.error('❌ Error cargando órdenes:', error);
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
        o.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.cliente?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
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

  // ✅ ANULAR ORDEN (solo Admin/Jefe)
  const handleAnular = async () => {
    if (!selectedOrden) return;
    if (!observaciones.trim()) {
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return;
    }

    Alert.alert(
      '🚫 Anular Orden',
      `¿Estás seguro de ANULAR la orden de ${selectedOrden.cliente?.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            setCargando(true);
            try {
              const payload = { observaciones: observaciones.trim() };
              const res = await api.put(`/recuperacion/orden/${selectedOrden._id}/anular`, payload);
              
              if (res.data.success) {
                Alert.alert('✅ Éxito', 'Orden ANULADA correctamente');
                setModalVisible(false);
                setSelectedOrden(null);
                cargarOrdenes();
                navigation.navigate('RevisarOrdenes');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al anular');
            } finally {
              setCargando(false);
            }
          }
        }
      ]
    );
  };

  // ✅ RECONECTAR EQUIPO (solo Admin/Jefe)
  const handleReconectar = async () => {
    if (!selectedOrden) return;
    if (!observaciones.trim()) {
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return;
    }

    Alert.alert(
      '🔄 Reconectar Equipo',
      `¿Estás seguro de RECONECTAR el equipo de ${selectedOrden.cliente?.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reconectar',
          style: 'default',
          onPress: async () => {
            setCargando(true);
            try {
              const payload = { observaciones: observaciones.trim() };
              const res = await api.put(`/recuperacion/orden/${selectedOrden._id}/reconectar`, payload);
              
              if (res.data.success) {
                Alert.alert('✅ Éxito', 'Equipo RECONECTADO correctamente');
                setModalVisible(false);
                setSelectedOrden(null);
                cargarOrdenes();
                navigation.navigate('RevisarOrdenes');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al reconectar');
            } finally {
              setCargando(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
        <Text style={styles.cardCodigo}>Código: {item.cliente?.codigo || 'N/A'}</Text>
      </View>
      <Text style={styles.cardInfo}>📶 MAC: {item.mac || 'N/A'}</Text>
      <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
      <Text style={styles.cardInfo}>📅 Subida: {item.fechaSubida ? new Date(item.fechaSubida).toLocaleDateString() : 'N/A'}</Text>
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
        
        <View style={styles.rolInfoContainer}>
          <Text style={styles.rolInfoText}>
            👤 Rol: {user?.rol || 'No definido'} | Órdenes: {filteredOrdenes.length}
          </Text>
        </View>
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
          {isCoordinador && (
            <Text style={styles.emptySubtext}>
              Espera a que te asignen órdenes de recuperación
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredOrdenes}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* ✅ Modal de ejecución - CORREGIDO CON BOTÓN CERRAR */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedOrden(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* ✅ Botón de cierre X en la esquina superior */}
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => {
                setModalVisible(false);
                setSelectedOrden(null);
              }}
            >
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContentContainer}
            >
              <Text style={styles.modalTitle}>📋 Ejecutar Orden</Text>
              
              {selectedOrden && (
                <View style={styles.ordenResumen}>
                  <Text style={styles.ordenResumenText}>Cliente: {selectedOrden.cliente?.nombre || 'N/A'}</Text>
                  <Text style={styles.ordenResumenText}>Código: {selectedOrden.cliente?.codigo || 'N/A'}</Text>
                  <Text style={styles.ordenResumenText}>MAC: {selectedOrden.mac || 'N/A'}</Text>
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

              {/* Botones principales */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.noRetiradoButton]} onPress={() => handleSubmit(false)} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>🚫 No Retirado</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.retiradoButton]} onPress={() => handleSubmit(true)} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>✅ Retirado</Text>}
                </TouchableOpacity>
              </View>

              {/* Botones Admin/Jefe */}
              {isAdminOrJefe && (
                <View style={styles.modalButtonsAdmin}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.anuladoButton]} 
                    onPress={handleAnular} 
                    disabled={cargando}
                  >
                    {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>🚫 Anular</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.reconectadoButton]} 
                    onPress={handleReconectar} 
                    disabled={cargando}
                  >
                    {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>🔄 Reconectar</Text>}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => {
                  setModalVisible(false);
                  setSelectedOrden(null);
                }}
              >
                <Text style={styles.closeModalText}>✖ Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
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
  rolInfoContainer: { marginTop: 8, alignItems: 'center' },
  rolInfoText: { fontSize: 12, color: '#636E72' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  cardCodigo: { fontSize: 13, color: '#636E72' },
  cardInfo: { fontSize: 14, color: '#555', marginVertical: 2 },
  
  // ✅ Nuevos estilos para el modal con botón de cierre
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    maxHeight: '90%',
    width: '95%',
  },
  modalContentContainer: {
    paddingBottom: 30,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 12 
  },
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
  modalButtonsAdmin: { flexDirection: 'row', marginTop: 8, gap: 10 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  retiradoButton: { backgroundColor: '#00B894' },
  noRetiradoButton: { backgroundColor: '#FDCB6E' },
  anuladoButton: { backgroundColor: '#E74C3C' },
  reconectadoButton: { backgroundColor: '#3498DB' },
  modalButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeModalButton: { marginTop: 12, alignItems: 'center' },
  closeModalText: { color: '#6C5CE7', fontSize: 16, fontWeight: '600' },
});

export default EjecutarOrden;