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
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

const RevisionTransferencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferencias, setTransferencias] = useState([]);
  const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);

  const cargarTransferencias = async () => {
    try {
      const response = await api.get('/transferencias');
      setTransferencias(response.data.data || []);
      setTransferenciasFiltradas(response.data.data || []);
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

  const buscarTransferencias = async () => {
    if (!searchTerm || searchTerm.trim() === '') {
      setTransferenciasFiltradas(transferencias);
      return;
    }

    try {
      const response = await api.get(`/transferencias/buscar-revision?search=${searchTerm.trim()}`);
      setTransferenciasFiltradas(response.data.data || []);
    } catch (error) {
      Alert.alert('Error', 'Error al buscar transferencias');
    }
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

  const getEstadoLabel = (estado) => {
    const labels = {
      'SUBIDA': '📤 Subida',
      'CONFIRMADA': '✅ Confirmada',
      'DENEGADA': '❌ Denegada',
      'INGRESADA': '💰 Ingresada',
      'EN_REVISION': '🔍 En Revisión',
    };
    return labels[estado] || estado;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const formatValor = (valor) => {
    return `$${valor?.toFixed(2) || '0.00'}`;
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
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(item.estado)}</Text>
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
        <Text style={styles.title}>🔍 Revisión de Transferencias</Text>
      </View>

      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Buscar por nombre o código..."
          onSubmitEditing={buscarTransferencias}
        />
        <TouchableOpacity style={styles.buscadorButton} onPress={buscarTransferencias}>
          <Text style={styles.buscadorButtonText}>🔍 Buscar</Text>
        </TouchableOpacity>
        {searchTerm.length > 0 && (
          <TouchableOpacity
            style={styles.limpiarButton}
            onPress={() => {
              setSearchTerm('');
              setTransferenciasFiltradas(transferencias);
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
        {transferenciasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay transferencias</Text>
            <Text style={styles.emptySubText}>
              {searchTerm ? 'No se encontraron transferencias con ese criterio' : 'Todas las transferencias están procesadas'}
            </Text>
          </View>
        ) : (
          transferenciasFiltradas.map(renderTransferencia)
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
                  <Text style={styles.estadoBadgeText}>{getEstadoLabel(transferenciaSeleccionada.estado)}</Text>
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
    marginRight: 10,
  },
  buscadorButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  buscadorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  limpiarButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
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

export default RevisionTransferencias;