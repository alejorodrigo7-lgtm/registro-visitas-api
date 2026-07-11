import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ConfirmacionTransferencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferencias, setTransferencias] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  const cargarTransferencias = async () => {
    try {
      const response = await api.get('/transferencias/estado/SUBIDA');
      setTransferencias(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar transferencias:', error);
      Alert.alert('Error', 'No se pudieron cargar las transferencias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarTransferencias();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarTransferencias();
  };

  // ✅ FUNCIÓN PARA OBTENER LA IMAGEN (de cualquier campo)
  const getImagen = (item) => {
    // Primero revisar imagenComprobante
    if (item.imagenComprobante && item.imagenComprobante.length > 100) {
      return item.imagenComprobante;
    }
    // Luego revisar soporte
    if (item.soporte && item.soporte.length > 100) {
      return item.soporte;
    }
    return null;
  };

  // ✅ VERIFICAR SI TIENE IMAGEN
  const tieneImagen = (item) => {
    return getImagen(item) !== null;
  };

  const confirmarTransferencia = async (id, estado) => {
    Alert.alert(
      'Confirmar Transferencia',
      `¿Estás seguro de ${estado === 'CONFIRMADA' ? 'aprobar' : 'denegar'} esta transferencia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: estado === 'CONFIRMADA' ? 'Aprobar' : 'Denegar',
          onPress: async () => {
            try {
              await api.put(`/transferencias/${id}/confirmar`, { estado });
              Alert.alert('Éxito', `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'} correctamente`);
              setModalVisible(false);
              cargarTransferencias();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al procesar');
            }
          },
        },
      ]
    );
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'SUBIDA': '#FDCB6E',
      'CONFIRMADA': '#00B894',
      'DENEGADA': '#FF6B6B',
      'INGRESADA': '#0984E3',
      'EN_REVISION': '#E17055',
    };
    return colors[estado] || '#636E72';
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const formatValor = (valor) => {
    return `$${valor?.toFixed(2) || '0.00'}`;
  };

  const renderTransferencia = (item) => {
    return (
      <TouchableOpacity
        key={item._id}
        style={styles.transferenciaCard}
        onPress={() => {
          setTransferenciaSeleccionada(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.transferenciaHeader}>
          <Text style={styles.transferenciaCodigo}>{item.codigoIdentificador}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoBadgeText}>{item.estado}</Text>
          </View>
        </View>

        <Text style={styles.transferenciaNombre}>{item.nombreUsuario}</Text>

        <View style={styles.transferenciaFooter}>
          <Text style={styles.transferenciaInfo}>💰 {formatValor(item.valor)}</Text>
          <Text style={styles.transferenciaInfo}>📅 {formatFecha(item.fechaTransferencia)}</Text>
          <Text style={styles.transferenciaInfo}>👤 {item.responsable}</Text>
        </View>

        {/* ✅ INDICADOR DE IMAGEN */}
        {tieneImagen(item) && (
          <View style={styles.imagenIndicator}>
            <Text style={styles.imagenIndicatorText}>📷 Tiene comprobante</Text>
          </View>
        )}

        {isAdminOrJefe && (
          <View style={styles.accionesContainer}>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionAprobar]}
              onPress={() => confirmarTransferencia(item._id, 'CONFIRMADA')}
            >
              <Text style={styles.accionButtonText}>✅ Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionDenegar]}
              onPress={() => confirmarTransferencia(item._id, 'DENEGADA')}
            >
              <Text style={styles.accionButtonText}>❌ Denegar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando transferencias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Confirmación de Transferencias</Text>
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {transferencias.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay transferencias pendientes</Text>
          </View>
        ) : (
          transferencias.map(renderTransferencia)
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* ✅ MODAL DE DETALLE CON IMAGEN MEJORADA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Detalle de Transferencia</Text>

            {transferenciaSeleccionada && (
              <View>
                <Text style={styles.modalLabel}>Código:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.codigoIdentificador}</Text>

                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.nombreUsuario}</Text>

                <Text style={styles.modalLabel}>Valor:</Text>
                <Text style={styles.modalValue}>{formatValor(transferenciaSeleccionada.valor)}</Text>

                <Text style={styles.modalLabel}>Zona:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.zonaSector} - {transferenciaSeleccionada.barrio}</Text>

                <Text style={styles.modalLabel}>Banco:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.bancoCuenta}</Text>

                <Text style={styles.modalLabel}>Fecha:</Text>
                <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaTransferencia)}</Text>

                <Text style={styles.modalLabel}>Responsable:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.responsable}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(transferenciaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{transferenciaSeleccionada.estado}</Text>
                </View>

                {/* ✅ IMAGEN DEL COMPROBANTE - VERIFICA AMBOS CAMPOS */}
                {(() => {
                  const imagenData = getImagen(transferenciaSeleccionada);
                  if (imagenData) {
                    return (
                      <View style={styles.imagenContainer}>
                        <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                        <Image
                          source={{
                            uri: imagenData.startsWith('data:image')
                              ? imagenData
                              : `data:image/jpeg;base64,${imagenData}`
                          }}
                          style={styles.modalImagen}
                          resizeMode="contain"
                          onError={(e) => console.log('❌ Error imagen:', e.nativeEvent.error)}
                        />
                      </View>
                    );
                  } else {
                    return (
                      <View style={styles.sinImagenContainer}>
                        <Text style={styles.sinImagenText}>📭 Sin comprobante</Text>
                      </View>
                    );
                  }
                })()}

                {isAdminOrJefe && transferenciaSeleccionada.estado === 'SUBIDA' && (
                  <View style={styles.modalBotones}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalAprobar]}
                      onPress={() => confirmarTransferencia(transferenciaSeleccionada._id, 'CONFIRMADA')}
                    >
                      <Text style={styles.modalButtonText}>✅ Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalDenegar]}
                      onPress={() => confirmarTransferencia(transferenciaSeleccionada._id, 'DENEGADA')}
                    >
                      <Text style={styles.modalButtonText}>❌ Denegar</Text>
                    </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  transferenciaCard: {
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
  transferenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transferenciaCodigo: {
    fontSize: 16,
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
  transferenciaNombre: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
    fontWeight: '500',
  },
  transferenciaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  transferenciaInfo: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  imagenIndicator: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  imagenIndicatorText: {
    fontSize: 11,
    color: '#00B894',
    fontWeight: '500',
  },
  accionesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  accionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  accionAprobar: {
    backgroundColor: '#00B894',
  },
  accionDenegar: {
    backgroundColor: '#FF6B6B',
  },
  accionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  imagenContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalImagen: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginTop: 5,
    backgroundColor: '#F0F0F0',
  },
  sinImagenContainer: {
    marginTop: 10,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    alignItems: 'center',
  },
  sinImagenText: {
    fontSize: 14,
    color: '#636E72',
  },
  modalBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalAprobar: {
    backgroundColor: '#00B894',
  },
  modalDenegar: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
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

export default ConfirmacionTransferencias;