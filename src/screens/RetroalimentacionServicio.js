import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RetroalimentacionServicio = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [observacion, setObservacion] = useState('');

  const cargarServicios = async () => {
    try {
      const response = await api.get('/servicios/estado/EJECUTADO');
      setServicios(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarServicios();
  };

  const retroalimentarServicio = async () => {
    if (!observacion) {
      Alert.alert('Error', 'La observación es obligatoria');
      return;
    }

    Alert.alert(
      'Confirmar Retroalimentación',
      '¿Estás seguro de retroalimentar este servicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retroalimentar',
          onPress: async () => {
            try {
              await api.put(`/servicios/${servicioSeleccionado._id}/retroalimentar`, {
                observaciones: observacion,
              });
              Alert.alert('Éxito', 'Servicio retroalimentado correctamente');
              setModalVisible(false);
              setObservacion('');
              cargarServicios();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al retroalimentar');
            }
          },
        },
      ]
    );
  };

  const renderServicio = (item) => {
    return (
      <View key={item._id} style={styles.servicioCard}>
        <View style={styles.servicioHeader}>
          <Text style={styles.servicioCliente}>{item.cliente}</Text>
          <View style={[styles.estadoBadge, styles.estadoEjecutado]}>
            <Text style={styles.estadoBadgeText}>✅ Ejecutado</Text>
          </View>
        </View>

        <Text style={styles.servicioInfo}>📋 {item.nombreServicio}</Text>
        <Text style={styles.servicioInfo}>📅 {new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
        <Text style={styles.servicioInfo}>🔧 Técnico: {item.tecnicoAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.servicioInfo}>👔 Jefe: {item.jefeAsignado?.nombre || 'N/A'}</Text>

        <TouchableOpacity
          style={styles.retroalimentarButton}
          onPress={() => {
            setServicioSeleccionado(item);
            setObservacion('');
            setModalVisible(true);
          }}
        >
          <Text style={styles.retroalimentarButtonText}>📝 Retroalimentar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Retroalimentación de Servicios</Text>
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {servicios.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay servicios para retroalimentar</Text>
          </View>
        ) : (
          servicios.map(renderServicio)
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Modal de Retroalimentación */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Retroalimentar Servicio</Text>

            <Text style={styles.modalLabel}>Observaciones *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={observacion}
              onChangeText={setObservacion}
              placeholder="Observaciones de la retroalimentación..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.modalResponsable}>👤 Responsable: {user?.nombre || ''}</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={retroalimentarServicio}
              >
                <Text style={styles.modalButtonText}>📝 Retroalimentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#6C5CE7', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#636E72' },
  listaContainer: { flex: 1, padding: 15 },
  servicioCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 12 },
  servicioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  servicioCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  estadoEjecutado: { backgroundColor: '#00B894' },
  estadoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  servicioInfo: { fontSize: 14, color: '#636E72', marginVertical: 2 },
  retroalimentarButton: { backgroundColor: '#6C5CE7', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  retroalimentarButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  footerSpacer: { height: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', textAlign: 'center', marginBottom: 15 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#636E72', marginTop: 10, marginBottom: 5 },
  modalInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, fontSize: 14, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 10 },
  modalTextArea: { height: 100, textAlignVertical: 'top' },
  modalResponsable: { fontSize: 14, color: '#6C5CE7', marginTop: 10, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 15 },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#DFE6E9' },
  modalButtonSave: { backgroundColor: '#6C5CE7' },
  modalButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});

export default RetroalimentacionServicio;