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
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RevisionBodegas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bodegas, setBodegas] = useState([]);
  const [bodegasFiltradas, setBodegasFiltradas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
        const data = response.data.data || [];
        setBodegas(data);
        setBodegasFiltradas(data);
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

  // 🔍 Buscar bodegas por nombre o usuario
  const buscarBodegas = (text) => {
    setSearchTerm(text);
    if (!text || text.trim() === '') {
      setBodegasFiltradas(bodegas);
      return;
    }

    const term = text.toLowerCase().trim();
    const filtradas = bodegas.filter(b => 
      b.nombre.toLowerCase().includes(term) ||
      b.usuarioNombre.toLowerCase().includes(term)
    );
    setBodegasFiltradas(filtradas);
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

  const abrirDetalle = (bodega) => {
    setBodegaSeleccionada(bodega);
    setModalVisible(true);
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

      {/* 🔍 Buscador */}
      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          value={searchTerm}
          onChangeText={buscarBodegas}
          placeholder="Buscar bodega por nombre o usuario..."
          placeholderTextColor="#999"
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            style={styles.limpiarButton}
            onPress={() => {
              setSearchTerm('');
              setBodegasFiltradas(bodegas);
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
        {/* Contador de resultados */}
        <Text style={styles.resultadosCount}>
          {bodegasFiltradas.length} bodega{bodegasFiltradas.length !== 1 ? 's' : ''} encontrada{bodegasFiltradas.length !== 1 ? 's' : ''}
        </Text>

        {bodegasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {searchTerm ? 'No se encontraron bodegas' : 'No hay bodegas creadas'}
            </Text>
            <Text style={styles.emptySubText}>
              {searchTerm ? 'Prueba con otro término de búsqueda' : 'Crea una bodega para comenzar'}
            </Text>
          </View>
        ) : (
          bodegasFiltradas.map((bodega) => (
            <TouchableOpacity
              key={bodega._id}
              style={[
                styles.bodegaCard,
                bodega.estado === 'INACTIVA' && styles.bodegaCardInactiva,
              ]}
              onPress={() => abrirDetalle(bodega)}
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
                    • {m.nombre}: {formatNumber(m.cantidad)}
                    {m.minimo > 0 && m.cantidad <= m.minimo && ' ⚠️'}
                  </Text>
                ))}
                {bodega.materiales?.length > 3 && (
                  <Text style={styles.bodegaMaterialMore}>
                    +{bodega.materiales.length - 3} más... (toca para ver todos)
                  </Text>
                )}
                {bodega.materiales?.length === 0 && (
                  <Text style={styles.bodegaMaterialEmpty}>
                    Sin materiales asignados
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

      {/* 📋 Modal de Detalle con lista completa de materiales */}
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
                {/* Información general */}
                <View style={styles.modalInfoSection}>
                  <Text style={styles.modalInfoLabel}>Nombre:</Text>
                  <Text style={styles.modalInfoValue}>{bodegaSeleccionada.nombre}</Text>

                  <Text style={styles.modalInfoLabel}>Usuario:</Text>
                  <Text style={styles.modalInfoValue}>{bodegaSeleccionada.usuarioNombre}</Text>

                  <Text style={styles.modalInfoLabel}>Estado:</Text>
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(bodegaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                    <Text style={styles.estadoBadgeText}>{getEstadoLabel(bodegaSeleccionada.estado)}</Text>
                  </View>

                  <Text style={styles.modalInfoLabel}>Creado por:</Text>
                  <Text style={styles.modalInfoValue}>{bodegaSeleccionada.creadoPor?.nombre || 'Desconocido'}</Text>

                  <Text style={styles.modalInfoLabel}>Fecha creación:</Text>
                  <Text style={styles.modalInfoValue}>
                    {new Date(bodegaSeleccionada.createdAt).toLocaleDateString('es-ES')}
                  </Text>
                </View>

                {/* 📦 Lista completa de materiales */}
                <View style={styles.modalMaterialesSection}>
                  <Text style={styles.modalMaterialesTitle}>
                    📦 Materiales ({bodegaSeleccionada.materiales?.length || 0})
                  </Text>

                  {bodegaSeleccionada.materiales?.length === 0 ? (
                    <Text style={styles.modalSinMateriales}>No hay materiales asignados</Text>
                  ) : (
                    <View style={styles.modalMaterialesLista}>
                      {bodegaSeleccionada.materiales?.map((m, index) => (
                        <View key={index} style={[
                          styles.modalMaterialItem,
                          m.minimo > 0 && m.cantidad <= m.minimo && styles.modalMaterialItemCritico,
                        ]}>
                          <View style={styles.modalMaterialInfo}>
                            <Text style={styles.modalMaterialNombre}>{m.nombre}</Text>
                            <Text style={styles.modalMaterialCantidad}>
                              Cantidad: {formatNumber(m.cantidad)}
                            </Text>
                          </View>
                          <View style={styles.modalMaterialEstado}>
                            {m.minimo > 0 && (
                              <Text style={[
                                styles.modalMaterialMinimo,
                                m.cantidad <= m.minimo && styles.modalMaterialAlerta,
                              ]}>
                                {m.cantidad <= m.minimo ? '⚠️ CRÍTICO' : `Mín: ${formatNumber(m.minimo)}`}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
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
  buscadorContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  buscadorInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
  },
  limpiarButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    width: 44,
    height: 44,
  },
  limpiarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listaContainer: {
    flex: 1,
    padding: 15,
  },
  resultadosCount: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 10,
    paddingHorizontal: 5,
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
  bodegaMaterialEmpty: {
    fontSize: 13,
    color: '#636E72',
    fontStyle: 'italic',
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
  modalInfoSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    marginTop: 8,
  },
  modalInfoValue: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
  },
  modalMaterialesSection: {
    marginTop: 5,
  },
  modalMaterialesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  modalSinMateriales: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  modalMaterialesLista: {
    marginTop: 5,
  },
  modalMaterialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  modalMaterialItemCritico: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
  },
  modalMaterialInfo: {
    flex: 1,
  },
  modalMaterialNombre: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2D3436',
  },
  modalMaterialCantidad: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  modalMaterialEstado: {
    alignItems: 'flex-end',
  },
  modalMaterialMinimo: {
    fontSize: 12,
    color: '#636E72',
  },
  modalMaterialAlerta: {
    color: '#FF6B6B',
    fontWeight: 'bold',
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