import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

  // FILTRO POR FECHA
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);

  // FILTRO POR BANCO
  const [bancoSeleccionado, setBancoSeleccionado] = useState('TODOS');
  const [mostrarFiltroBanco, setMostrarFiltroBanco] = useState(false);
  const [bancosDisponibles, setBancosDisponibles] = useState([]);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  const cargarTransferencias = async () => {
    try {
      const response = await api.get('/transferencias/estado/SUBIDA');
      const data = response.data.data || [];
      setTransferencias(data);
      setTransferenciasFiltradas(data);

      // Extraer bancos unicos
      const bancosUnicos = [...new Set(data.map(t => t.bancoCuenta).filter(Boolean))];
      bancosUnicos.sort();
      setBancosDisponibles(bancosUnicos);
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

  // ✅ FUNCIÓN PARA OBTENER LA IMAGEN
  const getImagen = (item) => {
    // ? PRIORIDAD 1: imagenComprobante
    if (item.imagenComprobante) {
      const img = item.imagenComprobante;
      // Es URL de Cloudinary/HTTP
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      }
      // Es Base64 con prefijo
      if (img.startsWith('data:image')) {
        return img;
      }
      // Es Base64 sin prefijo (largo > 100)
      if (img.length > 100) {
        return img;
      }
    }
    
    // ? PRIORIDAD 2: soporte (solo si es URL o Base64 válido)
    if (item.soporte) {
      const sop = item.soporte;
      // Es URL de Cloudinary/HTTP
      if (sop.startsWith('http://') || sop.startsWith('https://')) {
        return sop;
      }
      // Es Base64 con prefijo
      if (sop.startsWith('data:image')) {
        return sop;
      }
      // Es Base64 sin prefijo (largo > 100)
      if (sop.length > 100) {
        return sop;
      }
    }
    
    return null;
  };

  const getImagenUri = (imagenData) => {
    if (!imagenData) return null;
    if (imagenData.startsWith('http://') || imagenData.startsWith('https://')) return imagenData;
    if (imagenData.startsWith('data:image')) return imagenData;
    if (imagenData.length > 100) return `data:image/jpeg;base64,${imagenData}`;
    return null;
  };

  const tieneImagen = (item) => {
    return getImagen(item) !== null;
  };

  // FILTRO POR FECHA
  const aplicarFiltroFecha = (inicio, fin) => {
    // Delegar a la funcion combinada que respeta tambien el filtro de banco
    aplicarFiltrosCombinados(inicio, fin, bancoSeleccionado);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setFechaInicio(selectedDate);
        aplicarFiltroFecha(selectedDate, fechaFin);
      } else {
        setFechaFin(selectedDate);
        aplicarFiltroFecha(fechaInicio, selectedDate);
      }
    }
  };

  const abrirDatePicker = (modo) => {
    setDatePickerMode(modo);
    setShowDatePicker(true);
  };

  const limpiarFiltroFecha = () => {
    setFechaInicio(null);
    setFechaFin(null);
    // Respetar el filtro de banco activo
    aplicarFiltrosCombinados(null, null, bancoSeleccionado);
  };

  const hayFiltroFecha = fechaInicio !== null || fechaFin !== null;

  const formatFechaFiltro = (fecha) => {
    if (!fecha) return 'Seleccionar';
    return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // FILTRO POR BANCO
  const aplicarFiltrosCombinados = (inicio, fin, banco) => {
    let filtradas = [...transferencias];
    
    if (inicio) {
      const inicioDate = new Date(inicio);
      inicioDate.setHours(0, 0, 0, 0);
      filtradas = filtradas.filter(t => {
        const fecha = new Date(t.fechaTransferencia || t.createdAt);
        return fecha >= inicioDate;
      });
    }
    
    if (fin) {
      const finDate = new Date(fin);
      finDate.setHours(23, 59, 59, 999);
      filtradas = filtradas.filter(t => {
        const fecha = new Date(t.fechaTransferencia || t.createdAt);
        return fecha <= finDate;
      });
    }
    
    if (banco && banco !== 'TODOS') {
      filtradas = filtradas.filter(t => t.bancoCuenta === banco);
    }
    
    setTransferenciasFiltradas(filtradas);
  };

  const seleccionarBanco = (banco) => {
    setBancoSeleccionado(banco);
    setMostrarFiltroBanco(false);
    aplicarFiltrosCombinados(fechaInicio, fechaFin, banco);
  };

  const limpiarFiltroBanco = () => {
    setBancoSeleccionado('TODOS');
    aplicarFiltrosCombinados(fechaInicio, fechaFin, 'TODOS');
  };

  const hayFiltroBanco = bancoSeleccionado !== 'TODOS';

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
        <Text style={styles.transferenciaDocumento}>Doc: {item.numeroDocumento}</Text>

        {/* ✅ ZONA */}
        <View style={styles.zonaContainer}>
          <Text style={styles.zonaText}>📍 {item.zonaSector} - {item.barrio}</Text>
        </View>

        {/* ✅ NUEVO: BANCO Y CUENTA */}
        <View style={styles.bancoContainer}>
          <Text style={styles.bancoLabel}>🏦 Banco / Cuenta:</Text>
          <Text style={styles.bancoText}>{item.bancoCuenta}</Text>
        </View>

        <View style={styles.transferenciaFooter}>
          <Text style={styles.transferenciaInfo}>💰 {formatValor(item.valor)}</Text>
          <Text style={styles.transferenciaInfo}>📅 {formatFecha(item.fechaTransferencia)}</Text>
          <Text style={styles.transferenciaInfo}>👤 {item.responsable}</Text>
        </View>

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

      {/* FILTRO POR FECHA */}
      <View style={styles.filtroFechaContainer}>
        <View style={styles.filtroFechaRow}>
          <TouchableOpacity
            style={[styles.filtroFechaBtn, fechaInicio && styles.filtroFechaBtnActivo]}
            onPress={() => abrirDatePicker('start')}
          >
            <Text style={styles.filtroFechaLabel}>Desde:</Text>
            <Text style={styles.filtroFechaValor}>{formatFechaFiltro(fechaInicio)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroFechaBtn, fechaFin && styles.filtroFechaBtnActivo]}
            onPress={() => abrirDatePicker('end')}
          >
            <Text style={styles.filtroFechaLabel}>Hasta:</Text>
            <Text style={styles.filtroFechaValor}>{formatFechaFiltro(fechaFin)}</Text>
          </TouchableOpacity>

          {hayFiltroFecha && (
            <TouchableOpacity
              style={styles.filtroFechaClear}
              onPress={limpiarFiltroFecha}
            >
              <Text style={styles.filtroFechaClearText}>X</Text>
            </TouchableOpacity>
          )}
        </View>

        {hayFiltroFecha && (
          <Text style={styles.filtroFechaInfo}>
            Mostrando {transferenciasFiltradas.length} de {transferencias.length} transferencias
          </Text>
        )}
      </View>

      {/* FILTRO POR BANCO */}
      <View style={styles.filtroBancoContainer}>
        <TouchableOpacity
          style={[styles.filtroBancoBtn, hayFiltroBanco && styles.filtroBancoBtnActivo]}
          onPress={() => setMostrarFiltroBanco(!mostrarFiltroBanco)}
        >
          <Text style={[styles.filtroBancoBtnText, hayFiltroBanco && styles.filtroBancoBtnTextActivo]}>
            🏦 {hayFiltroBanco ? bancoSeleccionado : 'Banco / Cuenta'}
          </Text>
          {hayFiltroBanco && (
            <TouchableOpacity onPress={limpiarFiltroBanco} style={styles.filtroBancoClear}>
              <Text style={styles.filtroBancoClearText}>X</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {mostrarFiltroBanco && (
          <ScrollView style={styles.filtroBancoLista} nestedScrollEnabled>
            <TouchableOpacity
              style={[styles.filtroBancoItem, bancoSeleccionado === 'TODOS' && styles.filtroBancoItemActivo]}
              onPress={() => seleccionarBanco('TODOS')}
            >
              <Text style={[styles.filtroBancoItemText, bancoSeleccionado === 'TODOS' && styles.filtroBancoItemTextActivo]}>
                🌐 Todos los bancos
              </Text>
            </TouchableOpacity>
            {bancosDisponibles.map((banco) => (
              <TouchableOpacity
                key={banco}
                style={[styles.filtroBancoItem, bancoSeleccionado === banco && styles.filtroBancoItemActivo]}
                onPress={() => seleccionarBanco(banco)}
              >
                <Text style={[styles.filtroBancoItemText, bancoSeleccionado === banco && styles.filtroBancoItemTextActivo]}>
                  🏦 {banco}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerMode === 'start'
              ? (fechaInicio || new Date())
              : (fechaFin || new Date())
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {transferenciasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay transferencias pendientes</Text>
          </View>
        ) : (
          transferenciasFiltradas.map(renderTransferencia)
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* ✅ MODAL DE DETALLE */}
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
                <Text style={styles.modalLabel}>C</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.codigoIdentificador}</Text>

                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.nombreUsuario}</Text>

                <Text style={styles.modalLabel}>Documento:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.numeroDocumento}</Text>

                <Text style={styles.modalLabel}>Valor:</Text>
                <Text style={styles.modalValue}>{formatValor(transferenciaSeleccionada.valor)}</Text>

                <Text style={styles.modalLabel}>Zona / Barrio:</Text>
                <Text style={styles.modalValue}>
                  📍 {transferenciaSeleccionada.zonaSector} - {transferenciaSeleccionada.barrio}
                </Text>

                {/* ✅ BANCO Y CUENTA */}
                <Text style={styles.modalLabel}>🏦 Banco / Cuenta:</Text>
                <View style={styles.modalBancoContainer}>
                  <Text style={styles.modalBancoText}>
                    {transferenciaSeleccionada.bancoCuenta}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Fecha:</Text>
                <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaTransferencia)}</Text>

                <Text style={styles.modalLabel}>Responsable:</Text>
                <Text style={styles.modalValue}>{transferenciaSeleccionada.responsable}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(transferenciaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{transferenciaSeleccionada.estado}</Text>
                </View>

                {/* IMAGEN DEL COMPROBANTE */}
                {(() => {
                  const imagenData = getImagen(transferenciaSeleccionada);
                  if (imagenData) {
                    return (
                      <View style={styles.imagenContainer}>
                        <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                        <Image
                          source={{
                            uri: getImagenUri(imagenData)
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
  filtroFechaContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroFechaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filtroFechaBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  filtroFechaBtnActivo: {
    backgroundColor: '#6C5CE720',
    borderColor: '#6C5CE7',
  },
  filtroFechaLabel: {
    fontSize: 11,
    color: '#636E72',
    marginBottom: 2,
  },
  filtroFechaValor: {
    fontSize: 13,
    color: '#2D3436',
    fontWeight: '600',
  },
  filtroFechaClear: {
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtroFechaClearText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filtroFechaInfo: {
    marginTop: 8,
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  filtroBancoContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroBancoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  filtroBancoBtnActivo: {
    backgroundColor: '#6C5CE720',
    borderColor: '#6C5CE7',
  },
  filtroBancoBtnText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
    flex: 1,
  },
  filtroBancoBtnTextActivo: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  filtroBancoClear: {
    backgroundColor: '#6C5CE7',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filtroBancoClearText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtroBancoLista: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    maxHeight: 250,
  },
  filtroBancoItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroBancoItemActivo: {
    backgroundColor: '#6C5CE720',
  },
  filtroBancoItemText: {
    fontSize: 13,
    color: '#2D3436',
  },
  filtroBancoItemTextActivo: {
    color: '#6C5CE7',
    fontWeight: '600',
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
    marginBottom: 6,
    fontWeight: '500',
  },
  transferenciaDocumento: {
    fontSize: 13,
    color: '#0984E3',
    fontWeight: '500',
    marginBottom: 6,
  },

  // ✅ ZONA
  zonaContainer: {
    marginBottom: 8,
  },
  zonaText: {
    fontSize: 13,
    color: '#6C5CE7',
    fontWeight: '500',
  },

  // ✅ BANCO Y CUENTA
  bancoContainer: {
    marginBottom: 8,
    backgroundColor: '#F0F4FF',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0984E3',
  },
  bancoLabel: {
    fontSize: 11,
    color: '#636E72',
    fontWeight: '500',
    marginBottom: 2,
  },
  bancoText: {
    fontSize: 13,
    color: '#0984E3',
    fontWeight: '600',
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

  // ✅ BANCO EN MODAL
  modalBancoContainer: {
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0984E3',
    marginBottom: 4,
  },
  modalBancoText: {
    fontSize: 15,
    color: '#0984E3',
    fontWeight: '600',
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



