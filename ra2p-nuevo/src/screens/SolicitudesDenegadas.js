import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SolicitudesDenegadas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);

  // Cargar solicitudes DENEGADAS (todas)
  const cargarSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/solicitudes-recibo?estado=DENEGADO&limit=1000');
      
      if (response.data.success) {
        const data = response.data.data || [];
        setSolicitudes(data);
        setFilteredSolicitudes(data);
        console.log(`📋 ${data.length} solicitudes denegadas`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  // Buscar en el backend (todas las denegadas)
  const buscarEnBackend = async () => {
    if (!searchTerm.trim()) {
      setFilteredSolicitudes(solicitudes);
      setBusquedaActiva(false);
      return;
    }
    
    setBusquedaActiva(true);
    setLoading(true);
    try {
      const response = await api.get(`/solicitudes-recibo?estado=DENEGADO&busqueda=${encodeURIComponent(searchTerm.trim())}`);
      
      if (response.data.success) {
        const data = response.data.data || [];
        setFilteredSolicitudes(data);
        console.log(`🔍 Encontradas: ${data.length} solicitudes`);
      }
    } catch (error) {
      console.error('Error buscando:', error);
      Alert.alert('Error', 'No se pudo buscar');
    } finally {
      setLoading(false);
    }
  };

  const limpiarBusqueda = () => {
    setSearchTerm('');
    setFilteredSolicitudes(solicitudes);
    setBusquedaActiva(false);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const renderSolicitud = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedSolicitud(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle}>{item.cliente.nombre}</Text>
          <Text style={styles.cardCodigo}>Codigo: {item.cliente.codigo}</Text>
        </View>
        <View style={styles.badgeDenegada}>
          <Text style={styles.badgeText}>DENEGADA</Text>
        </View>
      </View>

      <View style={styles.motivoContainer}>
        <Text style={styles.motivoLabel}>Motivo:</Text>
        <Text style={styles.motivoText} numberOfLines={2}>
          {item.motivoDenegacion || 'No especificado'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>
          Denegado por: {item.denegadoPor?.nombre || 'N/A'}
        </Text>
        <Text style={styles.cardFooterText}>
          {formatFecha(item.denegadoPor?.fecha || item.fechaActualizacion)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes Denegadas</Text>
        <TouchableOpacity onPress={cargarSolicitudes}>
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o codigo..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={buscarEnBackend}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={limpiarBusqueda}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchButton} onPress={buscarEnBackend}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {busquedaActiva && (
        <View style={styles.infoBusqueda}>
          <Text style={styles.infoBusquedaText}>
            Mostrando {filteredSolicitudes.length} resultados de la busqueda
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44336" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSolicitudes}
          renderItem={renderSolicitud}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {busquedaActiva ? 'Sin resultados' : 'No hay solicitudes denegadas'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {selectedSolicitud && (
              <ScrollView>
                <Text style={styles.modalLabel}>Cliente:</Text>
                <Text style={styles.modalValue}>{selectedSolicitud.cliente.nombre}</Text>

                <Text style={styles.modalLabel}>Codigo:</Text>
                <Text style={styles.modalValue}>{selectedSolicitud.cliente.codigo}</Text>

                {selectedSolicitud.cliente.direccion && (
                  <>
                    <Text style={styles.modalLabel}>Direccion:</Text>
                    <Text style={styles.modalValue}>{selectedSolicitud.cliente.direccion}</Text>
                  </>
                )}

                <Text style={styles.modalLabel}>Motivo de denegacion:</Text>
                <View style={styles.motivoBox}>
                  <Text style={styles.motivoBoxText}>
                    {selectedSolicitud.motivoDenegacion || 'No especificado'}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Denegado por:</Text>
                <Text style={styles.modalValue}>
                  {selectedSolicitud.denegadoPor?.nombre || 'N/A'}
                </Text>

                <Text style={styles.modalLabel}>Fecha de denegacion:</Text>
                <Text style={styles.modalValue}>
                  {formatFecha(selectedSolicitud.denegadoPor?.fecha || selectedSolicitud.fechaActualizacion)}
                </Text>

                <Text style={styles.modalLabel}>Solicitado por:</Text>
                <Text style={styles.modalValue}>
                  {selectedSolicitud.solicitadoPor?.nombre || 'N/A'}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
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
    backgroundColor: '#F44336',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 45,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2C3E50', paddingVertical: 8 },
  searchButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  searchButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  infoBusqueda: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  infoBusquedaText: { fontSize: 12, color: '#C62828', fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  cardCodigo: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  badgeDenegada: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#C62828' },
  motivoContainer: {
    backgroundColor: '#FFF3F3',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
    marginBottom: 10,
  },
  motivoLabel: { fontSize: 11, fontWeight: '600', color: '#666', marginBottom: 2 },
  motivoText: { fontSize: 13, color: '#333' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cardFooterText: { fontSize: 12, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
    marginBottom: 4,
  },
  modalValue: { fontSize: 15, color: '#2C3E50' },
  motivoBox: {
    backgroundColor: '#FFF3F3',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  motivoBoxText: { fontSize: 14, color: '#333' },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: { color: '#2D3436', fontSize: 14, fontWeight: '500' },
});

export default SolicitudesDenegadas;
