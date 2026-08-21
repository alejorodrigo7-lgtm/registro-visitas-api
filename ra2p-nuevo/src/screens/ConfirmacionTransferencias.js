import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ConfirmacionTransferencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transferencias, setTransferencias] = useState([]);
  const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);

  // ========== Estado para foto ampliada ==========
  const [modalFotoVisible, setModalFotoVisible] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  // ✅ VALIDAR IMAGEN (SOPORTA CLOUDINARY Y BASE64)
  const validarImagen = (item) => {
    try {
      if (!item) return null;
      
      let imagen = item.imagenComprobante || item.soporte || null;
      if (!imagen || typeof imagen !== 'string') return null;
      
      // Si es URL de Cloudinary (empieza con http)
      if (imagen.startsWith('http')) {
        return imagen;
      }
      
      // Si es base64 con prefijo
      if (imagen.startsWith('data:image')) {
        return imagen;
      }
      
      // Si es base64 sin prefijo
      if (imagen.length < 100) return null;
      
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (base64Regex.test(imagen.substring(0, 100))) {
        return `data:image/jpeg;base64,${imagen}`;
      }
      return null;
    } catch (e) {
      return null;
    }
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

  useEffect(() => {
    cargarTransferencias();
  }, []);

  const cargarTransferencias = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Cargando transferencias...');
      
      const response = await api.get('/transferencias/estado/SUBIDA');
      
      let datos = [];
      if (Array.isArray(response.data)) {
        datos = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        datos = response.data.data;
      } else if (response.data?.transferencias && Array.isArray(response.data.transferencias)) {
        datos = response.data.transferencias;
      }
      
      // ✅ Datos seguros CON IMAGEN VALIDADA
      const itemsSeguros = datos.map(item => {
        const imagenValida = validarImagen(item);
        return {
          _id: item._id || Math.random().toString(),
          nombreUsuario: item.nombreUsuario || 'Sin nombre',
          codigoIdentificador: item.codigoIdentificador || 'N/A',
          numeroDocumento: item.numeroDocumento || 'N/A',
          valor: typeof item.valor === 'number' ? item.valor : 0,
          estado: item.estado || 'SUBIDA',
          responsable: item.responsable || 'N/A',
          fechaTransferencia: item.fechaTransferencia || null,
          zonaSector: item.zonaSector || 'N/A',
          barrio: item.barrio || 'N/A',
          bancoCuenta: item.bancoCuenta || 'N/A',
          imagenComprobante: imagenValida,
          tieneImagen: imagenValida !== null,
        };
      });
      
      setTransferencias(itemsSeguros);
      setTransferenciasFiltradas(itemsSeguros);
      console.log('✅ Cargadas:', itemsSeguros.length);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar
  useEffect(() => {
    if (!transferencias || transferencias.length === 0) {
      setTransferenciasFiltradas([]);
      return;
    }
    
    let filtradas = [...transferencias];
    if (searchText.trim() !== '') {
      const texto = searchText.trim().toLowerCase();
      filtradas = filtradas.filter(t => {
        return (
          (t.nombreUsuario || '').toLowerCase().includes(texto) ||
          (t.codigoIdentificador || '').toLowerCase().includes(texto) ||
          (t.numeroDocumento || '').toLowerCase().includes(texto)
        );
      });
    }
    setTransferenciasFiltradas(filtradas);
  }, [searchText, transferencias]);

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
              Alert.alert('Éxito', `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'}`);
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
    try {
      if (!fecha) return 'Sin fecha';
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return 'Fecha inválida';
      return d.toLocaleDateString('es-ES');
    } catch (e) { return 'Fecha inválida'; }
  };

  const formatValor = (valor) => {
    try {
      if (valor === undefined || valor === null) return '$0.00';
      return `$${Number(valor).toFixed(2)}`;
    } catch (e) { return '$0.00'; }
  };

  // ✅ RENDER DE IMAGEN SEGURO CON MEJOR CALIDAD
  const renderImagen = (item) => {
    if (!item || !item.tieneImagen || !item.imagenComprobante) return null;
    
    return (
      <TouchableOpacity 
        style={styles.imagenContainer}
        onPress={() => {
          const img = item.imagenComprobante;
          if (img) abrirFotoAmpliada(img);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.imagenComprobante }}
          style={styles.imagenMiniatura}
          resizeMode="cover"
          resizeMethod="resize"
          fadeDuration={0}
          onError={() => console.log('⚠️ Error cargando imagen')}
        />
        <View style={styles.imagenBadge}>
          <Text style={styles.imagenBadgeText}>📷 Tocar para ampliar</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando transferencias...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={cargarTransferencias}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Confirmación de Transferencias</Text>
        <Text style={styles.subtitle}>
          {transferenciasFiltradas.length} transferencia{transferenciasFiltradas.length !== 1 ? 's' : ''}
          {searchText !== '' && ' (filtrado)'}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, código o documento..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#B2BEC3"
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.listaContainer}>
        {transferenciasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {searchText !== '' ? 'No hay coincidencias' : 'No hay transferencias pendientes'}
            </Text>
          </View>
        ) : (
          transferenciasFiltradas.map((item) => (
            <View key={item._id} style={styles.transferenciaCard}>
              <View style={styles.transferenciaHeader}>
                <Text style={styles.transferenciaCodigo}>{item.codigoIdentificador || 'N/A'}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                  <Text style={styles.estadoBadgeText}>{item.estado || 'SUBIDA'}</Text>
                </View>
              </View>

              <Text style={styles.transferenciaNombre}>{item.nombreUsuario || 'Sin nombre'}</Text>
              <Text style={styles.transferenciaDocumento}>📄 Documento: {item.numeroDocumento || 'N/A'}</Text>

              <View style={styles.transferenciaFooter}>
                <Text style={styles.transferenciaInfo}>💰 {formatValor(item.valor)}</Text>
                <Text style={styles.transferenciaInfo}>📅 {formatFecha(item.fechaTransferencia)}</Text>
                <Text style={styles.transferenciaInfo}>👤 {item.responsable || 'N/A'}</Text>
              </View>

              {/* ✅ IMAGEN CON MEJOR CALIDAD */}
              {renderImagen(item)}

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
            </View>
          ))
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* MODAL CON IMAGEN AMPLIADA - MEJOR CALIDAD */}
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
                <Text style={styles.modalValue}>{transferenciaSeleccionada.codigoIdentificador || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.nombreUsuario || 'Sin nombre'}</Text>

                <Text style={styles.modalLabel}>Documento:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.numeroDocumento || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Valor:</Text>
                <Text style={styles.modalValue}>{formatValor(transferenciaSeleccionada.valor)}</Text>

                <Text style={styles.modalLabel}>Zona:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.zonaSector || 'N/A'} - {transferenciaSeleccionada.barrio || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Banco:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.bancoCuenta || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Fecha:</Text>
                <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaTransferencia)}</Text>

                <Text style={styles.modalLabel}>Responsable:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.responsable || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(transferenciaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{transferenciaSeleccionada.estado || 'SUBIDA'}</Text>
                </View>

                {/* ✅ IMAGEN AMPLIADA EN MODAL CON MEJOR CALIDAD */}
                {transferenciaSeleccionada.tieneImagen && transferenciaSeleccionada.imagenComprobante && (
                  <View style={styles.modalImagenContainer}>
                    <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                    <Image
                      source={{ uri: transferenciaSeleccionada.imagenComprobante }}
                      style={styles.modalImagen}
                      resizeMode="contain"
                      resizeMethod="resize"
                      fadeDuration={0}
                      onError={() => console.log('⚠️ Error en imagen modal')}
                    />
                  </View>
                )}

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

            <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL PARA FOTO AMPLIADA - MEJOR CALIDAD */}
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
              onError={() => console.log('⚠️ Error en foto ampliada')}
            />
          )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
    paddingVertical: 4,
  },
  clearIcon: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
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
  transferenciaNombre: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
    fontWeight: '500',
  },
  transferenciaDocumento: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 6,
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
  // ✅ ESTILOS DE IMAGEN MEJORADOS
  imagenContainer: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  imagenMiniatura: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  imagenBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imagenBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
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
    width: '95%',
    maxHeight: '85%',
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
  modalImagenContainer: {
    marginTop: 10,
  },
  modalImagen: {
    width: '100%',
    height: 400,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  // ✅ ESTILOS PARA FOTO AMPLIADA
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