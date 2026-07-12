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
  RefreshControl,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RevisionBodegas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bodegas, setBodegas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null);

  const isAdmin = user?.rol === 'Admin';

  useEffect(() => {
    cargarBodegas();
  }, []);

  const cargarBodegas = async () => {
    try {
      const response = await api.get('/bodegas');
      if (response.data.success) {
        setBodegas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar bodegas:', error);
      Alert.alert('Error', 'No se pudieron cargar las bodegas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarBodegas();
  };

  const cambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    Alert.alert(
      'Cambiar Estado',
      `¿Estás seguro de ${nuevoEstado === 'ACTIVA' ? 'activar' : 'desactivar'} esta bodega?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.put(`/bodegas/${id}/estado`, { estado: nuevoEstado });
              Alert.alert('Éxito', `Bodega ${nuevoEstado === 'ACTIVA' ? 'activada' : 'desactivada'}`);
              cargarBodegas();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al cambiar estado');
            }
          },
        },
      ]
    );
  };

  const eliminarBodega = async (id, nombre) => {
    Alert.alert(
      'Eliminar Bodega',
      `¿Estás seguro de eliminar la bodega "${nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/bodegas/${id}`);
              Alert.alert('Éxito', 'Bodega eliminada correctamente');
              cargarBodegas();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al eliminar');
            }
          },
        },
      ]
    );
  };

  const getEstadoColor = (estado) => {
    return estado === 'ACTIVA' ? '#00B894' : '#FF6B6B';
  };

  const getEstadoLabel = (estado) => {
    return estado === 'ACTIVA' ? '✅ Activa' : '❌ Inactiva';
  };

  const formatNumber = (num) => {
    return num?.toFixed(2) || '0';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando bodegas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Revisar Bodegas</Text>
        <Text style={styles.subtitle}>Inventario y gestión de bodegas</Text>
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bodegas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay bodegas</Text>
            <Text style={styles.emptySubText}>Crea una bodega para comenzar</Text>
          </View>
        ) : (
          bodegas.map((bodega) => (
            <TouchableOpacity
              key={bodega._id}
              style={[
                styles.bodegaCard,
                bodega.estado === 'INACTIVA' && styles.bodegaCardInactiva,
              ]}
              onPress={() => {
                setBodegaSeleccionada(bodega);
                setModalVisible(true);
              }}
            >
              <View style={styles.bodegaHeader}>
                <Text style={styles.bodegaNombre}>{bodega.nombre}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(bodega.estado) }]}>
                  <Text style={styles.estadoBadgeText}>{getEstadoLabel(bodega.estado)}</Text>
                </View>
              </View>

              <Text style={styles.bodegaUsuario}>👤 {bodega.usuarioNombre}</Text>

              <View style={styles.bodegaMateriales}>
                <Text style={styles.bodegaMaterialesTitle}>
                  📦 Materiales: {bodega.materiales?.length || 0}
                </Text>
                {bodega.materiales?.slice(0, 3).map((m, index) => (
                  <Text key={index} style={styles.bodegaMaterialItem}>
                    • {m.nombre}: {formatNumber(m.cantidad)} {m.unidad}
                  </Text>
                ))}
                {bodega.materiales?.length > 3 && (
                  <Text style={styles.bodegaMaterialMore}>
                    +{bodega.materiales.length - 3} más...
                  </Text>
                )}
              </View>

              {isAdmin && (
                <View style={styles.accionesContainer}>
                  <TouchableOpacity
                    style={[styles.accionButton, styles.accionEstado]}
                    onPress={() => cambiarEstado(bodega._id, bodega.estado)}
                  >
                    <Text style={styles.accionButtonText}>
                      {bodega.estado === 'ACTIVA' ? '🔴 Desactivar' : '🟢 Activar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.accionButton, styles.accionEliminar]}
                    onPress={() => eliminarBodega(bodega._id, bodega.nombre)}
                  >
                    <Text style={styles.accionButtonText}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
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
            <Text style={styles.modalTitle}>📋 Detalle de Bodega</Text>

            {bodegaSeleccionada && (
              <View>
                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{bodegaSeleccionada.nombre}</Text>

                <Text style={styles.modalLabel}>Usuario:</Text>
                <Text style={styles.modalValue}>{bodegaSeleccionada.usuarioNombre}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(bodegaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{getEstadoLabel(bodegaSeleccionada.estado)}</Text>
                </View>

                <Text style={styles.modalLabel}>📦 Materiales:</Text>
                {bodegaSeleccionada.materiales?.length === 0 ? (
                  <Text style={styles.modalSinMateriales}>No hay materiales asignados</Text>
                ) : (
                  bodegaSeleccionada.materiales?.map((m, index) => (
                    <View key={index} style={styles.modalMaterialItem}>
                      <Text style={styles.modalMaterialNombre}>{m.nombre}</Text>
                      <Text style={styles.modalMaterialCantidad}>
                        {formatNumber(m.cantidad)} {m.unidad}
                      </Text>
                      {m.minimo > 0 && (
                        <Text style={styles.modalMaterialMinimo}>
                          Mínimo: {formatNumber(m.minimo)} {m.unidad}
                        </Text>
                      )}
                    </View>
                  ))
                )}

                <Text style={styles.modalLabel}>Creado por:</Text>
                <Text style={styles.modalValue}>{bodegaSeleccionada.creadoPor?.nombre || 'Desconocido'}</Text>

                <Text style={styles.modalLabel}>Fecha creación:</Text>
                <Text style={styles.modalValue}>
                  {new Date(bodegaSeleccionada.createdAt).toLocaleDateString('es-ES')}
                </Text>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
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
  listaContainer: {
    flex: 1,
    padding: 15,
  },
  bodegaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bodegaCardInactiva: {
    opacity: 0.6,
  },
  bodegaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bodegaNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  bodegaUsuario: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  bodegaMateriales: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  bodegaMaterialesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  bodegaMaterialItem: {
    fontSize: 13,
    color: '#636E72',
    marginLeft: 5,
  },
  bodegaMaterialMore: {
    fontSize: 12,
    color: '#0984E3',
    marginTop: 2,
  },
  accionesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  accionButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accionEstado: {
    backgroundColor: '#0984E3',
  },
  accionEliminar: {
    backgroundColor: '#FF6B6B',
  },
  accionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
  },
  footerSpacer: {
    height: 20,
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
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    marginTop: 8,
  },
  modalValue: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
  },
  modalSinMateriales: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
    marginVertical: 5,
  },
  modalMaterialItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  modalMaterialNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  modalMaterialCantidad: {
    fontSize: 13,
    color: '#636E72',
  },
  modalMaterialMinimo: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 2,
  },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#2D3436',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RevisionBodegas;