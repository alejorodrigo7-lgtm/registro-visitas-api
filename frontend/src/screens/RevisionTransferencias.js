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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const { width } = Dimensions.get('window');

const RevisionTransferencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transferencias, setTransferencias] = useState([]);
  const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);

  // ✅ FILTROS OPCIONALES
  const [searchTerm, setSearchTerm] = useState('');
  const [zonasDisponibles, setZonasDisponibles] = useState([]);
  const [zonaSeleccionada, setZonaSeleccionada] = useState('TODAS');
  const [mostrarFiltroZona, setMostrarFiltroZona] = useState(false);

  // ✅ FILTRO POR FECHA
  const [mostrarFiltroFecha, setMostrarFiltroFecha] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');

  // ✅ NUEVO: FILTRO POR ESTADO
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('TODOS');
  const [mostrarFiltroEstado, setMostrarFiltroEstado] = useState(false);

  // ✅ ESTADOS DISPONIBLES
  const estadosDisponibles = [
    { valor: 'SUBIDA', label: '📤 Subida' },
    { valor: 'CONFIRMADA', label: '✅ Confirmada' },
    { valor: 'DENEGADA', label: '❌ Denegada' },
    { valor: 'INGRESADA', label: '💰 Ingresada' },
    { valor: 'EN_REVISION', label: '🔍 En Revisión' },
  ];

  // ✅ CARGAR TRANSFERENCIAS
  const cargarTransferencias = async () => {
    try {
      console.log('📡 Cargando transferencias...');

      const response = await api.get('/transferencias');
      const data = response.data.data || [];

      setTransferencias(data);
      setTransferenciasFiltradas(data);

      const zonasUnicas = [...new Set(data.map(t => t.zonaSector).filter(Boolean))];
      zonasUnicas.sort();
      setZonasDisponibles(zonasUnicas);

      console.log(`✅ ${data.length} transferencias cargadas`);

    } catch (error) {
      console.error('❌ Error al cargar transferencias:', error);
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

  // ✅ FILTRAR TRANSFERENCIAS (combina los 4 filtros opcionales)
  const aplicarFiltros = (texto, zona, fInicio, fFin, estado) => {
    let filtradas = [...transferencias];

    // 🔍 Filtro por texto
    if (texto && texto.trim() !== '') {
      const termino = texto.toLowerCase().trim();
      filtradas = filtradas.filter(t =>
        t.nombreUsuario?.toLowerCase().includes(termino) ||
        t.codigoIdentificador?.toLowerCase().includes(termino) ||
        t.numeroDocumento?.toLowerCase().includes(termino)
      );
    }

    // 📍 Filtro por zona
    if (zona && zona !== 'TODAS') {
      filtradas = filtradas.filter(t => t.zonaSector === zona);
    }

    // 📅 Filtro por fecha inicio
    if (fInicio) {
      const inicio = new Date(fInicio);
      inicio.setHours(0, 0, 0, 0);
      filtradas = filtradas.filter(t => {
        const fecha = new Date(t.fechaTransferencia || t.createdAt);
        return fecha >= inicio;
      });
    }

    // 📅 Filtro por fecha fin
    if (fFin) {
      const fin = new Date(fFin);
      fin.setHours(23, 59, 59, 999);
      filtradas = filtradas.filter(t => {
        const fecha = new Date(t.fechaTransferencia || t.createdAt);
        return fecha <= fin;
      });
    }

    // ✅ NUEVO: Filtro por estado
    if (estado && estado !== 'TODOS') {
      filtradas = filtradas.filter(t => t.estado === estado);
    }

    setTransferenciasFiltradas(filtradas);
  };

  // ✅ BUSCAR
  const buscarTransferencias = async () => {
    setBuscando(true);
    try {
      const params = [];
      if (searchTerm && searchTerm.trim()) params.push('search=' + encodeURIComponent(searchTerm.trim()));
      if (zonaSeleccionada && zonaSeleccionada !== 'TODAS') params.push('zona=' + encodeURIComponent(zonaSeleccionada));
      if (estadoSeleccionado && estadoSeleccionado !== 'TODOS') params.push('estado=' + encodeURIComponent(estadoSeleccionado));
      if (fechaInicio) params.push('fechaInicio=' + encodeURIComponent(fechaInicio.toISOString()));
      if (fechaFin) params.push('fechaFin=' + encodeURIComponent(fechaFin.toISOString()));
      const queryString = params.join('&');
      const url = queryString ? '/transferencias/buscar?' + queryString : '/transferencias/buscar';
      console.log('Buscando:', url);
      const response = await api.get(url);
      const data = response.data.data || [];
      setTransferenciasFiltradas(data);
      console.log('Encontradas:', data.length);
    } catch (error) {
      console.error('Error buscando:', error);
      Alert.alert('Error', 'No se pudo realizar la busqueda');
    } finally {
      setBuscando(false);
    }
  };

  // ✅ SELECCIONAR ZONA
  const seleccionarZona = (zona) => {
    setZonaSeleccionada(zona);
    // Re-ejecutar busqueda en backend con filtro de zona
    setTimeout(() => buscarTransferencias(), 100);
    setMostrarFiltroZona(false);
  };

  // ✅ SELECCIONAR ESTADO
  const seleccionarEstado = (estado) => {
    setEstadoSeleccionado(estado);
    // Re-ejecutar busqueda en backend con filtro de estado
    setTimeout(() => buscarTransferencias(), 100);
    setMostrarFiltroEstado(false);
  };

  // ✅ LIMPIAR FILTROS INDIVIDUALES
  const limpiarZona = () => {
    setZonaSeleccionada('TODAS');
    setTimeout(() => buscarTransferencias(), 100);
  };

  const limpiarFecha = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setTimeout(() => buscarTransferencias(), 100);
  };

  const limpiarEstado = () => {
    setEstadoSeleccionado('TODOS');
    setTimeout(() => buscarTransferencias(), 100);
  };

  // ✅ LIMPIAR TODOS LOS FILTROS
  const limpiarTodosFiltros = () => {
    setSearchTerm('');
    setZonaSeleccionada('TODAS');
    setFechaInicio(null);
    setFechaFin(null);
    setEstadoSeleccionado('TODOS');
    setTransferenciasFiltradas(transferencias);
  };

  // ✅ MANEJAR CAMBIO DE FECHA
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setFechaInicio(selectedDate);
        // Re-ejecutar con la nueva fecha
        setTimeout(() => buscarTransferencias(), 200);
      } else {
        setFechaFin(selectedDate);
        // Re-ejecutar con la nueva fecha
        setTimeout(() => buscarTransferencias(), 200);
      }
    }
  };

  const abrirDatePicker = (modo) => {
    setDatePickerMode(modo);
    setShowDatePicker(true);
  };

  // ✅ VERIFICAR SI HAY FILTROS ACTIVOS
  const hayFiltrosActivos =
    searchTerm.trim() !== '' ||
    zonaSeleccionada !== 'TODAS' ||
    fechaInicio !== null ||
    fechaFin !== null ||
    estadoSeleccionado !== 'TODOS';

  // ✅ COLORES Y LABELS
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

  const getEstadoFiltroLabel = (estado) => {
    if (estado === 'TODOS') return 'Estado';
    const found = estadosDisponibles.find(e => e.valor === estado);
    return found ? found.label : estado;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatValor = (valor) => `$${valor?.toFixed(2) || '0.00'}`;

  const getImagen = (item) => {
    if (item.imagenComprobante && item.imagenComprobante.length > 100) {
      return item.imagenComprobante;
    }
    if (item.soporte && item.soporte.length > 100) {
      return item.soporte;
    }
    return null;
  };

  const tieneImagen = (item) => getImagen(item) !== null;

  // ✅ RENDERIZAR TRANSFERENCIA
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

        <View style={styles.zonaContainer}>
          <Text style={styles.zonaText}>📍 {item.zonaSector} - {item.barrio}</Text>
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
        {buscando && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 4 }} />}
        {buscando && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 4 }} />}
        <Text style={styles.subtitle}>
          {transferenciasFiltradas.length} de {transferencias.length} transferencias
        </Text>
      </View>

      {/* ✅ BUSCADOR */}
      <View style={styles.buscadorContainer}>
        <TextInput
          style={styles.buscadorInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="🔍 Nombre, código o documento..."
          onSubmitEditing={buscarTransferencias}
        />
        <TouchableOpacity style={styles.buscadorButton} onPress={buscarTransferencias}>
          <Text style={styles.buscadorButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ FILTROS: ZONA, FECHA, ESTADO */}
      <View style={styles.filtrosContainer}>
        {/* Filtro por Zona */}
        <TouchableOpacity
          style={[styles.filtroButton, zonaSeleccionada !== 'TODAS' && styles.filtroButtonActivo]}
          onPress={() => {
            setMostrarFiltroZona(!mostrarFiltroZona);
            setMostrarFiltroFecha(false);
            setMostrarFiltroEstado(false);
          }}
        >
          <Text style={[styles.filtroButtonText, zonaSeleccionada !== 'TODAS' && styles.filtroButtonTextActivo]}>
            📍 {zonaSeleccionada === 'TODAS' ? 'Zona' : zonaSeleccionada}
          </Text>
          {zonaSeleccionada !== 'TODAS' && (
            <TouchableOpacity onPress={limpiarZona} style={styles.filtroClearBtn}>
              <Text style={styles.filtroClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Filtro por Fecha */}
        <TouchableOpacity
          style={[styles.filtroButton, (fechaInicio || fechaFin) && styles.filtroButtonActivo]}
          onPress={() => {
            setMostrarFiltroFecha(!mostrarFiltroFecha);
            setMostrarFiltroZona(false);
            setMostrarFiltroEstado(false);
          }}
        >
          <Text style={[styles.filtroButtonText, (fechaInicio || fechaFin) && styles.filtroButtonTextActivo]}>
            📅 Fecha
          </Text>
          {(fechaInicio || fechaFin) && (
            <TouchableOpacity onPress={limpiarFecha} style={styles.filtroClearBtn}>
              <Text style={styles.filtroClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* ✅ NUEVO: Filtro por Estado */}
        <TouchableOpacity
          style={[styles.filtroButton, estadoSeleccionado !== 'TODOS' && styles.filtroButtonActivo]}
          onPress={() => {
            setMostrarFiltroEstado(!mostrarFiltroEstado);
            setMostrarFiltroZona(false);
            setMostrarFiltroFecha(false);
          }}
        >
          <Text style={[styles.filtroButtonText, estadoSeleccionado !== 'TODOS' && styles.filtroButtonTextActivo]}>
            🏷️ {getEstadoFiltroLabel(estadoSeleccionado)}
          </Text>
          {estadoSeleccionado !== 'TODOS' && (
            <TouchableOpacity onPress={limpiarEstado} style={styles.filtroClearBtn}>
              <Text style={styles.filtroClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Limpiar todos */}
        {hayFiltrosActivos && (
          <TouchableOpacity style={styles.limpiarTodosButton} onPress={limpiarTodosFiltros}>
            <Text style={styles.limpiarTodosText}>🗑️ Limpiar todo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ LISTA DE ZONAS */}
      {mostrarFiltroZona && (
        <View style={styles.filtroDesplegable}>
          <ScrollView style={styles.filtroDesplegableScroll} nestedScrollEnabled>
            <TouchableOpacity
              style={[styles.filtroOpcion, zonaSeleccionada === 'TODAS' && styles.filtroOpcionActiva]}
              onPress={() => seleccionarZona('TODAS')}
            >
              <Text style={[styles.filtroOpcionText, zonaSeleccionada === 'TODAS' && styles.filtroOpcionTextActivo]}>
                🌐 Todas las zonas
              </Text>
            </TouchableOpacity>

            {zonasDisponibles.map((zona) => (
              <TouchableOpacity
                key={zona}
                style={[styles.filtroOpcion, zonaSeleccionada === zona && styles.filtroOpcionActiva]}
                onPress={() => seleccionarZona(zona)}
              >
                <Text style={[styles.filtroOpcionText, zonaSeleccionada === zona && styles.filtroOpcionTextActivo]}>
                  📍 {zona}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ✅ LISTA DE ESTADOS */}
      {mostrarFiltroEstado && (
        <View style={styles.filtroDesplegable}>
          <ScrollView style={styles.filtroDesplegableScroll} nestedScrollEnabled>
            <TouchableOpacity
              style={[styles.filtroOpcion, estadoSeleccionado === 'TODOS' && styles.filtroOpcionActiva]}
              onPress={() => seleccionarEstado('TODOS')}
            >
              <Text style={[styles.filtroOpcionText, estadoSeleccionado === 'TODOS' && styles.filtroOpcionTextActivo]}>
                🌐 Todos los estados
              </Text>
            </TouchableOpacity>

            {estadosDisponibles.map((estado) => (
              <TouchableOpacity
                key={estado.valor}
                style={[styles.filtroOpcion, estadoSeleccionado === estado.valor && styles.filtroOpcionActiva]}
                onPress={() => seleccionarEstado(estado.valor)}
              >
                <View style={styles.estadoOpcionRow}>
                  <View style={[styles.estadoColorDot, { backgroundColor: getEstadoColor(estado.valor) }]} />
                  <Text style={[styles.filtroOpcionText, estadoSeleccionado === estado.valor && styles.filtroOpcionTextActivo]}>
                    {estado.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ✅ SELECTOR DE FECHAS */}
      {mostrarFiltroFecha && (
        <View style={styles.fechaSelectorContainer}>
          <Text style={styles.fechaSelectorTitle}>📅 Filtrar por fecha</Text>

          <View style={styles.fechaBotonesRow}>
            <TouchableOpacity style={styles.fechaBoton} onPress={() => abrirDatePicker('start')}>
              <Text style={styles.fechaBotonLabel}>Desde:</Text>
              <Text style={styles.fechaBotonValor}>
                {fechaInicio ? formatFecha(fechaInicio) : 'Seleccionar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fechaBoton} onPress={() => abrirDatePicker('end')}>
              <Text style={styles.fechaBotonLabel}>Hasta:</Text>
              <Text style={styles.fechaBotonValor}>
                {fechaFin ? formatFecha(fechaFin) : 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fechaAccionesRow}>
            <TouchableOpacity style={styles.fechaAccionBtn} onPress={() => setMostrarFiltroFecha(false)}>
              <Text style={styles.fechaAccionText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fechaAccionBtn, styles.fechaAccionAplicar]}
              onPress={() => setMostrarFiltroFecha(false)}
            >
              <Text style={styles.fechaAccionTextAplicar}>✅ Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (fechaInicio || new Date()) : (fechaFin || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {/* ✅ LISTA DE TRANSFERENCIAS */}
      <ScrollView
        style={styles.listaContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {transferenciasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay transferencias</Text>
            <Text style={styles.emptySubText}>
              {hayFiltrosActivos
                ? 'No se encontraron transferencias con los filtros aplicados'
                : 'No hay transferencias registradas'}
            </Text>
            {hayFiltrosActivos && (
              <TouchableOpacity style={styles.emptyLimpiarBtn} onPress={limpiarTodosFiltros}>
                <Text style={styles.emptyLimpiarText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
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
                <Text style={styles.modalLabel}>Código:</Text>
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

                {transferenciaSeleccionada.notaDenegacion && (
                  <>
                    <Text style={styles.modalLabel}>Nota de Denegación:</Text>
                    <Text style={[styles.modalValue, { color: '#E74C3C' }]}>
                      {transferenciaSeleccionada.notaDenegacion}
                    </Text>
                  </>
                )}

                {(() => {
                  const imagenData = getImagen(transferenciaSeleccionada);
                  if (imagenData) {
                    return (
                      <View style={styles.imagenContainer}>
                        <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                        <Image
                          source={{ uri: imagenData }}
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

            <TouchableOpacity style={styles.modalCerrar} onPress={() => setModalVisible(false)}>
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
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
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
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  buscadorInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    marginRight: 8,
  },
  buscadorButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buscadorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    gap: 6,
  },
  filtroButtonActivo: {
    backgroundColor: '#6C5CE720',
    borderColor: '#6C5CE7',
  },
  filtroButtonText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  filtroButtonTextActivo: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  filtroClearBtn: {
    marginLeft: 4,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtroClearText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  limpiarTodosButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  limpiarTodosText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  filtroDesplegable: {
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    maxHeight: 220,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filtroDesplegableScroll: {
    maxHeight: 220,
  },
  filtroOpcion: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroOpcionActiva: {
    backgroundColor: '#6C5CE720',
  },
  filtroOpcionText: {
    fontSize: 14,
    color: '#2D3436',
  },
  filtroOpcionTextActivo: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  estadoOpcionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  estadoColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fechaSelectorContainer: {
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fechaSelectorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  fechaBotonesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  fechaBoton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  fechaBotonLabel: {
    fontSize: 11,
    color: '#636E72',
    marginBottom: 4,
  },
  fechaBotonValor: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '600',
  },
  fechaAccionesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fechaAccionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  fechaAccionAplicar: {
    backgroundColor: '#6C5CE7',
  },
  fechaAccionText: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '500',
  },
  fechaAccionTextAplicar: {
    fontSize: 14,
    color: '#FFFFFF',
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
  zonaContainer: {
    marginBottom: 8,
  },
  zonaText: {
    fontSize: 13,
    color: '#6C5CE7',
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
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  emptyLimpiarBtn: {
    marginTop: 15,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyLimpiarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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