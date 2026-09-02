import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Retirados = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ Obtener ID correctamente
  const userId = user?.id || user?._id;
  const isCoordinador = user?.rol?.toLowerCase() === 'coordinador';

  const cargarRetirados = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recuperacion/ordenes/estado/retirado');
      
      if (res.data.success) {
        let data = res.data.data || [];
        console.log(`📋 Órdenes retiradas: ${data.length}`);

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
      console.error('Error cargando retirados:', error);
      Alert.alert('Error', 'No se pudieron cargar los retirados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRetirados();
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

  const verDetalle = (orden) => {
    setSelectedOrden(orden);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => {
    const ultimaVisita = item.visitas?.[item.visitas.length - 1];
    const fechaRetiro = ultimaVisita ? new Date(ultimaVisita.fechaVisita).toLocaleDateString('es-EC') : 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#2ECC7120' }]}>
            <Text style={[styles.statusText, { color: '#2ECC71' }]}>
              ✅ Retirado
            </Text>
          </View>
        </View>

        <Text style={styles.cardInfo}>📶 MAC: {item.mac || 'N/A'}</Text>
        <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.cardInfo}>🔄 Visitas: {item.numeroVisitas || 0}</Text>
        <Text style={styles.cardInfo}>📅 Fecha retiro: {fechaRetiro}</Text>
        <Text style={styles.cardInfo}>📅 Subida: {new Date(item.fechaSubida || item.createdAt).toLocaleDateString('es-EC')}</Text>

        {item.observacionesSubida && (
          <Text style={styles.cardObservaciones} numberOfLines={2}>
            📝 {item.observacionesSubida}
          </Text>
        )}

        <TouchableOpacity
          style={styles.btnDetalle}
          onPress={() => verDetalle(item)}
        >
          <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
          <Text style={styles.btnText}>Ver Detalle</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✅ Retirados</Text>
        <TouchableOpacity onPress={cargarRetirados}>
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
          ✅ {filteredOrdenes.length} equipos retirados
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : filteredOrdenes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="clipboard-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No hay equipos retirados</Text>
          <Text style={styles.emptySubtitle}>
            Los equipos retirados aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrdenes}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Detalle de Orden</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {selectedOrden && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Estado</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#2ECC7120' }]}>
                    <Text style={[styles.statusText, { color: '#2ECC71' }]}>
                      ✅ Retirado
                    </Text>
                  </View>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>MAC</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.mac || 'N/A'}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Cliente</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.cliente?.nombre || 'N/A'}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Código</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.cliente?.codigo || 'N/A'}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Teléfono</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.cliente?.telefono || 'N/A'}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Dirección</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.cliente?.direccion || 'N/A'}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Visitas realizadas</Text>
                  <Text style={styles.detalleValue}>{selectedOrden.numeroVisitas || 0}</Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Fecha de retiro</Text>
                  <Text style={styles.detalleValue}>
                    {selectedOrden.visitas?.length > 0 ?
                      new Date(selectedOrden.visitas[selectedOrden.visitas.length - 1].fechaVisita).toLocaleString('es-EC') :
                      'N/A'}
                  </Text>
                </View>

                <View style={styles.detalleField}>
                  <Text style={styles.detalleLabel}>Fecha de creación</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(selectedOrden.fechaSubida || selectedOrden.createdAt).toLocaleString('es-EC')}
                  </Text>
                </View>

                {selectedOrden.observacionesSubida && (
                  <View style={styles.detalleField}>
                    <Text style={styles.detalleLabel}>Observaciones de subida</Text>
                    <Text style={styles.detalleValue}>{selectedOrden.observacionesSubida}</Text>
                  </View>
                )}

                {selectedOrden.visitas?.length > 0 && (
                  <View style={styles.detalleField}>
                    <Text style={styles.detalleLabel}>Última observación de visita</Text>
                    <Text style={styles.detalleValue}>
                      {selectedOrden.visitas[selectedOrden.visitas.length - 1].observaciones || 'Sin observaciones'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
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
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1A7A5A',
    fontWeight: '500',
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#636E72' },
  emptyTitle: { fontSize: 16, color: '#999', marginTop: 12, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#B2BEC3', marginTop: 4, textAlign: 'center' },
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
  
  btnDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  detalleField: { marginBottom: 12 },
  detalleLabel: { fontSize: 12, fontWeight: '600', color: '#7F8C8D', marginBottom: 2 },
  detalleValue: { fontSize: 15, color: '#2C3E50' },
});

export default Retirados;