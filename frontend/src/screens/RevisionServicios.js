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

const RevisionServicios = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);

  const cargarServicios = async () => {
    try {
      const response = await api.get('/servicios');
      setServicios(response.data.data || []);
      setServiciosFiltrados(response.data.data || []);
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

  const buscarServicios = async () => {
    if (!searchTerm || searchTerm.trim() === '') {
      setServiciosFiltrados(servicios);
      return;
    }

    try {
      const response = await api.get(`/servicios/buscar?search=${searchTerm.trim()}`);
      setServiciosFiltrados(response.data.data || []);
    } catch (error) {
      Alert.alert('Error', 'Error al buscar servicios');
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'TOMADO': '#FDCB6E',
      'EJECUTADO': '#00B894',
      'PENDIENTE': '#E17055',
      'RETROALIMENTADO': '#0984E3',
    };
    return colors[estado] || '#636E72';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'TOMADO': '📋 Tomado',
      'EJECUTADO': '✅ Ejecutado',
      'PENDIENTE': '⏳ Pendiente',
      'RETROALIMENTADO': '📝 Retroalimentado',
    };
    return labels[estado] || estado;
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const renderServicio = (item) => {
    return (
      <TouchableOpacity
        key={item._id}
        style={styles.servicioCard}
        onPress={() => {
          setServicioSeleccionado(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.servicioHeader}>
          <Text style={styles.servicioCliente}>{item.cliente}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(item.estado)}</Text>
          </View>
        </View>

        <Text style={styles.servicioInfo}>📋 {item.nombreServicio}</Text>
        <Text style={styles.servicioInfo}>📅 {formatFecha(item.createdAt)}</Text>
        <Text style={styles.servicioInfo}>🔧 Técnico: {item.tecnicoAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.servicioInfo}>👔 Jefe: {item.jefeAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.servicioInfo}>👤 Responsable: {item.responsable || 'N/A'}</Text>
      </TouchableOpacity>
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
        <Text style={styles.title}>🔍 Revisión de Servicios</Text>
      </View>

      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Buscar por nombre o código..."
          onSubmitEditing={buscarServicios}
        />
        <TouchableOpacity style={styles.buscadorButton} onPress={buscarServicios}>
          <Text style={styles.buscadorButtonText}>🔍 Buscar</Text>
        </TouchableOpacity>
        {searchTerm.length > 0 && (
          <TouchableOpacity
            style={styles.limpiarButton}
            onPress={() => {
              setSearchTerm('');
              setServiciosFiltrados(servicios);
            }}
          >
            <Text style={styles.limpiarButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {serviciosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay servicios</Text>
            <Text style={styles.emptySubText}>
              {searchTerm ? 'No se encontraron servicios con ese criterio' : 'No hay servicios registrados'}
            </Text>
          </View>
        ) : (
          serviciosFiltrados.map(renderServicio)
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Modal de Detalle */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Detalle del Servicio</Text>

            {servicioSeleccionado && (
              <View>
                <Text style={styles.modalLabel}>Cliente:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.cliente}</Text>

                <Text style={styles.modalLabel}>Código:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.codigoIdentificador}</Text>

                <Text style={styles.modalLabel}>Barrio:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.barrio}</Text>

                <Text style={styles.modalLabel}>Dirección:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.direccion}</Text>

                <Text style={styles.modalLabel}>Teléfono:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.telefono}</Text>

                <Text style={styles.modalLabel}>Teléfonos adicionales:</Text>
                <Text style={styles.modalValue}>
                  {servicioSeleccionado.telefonos?.join(', ') || 'Ninguno'}
                </Text>

                <Text style={styles.modalLabel}>Servicio:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.nombreServicio}</Text>

                <Text style={styles.modalLabel}>Observaciones:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.observaciones}</Text>

                <Text style={styles.modalLabel}>Responsable:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.responsable}</Text>

                <Text style={styles.modalLabel}>Técnico asignado:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.tecnicoAsignado?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Jefe asignado:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.jefeAsignado?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(servicioSeleccionado.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{getEstadoLabel(servicioSeleccionado.estado)}</Text>
                </View>

                <Text style={styles.modalLabel}>Fecha creación:</Text>
                <Text style={styles.modalValue}>{formatFecha(servicioSeleccionado.createdAt)}</Text>

                {/* Ejecución */}
                {servicioSeleccionado.ejecucion && servicioSeleccionado.ejecucion.observaciones && (
                  <View>
                    <Text style={styles.modalLabel}>Ejecución:</Text>
                    <Text style={styles.modalValue}>Observaciones: {servicioSeleccionado.ejecucion.observaciones}</Text>
                    {servicioSeleccionado.ejecucion.materiales && servicioSeleccionado.ejecucion.materiales.length > 0 && (
                      <Text style={styles.modalValue}>
                        Materiales: {servicioSeleccionado.ejecucion.materiales.map(m => `${m.nombre} x${m.cantidad}`).join(', ')}
                      </Text>
                    )}
                    {servicioSeleccionado.ejecucion.macEquipo && (
                      <Text style={styles.modalValue}>MAC Equipo: {servicioSeleccionado.ejecucion.macEquipo}</Text>
                    )}
                    {servicioSeleccionado.ejecucion.macRepetidor && (
                      <Text style={styles.modalValue}>MAC Repetidor: {servicioSeleccionado.ejecucion.macRepetidor}</Text>
                    )}
                    {servicioSeleccionado.ejecucion.snReceptor && (
                      <Text style={styles.modalValue}>SN Receptor: {servicioSeleccionado.ejecucion.snReceptor}</Text>
                    )}
                    <Text style={styles.modalValue}>Responsable: {servicioSeleccionado.ejecucion.responsableEjecucion}</Text>
                    <Text style={styles.modalValue}>Fecha: {formatFecha(servicioSeleccionado.ejecucion.fechaEjecucion)}</Text>
                  </View>
                )}

                {/* Retroalimentación */}
                {servicioSeleccionado.retroalimentacion && servicioSeleccionado.retroalimentacion.observaciones && (
                  <View>
                    <Text style={styles.modalLabel}>Retroalimentación:</Text>
                    <Text style={styles.modalValue}>Observaciones: {servicioSeleccionado.retroalimentacion.observaciones}</Text>
                    <Text style={styles.modalValue}>Responsable: {servicioSeleccionado.retroalimentacion.responsable}</Text>
                    <Text style={styles.modalValue}>Fecha: {formatFecha(servicioSeleccionado.retroalimentacion.fecha)}</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
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
  buscadorContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  buscadorInput: { flex: 1, backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, fontSize: 16, marginRight: 10 },
  buscadorButton: { backgroundColor: '#6C5CE7', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
  buscadorButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  limpiarButton: { backgroundColor: '#FF6B6B', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 5, width: 44, height: 44 },
  limpiarButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  listaContainer: { flex: 1, padding: 15 },
  servicioCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 12 },
  servicioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  servicioCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  estadoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  servicioInfo: { fontSize: 14, color: '#636E72', marginVertical: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  emptySubText: { fontSize: 14, color: '#636E72', marginTop: 5 },
  footerSpacer: { height: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', textAlign: 'center', marginBottom: 15 },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#636E72', marginTop: 8 },
  modalValue: { fontSize: 16, color: '#2D3436', marginBottom: 4 },
  modalCerrar: { marginTop: 15, padding: 12, backgroundColor: '#DFE6E9', borderRadius: 10, alignItems: 'center' },
  modalCerrarText: { color: '#2D3436', fontSize: 14, fontWeight: '500' },
});

export default RevisionServicios;