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

const RevisarOrdenes = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ Obtener ID correctamente
  const userId = user?.id || user?._id;
  const isCoordinador = user?.rol?.toLowerCase() === 'coordinador';
  const esAdminOJefe = ['Admin', 'Jefe'].includes(user?.rol);

  const cargarRevisar = async () => {
    setLoading(true);
    try {
      // ✅ Cargar TODOS los estados incluyendo anulado y reconectado
      const [asignadasRes, noRetiradoRes, retiradoRes, anuladoRes, reconectadoRes] = await Promise.all([
        api.get('/recuperacion/ordenes/estado/asignada'),
        api.get('/recuperacion/ordenes/estado/no_retirado'),
        api.get('/recuperacion/ordenes/estado/retirado'),
        api.get('/recuperacion/ordenes/estado/anulado'),
        api.get('/recuperacion/ordenes/estado/reconectado')
      ]);
      
      let data = [];
      if (asignadasRes.data.success) data = data.concat(asignadasRes.data.data);
      if (noRetiradoRes.data.success) data = data.concat(noRetiradoRes.data.data);
      if (retiradoRes.data.success) data = data.concat(retiradoRes.data.data);
      if (anuladoRes.data.success) data = data.concat(anuladoRes.data.data);
      if (reconectadoRes.data.success) data = data.concat(reconectadoRes.data.data);

      console.log(`📋 Total órdenes cargadas: ${data.length}`);

      // ✅ Filtrar por Coordinador usando userId
      if (isCoordinador) {
        const userIdStr = String(userId);
        data = data.filter(o => {
          const coordId = o.coordinadorAsignado?._id || o.coordinadorAsignado;
          return String(coordId) === userIdStr;
        });
        console.log(`📋 Órdenes filtradas para Coordinador: ${data.length}`);
      }

      setOrdenes(data);
      aplicarFiltros(data);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (data) => {
    let filtered = data || ordenes;

    // Filtrar por estado
    if (filtroEstado !== 'todas') {
      filtered = filtered.filter(o => o.estado === filtroEstado);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.cliente?.nombre?.toLowerCase().includes(term) ||
        o.cliente?.codigo?.toLowerCase().includes(term) ||
        o.mac?.toLowerCase().includes(term)
      );
    }

    setFilteredOrdenes(filtered);
  };

  useEffect(() => {
    cargarRevisar();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [searchTerm, filtroEstado]);

  const getEstadoTexto = (estado) => {
    const estados = {
      'asignada': '📋 Asignada',
      'no_retirado': '⏳ No Retirado',
      'retirado': '✅ Retirado',
      'anulado': '🚫 Anulado',
      'reconectado': '🔄 Reconectado'
    };
    return estados[estado] || estado;
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'asignada': '#F39C12',
      'no_retirado': '#E74C3C',
      'retirado': '#2ECC71',
      'anulado': '#E74C3C',
      'reconectado': '#3498DB'
    };
    return colores[estado] || '#95A5A6';
  };

  const verDetalle = (orden) => {
    setSelectedOrden(orden);
    setModalVisible(true);
  };

  const ejecutarOrden = (orden) => {
    if (orden.estado === 'asignada') {
      navigation.navigate('EjecutarOrden', { ordenId: orden._id, orden });
    } else {
      Alert.alert('Información', 'Esta orden ya fue ejecutada');
    }
  };

  // ✅ ANULAR ORDEN (solo Admin/Jefe)
  const handleAnular = (orden) => {
    Alert.alert(
      '🚫 Anular Orden',
      `¿Estás seguro de ANULAR la orden de ${orden.cliente?.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.put(`/recuperacion/orden/${orden._id}/anular`, {
                observaciones: 'Orden anulada por Administrador'
              });
              if (response.data.success) {
                Alert.alert('✅ Éxito', 'Orden anulada correctamente');
                cargarRevisar();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al anular');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ RECONECTAR EQUIPO (solo Admin/Jefe)
  const handleReconectar = (orden) => {
    Alert.alert(
      '🔄 Reconectar Equipo',
      `¿Estás seguro de RECONECTAR el equipo de ${orden.cliente?.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reconectar',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.put(`/recuperacion/orden/${orden._id}/reconectar`, {
                observaciones: 'Equipo reconectado por Administrador'
              });
              if (response.data.success) {
                Alert.alert('✅ Éxito', 'Equipo reconectado correctamente');
                cargarRevisar();
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al reconectar');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const estadoTexto = getEstadoTexto(item.estado);
    const estadoColor = getEstadoColor(item.estado);
    const puedeEjecutar = item.estado === 'asignada';
    const esAnuladoOReconectado = item.estado === 'anulado' || item.estado === 'reconectado';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: estadoColor + '20' }]}>
            <Text style={[styles.statusText, { color: estadoColor }]}>
              {estadoTexto}
            </Text>
          </View>
        </View>

        <Text style={styles.cardInfo}>📶 MAC: {item.mac || 'N/A'}</Text>
        <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.cardInfo}>🔄 Visitas: {item.numeroVisitas || 0}</Text>
        <Text style={styles.cardInfo}>📅 Subida: {new Date(item.fechaSubida || item.createdAt).toLocaleDateString()}</Text>

        {item.observacionesSubida && (
          <Text style={styles.cardObservaciones} numberOfLines={2}>
            📝 {item.observacionesSubida}
          </Text>
        )}

        <View style={styles.botonesContainer}>
          <TouchableOpacity
            style={[styles.btn, styles.btnDetalle]}
            onPress={() => verDetalle(item)}
          >
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.btnText}>Detalle</Text>
          </TouchableOpacity>

          {puedeEjecutar && (
            <TouchableOpacity
              style={[styles.btn, styles.btnEjecutar]}
              onPress={() => ejecutarOrden(item)}
            >
              <Ionicons name="play-circle" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>Ejecutar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ Botones Admin/Jefe */}
        {esAdminOJefe && !esAnuladoOReconectado && item.estado !== 'retirado' && (
          <View style={styles.botonesAdminContainer}>
            <TouchableOpacity
              style={[styles.btn, styles.btnAnular]}
              onPress={() => handleAnular(item)}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>Anular</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.btn, styles.btnReconectar]}
              onPress={() => handleReconectar(item)}
            >
              <Ionicons name="wifi" size={16} color="#FFFFFF" />
              <Text style={styles.btnText}>Reconectar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Revisar Órdenes</Text>
        <TouchableOpacity onPress={cargarRevisar}>
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

      {/* Filtros de estado */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filtrar por estado:</Text>
        <View style={styles.filterButtons}>
          {['todas', 'asignada', 'no_retirado', 'retirado', 'anulado', 'reconectado'].map((estado) => (
            <TouchableOpacity
              key={estado}
              style={[
                styles.filterButton,
                filtroEstado === estado && styles.filterButtonActive
              ]}
              onPress={() => setFiltroEstado(estado)}
            >
              <Text style={[
                styles.filterButtonText,
                filtroEstado === estado && styles.filterButtonTextActive
              ]}>
                {estado === 'todas' ? 'Todas' : 
                 estado === 'asignada' ? '📋 Asignadas' :
                 estado === 'no_retirado' ? '⏳ No Retiradas' :
                 estado === 'retirado' ? '✅ Retiradas' :
                 estado === 'anulado' ? '🚫 Anuladas' :
                 '🔄 Reconectadas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.totalText}>
          Total: {filteredOrdenes.length} órdenes
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
          <Text style={styles.emptyText}>
            {filtroEstado === 'todas' ? 'No hay órdenes registradas' :
             filtroEstado === 'asignada' ? 'No hay órdenes asignadas' :
             filtroEstado === 'no_retirado' ? 'No hay órdenes no retiradas' : 
             filtroEstado === 'retirado' ? 'No hay órdenes retiradas' :
             filtroEstado === 'anulado' ? 'No hay órdenes anuladas' :
             'No hay órdenes reconectadas'}
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
                  <View style={[styles.statusBadge, { backgroundColor: getEstadoColor(selectedOrden.estado) + '20' }]}>
                    <Text style={[styles.statusText, { color: getEstadoColor(selectedOrden.estado) }]}>
                      {getEstadoTexto(selectedOrden.estado)}
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
                  <Text style={styles.detalleLabel}>Fecha de creación</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(selectedOrden.fechaSubida || selectedOrden.createdAt).toLocaleString('es-EC')}
                  </Text>
                </View>

                {selectedOrden.observacionesSubida && (
                  <View style={styles.detalleField}>
                    <Text style={styles.detalleLabel}>Observaciones</Text>
                    <Text style={styles.detalleValue}>{selectedOrden.observacionesSubida}</Text>
                  </View>
                )}

                {selectedOrden.visitas?.length > 0 && (
                  <View style={styles.detalleField}>
                    <Text style={styles.detalleLabel}>Última visita</Text>
                    <Text style={styles.detalleValue}>
                      {new Date(selectedOrden.visitas[selectedOrden.visitas.length - 1].fechaVisita).toLocaleString('es-EC')}
                    </Text>
                  </View>
                )}

                {selectedOrden.estado === 'asignada' && (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnEjecutar, styles.btnFullWidth]}
                    onPress={() => {
                      setModalVisible(false);
                      ejecutarOrden(selectedOrden);
                    }}
                  >
                    <Ionicons name="play-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.btnFullText}>Ejecutar Orden</Text>
                  </TouchableOpacity>
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 6,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    marginRight: 4,
    marginBottom: 4,
  },
  filterButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#636E72',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  totalText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
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
  botonesContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  botonesAdminContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  btnDetalle: {
    backgroundColor: '#6C5CE7',
  },
  btnEjecutar: {
    backgroundColor: '#00B894',
  },
  btnAnular: {
    backgroundColor: '#E74C3C',
  },
  btnReconectar: {
    backgroundColor: '#3498DB',
  },
  btnFullWidth: {
    flex: 1,
    paddingVertical: 12,
  },
  btnFullText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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

export default RevisarOrdenes;