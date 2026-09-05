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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const IngresoTransferencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferencias, setTransferencias] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);

  // ========== Estado para búsqueda ==========
  const [busqueda, setBusqueda] = useState('');
  const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);
  const [mostrandoFiltradas, setMostrandoFiltradas] = useState(false);

  // ========== Estado para foto ampliada ==========
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  // ============================================
  // 🔍 FUNCIÓN DE BÚSQUEDA
  // ============================================
  const buscarTransferencias = (texto) => {
    setBusqueda(texto);
    
    if (!texto || texto.trim() === '') {
      setMostrandoFiltradas(false);
      setTransferenciasFiltradas([]);
      return;
    }

    const termino = texto.toLowerCase().trim();
    const filtradas = transferencias.filter(t => {
      const codigo = (t.codigoIdentificador || '').toLowerCase();
      const nombre = (t.nombreUsuario || '').toLowerCase();
      const documento = (t.numeroDocumento || '').toLowerCase();
      const zona = (t.zonaSector || '').toLowerCase();
      
      return codigo.includes(termino) || 
             nombre.includes(termino) || 
             documento.includes(termino) ||
             zona.includes(termino);
    });

    setTransferenciasFiltradas(filtradas);
    setMostrandoFiltradas(true);
  };

  // ============================================
  // 📸 ABRIR FOTO AMPLIADA
  // ============================================
  const abrirFotoAmpliada = (imagen) => {
    if (imagen) {
      setFotoAmpliada(imagen);
      setModalFotoVisible(true);
    }
  };

  const cargarTransferencias = async () => {
    try {
      const response = await api.get('/transferencias/estado/CONFIRMADA');
      setTransferencias(response.data.data || []);
      setBusqueda('');
      setMostrandoFiltradas(false);
      setTransferenciasFiltradas([]);
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

  // ✅ FUNCIÓN PARA OBTENER LA IMAGEN (SOPORTA CLOUDINARY Y BASE64)
  const getImagen = (item) => {
    // Verificar imagenComprobante
    if (item.imagenComprobante && typeof item.imagenComprobante === 'string') {
      const imagen = item.imagenComprobante;
      // Si es URL de Cloudinary (empieza con http)
      if (imagen.startsWith('http')) {
        return imagen;
      }
      // Si es base64 con prefijo
      if (imagen.startsWith('data:image')) {
        return imagen;
      }
      // Si es base64 sin prefijo
      if (imagen.length > 100) {
        return `data:image/jpeg;base64,${imagen}`;
      }
    }
    // Fallback para soporte
    if (item.soporte && item.soporte.length > 100) {
      let imagen = item.soporte;
      if (imagen.startsWith('http')) {
        return imagen;
      }
      if (imagen.startsWith('data:image')) {
        return imagen;
      }
      return `data:image/jpeg;base64,${imagen}`;
    }
    return null;
  };

  // ✅ FUNCIÓN PARA VERIFICAR SI TIENE IMAGEN
  const tieneImagen = (item) => {
    return getImagen(item) !== null;
  };

  const ingresarTransferencia = async (id, estado) => {
    Alert.alert(
      'Ingresar Transferencia',
      `¿Estás seguro de ${estado === 'INGRESADA' ? 'ingresar' : 'enviar a revisión'} esta transferencia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: estado === 'INGRESADA' ? 'Ingresar' : 'Enviar a Revisión',
          onPress: async () => {
            try {
              await api.put(`/transferencias/${id}/ingresar`, { estado });
              Alert.alert('Éxito', `Transferencia ${estado === 'INGRESADA' ? 'ingresada' : 'en revisión'} correctamente`);
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

        <Text style={styles.transferenciaDocumento}>
          📄 Documento: {item.numeroDocumento || 'N/A'}
        </Text>

        {/* ✅ NUEVA LÍNEA: BANCO Y CUENTA EN LA TARJETA */}
        <Text style={styles.transferenciaBanco}>🏦 {item.bancoCuenta || 'N/A'}</Text>

        <View style={styles.transferenciaFooter}>
          <Text style={styles.transferenciaInfo}>💰 {formatValor(item.valor)}</Text>
          <Text style={styles.transferenciaInfo}>📅 {formatFecha(item.fechaTransferencia)}</Text>
          <Text style={styles.transferenciaInfo}>👤 {item.responsable}</Text>
        </View>

        {tieneImagen(item) && (
          <TouchableOpacity 
            style={styles.imagenIndicator}
            onPress={() => {
              const img = getImagen(item);
              if (img) abrirFotoAmpliada(img);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.imagenIndicatorText}>📷 Toca para ver comprobante</Text>
          </TouchableOpacity>
        )}

        {isAdminOrJefe && (
          <View style={styles.accionesContainer}>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionIngresar]}
              onPress={() => ingresarTransferencia(item._id, 'INGRESADA')}
            >
              <Text style={styles.accionButtonText}>💰 Ingresar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionRevision]}
              onPress={() => ingresarTransferencia(item._id, 'EN_REVISION')}
            >
              <Text style={styles.accionButtonText}>🔍 En Revisión</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getDatosMostrar = () => {
    if (mostrandoFiltradas) {
      return transferenciasFiltradas;
    }
    return transferencias;
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
        <Text style={styles.title}>💰 Ingreso de Transferencias</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por código, nombre, documento o zona..."
          value={busqueda}
          onChangeText={buscarTransferencias}
          placeholderTextColor="#999"
        />
        {busqueda.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setBusqueda('');
              setMostrandoFiltradas(false);
              setTransferenciasFiltradas([]);
            }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getDatosMostrar().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {mostrandoFiltradas 
                ? 'No se encontraron transferencias con ese criterio' 
                : 'No hay transferencias confirmadas'}
            </Text>
          </View>
        ) : (
          getDatosMostrar().map(renderTransferencia)
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

                <Text style={styles.modalLabel}>Número de Documento:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.numeroDocumento || 'N/A'}</Text>

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

                {/* ✅ IMAGEN DEL COMPROBANTE - CON MEJOR CALIDAD */}
                {(() => {
                  const imagenData = getImagen(transferenciaSeleccionada);
                  if (imagenData && imagenData.length > 100) {
                    let uriImagen = imagenData;
                    // Si es base64 sin prefijo, agregarlo
                    if (!uriImagen.startsWith('data:image') && !uriImagen.startsWith('http')) {
                      uriImagen = `data:image/jpeg;base64,${imagenData}`;
                    }
                    return (
                      <View style={styles.imagenContainer}>
                        <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                        <TouchableOpacity 
                          onPress={() => abrirFotoAmpliada(uriImagen)}
                          activeOpacity={0.8}
                          style={styles.imagenTouchable}
                        >
                          <Image
                            source={{ uri: uriImagen }}
                            style={styles.modalImagen}
                            resizeMode="contain"
                            resizeMethod="resize"
                            fadeDuration={0}
                            onError={(e) => {
                              console.log('❌ Error imagen modal:', e.nativeEvent.error);
                              Alert.alert('Error', 'No se pudo cargar el comprobante');
                            }}
                            onLoad={() => console.log('✅ Imagen modal cargada correctamente')}
                          />
                        </TouchableOpacity>
                        <Text style={styles.fotoHint}>👆 Toca la imagen para ampliar</Text>
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

                {isAdminOrJefe && transferenciaSeleccionada.estado === 'CONFIRMADA' && (
                  <View style={styles.modalBotones}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalIngresar]}
                      onPress={() => ingresarTransferencia(transferenciaSeleccionada._id, 'INGRESADA')}
                    >
                      <Text style={styles.modalButtonText}>💰 Ingresar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalRevision]}
                      onPress={() => ingresarTransferencia(transferenciaSeleccionada._id, 'EN_REVISION')}
                    >
                      <Text style={styles.modalButtonText}>🔍 En Revisión</Text>
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

      {/* MODAL PARA FOTO AMPLIADA - CON MEJOR CALIDAD */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalFotoVisible}
        onRequestClose={() => setModalFotoVisible(false)}
      >
        <View style={styles.fotoModalOverlay}>
          <TouchableOpacity 
            style={styles.fotoModalClose}
            onPress={() => setModalFotoVisible(false)}
          >
            <Text style={styles.fotoModalCloseText}>✕ Cerrar</Text>
          </TouchableOpacity>
          {fotoAmpliada && (
            <Image
              source={{ uri: fotoAmpliada }}
              style={styles.fotoAmpliada}
              resizeMode="contain"
              resizeMethod="resize"
              fadeDuration={0}
              onError={(e) => {
                console.log('❌ Error foto ampliada:', e.nativeEvent.error);
                Alert.alert('Error', 'No se pudo cargar la imagen ampliada');
              }}
              onLoad={() => console.log('✅ Foto ampliada cargada')}
            />
          )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
    paddingVertical: 8,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#636E72',
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
  transferenciaDocumento: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
    fontWeight: '500',
  },
  // ✅ NUEVO ESTILO PARA BANCO Y CUENTA
  transferenciaBanco: {
    fontSize: 14,
    color: '#2D3436',
    marginBottom: 6,
    fontWeight: '500',
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
    marginBottom: 4,
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
    paddingVertical: 6,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  imagenIndicatorText: {
    fontSize: 12,
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
  accionIngresar: {
    backgroundColor: '#0984E3',
  },
  accionRevision: {
    backgroundColor: '#E17055',
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
    textAlign: 'center',
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
  imagenTouchable: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalImagen: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginTop: 5,
    backgroundColor: '#F0F0F0',
  },
  fotoHint: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 5,
    fontStyle: 'italic',
  },
  fotoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoModalClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fotoModalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fotoAmpliada: {
    width: '100%',
    height: '80%',
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
  modalIngresar: {
    backgroundColor: '#0984E3',
  },
  modalRevision: {
    backgroundColor: '#E17055',
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

export default IngresoTransferencias;