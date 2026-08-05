import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Ejecucion = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [filtro, setFiltro] = useState('PENDIENTE');

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/desconexiones');
      if (response.data.success) {
        setSolicitudes(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const ejecutarSolicitud = async (id) => {
    try {
      setLoading(true);
      const response = await api.put(`/desconexiones/${id}/ejecutar`, {
        observacion: observacion || 'Ejecutado por ' + user?.nombre,
      });
      
      if (response.data.success) {
        Alert.alert('✅ Éxito', 'Solicitud ejecutada correctamente');
        setModalVisible(false);
        setObservacion('');
        cargarSolicitudes();
      }
    } catch (error) {
      console.error('Error ejecutando solicitud:', error);
      Alert.alert('Error', 'No se pudo ejecutar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const rechazarSolicitud = async (id) => {
    try {
      setLoading(true);
      const response = await api.put(`/desconexiones/${id}/rechazar`, {
        observacion: observacion || 'Rechazado por ' + user?.nombre,
      });
      
      if (response.data.success) {
        Alert.alert('⚠️ Rechazado', 'Solicitud rechazada correctamente');
        setModalVisible(false);
        setObservacion('');
        cargarSolicitudes();
      }
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const getSolicitudesFiltradas = () => {
    if (filtro === 'TODOS') return solicitudes;
    return solicitudes.filter(s => s.estado === filtro);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return '#FDCB6E';
      case 'EJECUTADO': return '#00B894';
      case 'RECHAZADO': return '#FF6B6B';
      default: return '#636E72';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'time-outline';
      case 'EJECUTADO': return 'checkmark-circle-outline';
      case 'RECHAZADO': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  if (loading && solicitudes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Ejecución</Text>
        <Text style={styles.subtitle}>Gestionar solicitudes pendientes</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosContainer}>
        {['PENDIENTE', 'EJECUTADO', 'RECHAZADO', 'TODOS'].map((tipo) => (
          <TouchableOpacity
            key={tipo}
            style={[styles.filtroButton, filtro === tipo && styles.filtroButtonActive]}
            onPress={() => setFiltro(tipo)}
          >
            <Text style={[styles.filtroText, filtro === tipo && styles.filtroTextActive]}>
              {tipo === 'TODOS' ? '📋 Todos' : 
               tipo === 'PENDIENTE' ? '⏳ Pendientes' :
               tipo === 'EJECUTADO' ? '✅ Ejecutados' : '❌ Rechazados'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        {getSolicitudesFiltradas().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color="#B2BEC3" />
            <Text style={styles.emptyTitle}>No hay solicitudes</Text>
            <Text style={styles.emptyText}>
              {filtro === 'PENDIENTE' 
                ? 'No hay solicitudes pendientes de ejecución' 
                : 'No hay solicitudes en este estado'}
            </Text>
          </View>
        ) : (
          getSolicitudesFiltradas().map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.solicitudCard}
              onPress={() => {
                if (item.estado === 'PENDIENTE') {
                  setSolicitudSeleccionada(item);
                  setModalVisible(true);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.solicitudHeader}>
                <View style={styles.solicitudTipo}>
                  <Text style={styles.solicitudTipoText}>
                    {item.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión'}
                  </Text>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                  <Ionicons name={getEstadoIcon(item.estado)} size={14} color="#FFFFFF" />
                  <Text style={styles.estadoBadgeText}>{item.estado}</Text>
                </View>
              </View>

              <Text style={styles.solicitudCliente}>👤 {item.cliente || 'N/A'}</Text>
              <Text style={styles.solicitudInfo}>📋 Código: {item.codigoCliente || 'N/A'}</Text>
              <Text style={styles.solicitudInfo}>📅 {new Date(item.fecha).toLocaleDateString()}</Text>
              {item.observaciones && (
                <Text style={styles.solicitudInfo}>📝 {item.observaciones}</Text>
              )}
              
              <View style={styles.solicitudFooter}>
                <Text style={styles.solicitudUsuario}>
                  👤 {item.usuario?.nombre || 'N/A'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de ejecución/rechazo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Gestionar Solicitud</Text>
            
            {solicitudSeleccionada && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Tipo:</Text>
                  <Text style={styles.modalInfoValue}>
                    {solicitudSeleccionada.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión'}
                  </Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Cliente:</Text>
                  <Text style={styles.modalInfoValue}>{solicitudSeleccionada.cliente}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Código:</Text>
                  <Text style={styles.modalInfoValue}>{solicitudSeleccionada.codigoCliente}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Fecha:</Text>
                  <Text style={styles.modalInfoValue}>
                    {new Date(solicitudSeleccionada.fecha).toLocaleDateString()}
                  </Text>
                </View>
                {solicitudSeleccionada.observaciones && (
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoLabel}>Observaciones:</Text>
                    <Text style={styles.modalInfoValue}>{solicitudSeleccionada.observaciones}</Text>
                  </View>
                )}
              </>
            )}

            <Text style={styles.modalLabel}>Observación (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={observacion}
              onChangeText={setObservacion}
              placeholder="Agregar observación..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rechazarButton]}
                onPress={() => {
                  if (solicitudSeleccionada) {
                    rechazarSolicitud(solicitudSeleccionada._id);
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>❌ Rechazar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.ejecutarButton]}
                onPress={() => {
                  if (solicitudSeleccionada) {
                    ejecutarSolicitud(solicitudSeleccionada._id);
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>✅ Ejecutar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#6C5CE7',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  filtrosContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6E9',
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    marginRight: 8,
  },
  filtroButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  filtroText: {
    color: '#636E72',
    fontSize: 14,
    fontWeight: '500',
  },
  filtroTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  solicitudCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  solicitudTipo: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  solicitudTipoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2D3436',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  solicitudCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  solicitudInfo: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  solicitudFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  solicitudUsuario: {
    fontSize: 12,
    color: '#636E72',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  modalInfoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#636E72',
    width: 100,
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#2D3436',
    flex: 1,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginTop: 12,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    textAlignVertical: 'top',
    height: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ejecutarButton: {
    backgroundColor: '#00B894',
  },
  rechazarButton: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCerrar: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#636E72',
    fontSize: 14,
  },
});

export default Ejecucion;
