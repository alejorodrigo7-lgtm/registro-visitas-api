import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const CuadreCajas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  
  const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
  
  const [cuadres, setCuadres] = useState({
    TOLA: null,
    CHILIBULO: null,
    MAGDALENA: null,
  });
  
  const [modalIngresoVisible, setModalIngresoVisible] = useState(false);
  const [zonaIngreso, setZonaIngreso] = useState('TOLA');
  const [nuevoIngreso, setNuevoIngreso] = useState({
    tipo: 'OFICINA',
    monto: '',
    concepto: '',
  });
  
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [zonaPago, setZonaPago] = useState('TOLA');
  const [nuevoPago, setNuevoPago] = useState({
    motivo: 'EGRESO',
    monto: '',
    descripcion: '',
  });

  const [resumenVisible, setResumenVisible] = useState(false);
  const [resumenData, setResumenData] = useState([]);

  const tiposIngreso = ['OFICINA', 'EFECTIVO COORDINADOR', 'OTRO'];
  const motivosPago = ['EGRESO'];

  const formatFecha = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const formatFechaDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cargarCuadres = async () => {
    try {
      setLoading(true);
      const fecha = formatFecha(fechaSeleccionada);
      
      const resultados = {};
      
      for (const zona of zonas) {
        try {
          const response = await api.get(`/cajas/cuadre/${zona}/${fecha}`);
          resultados[zona] = response.data.data;
        } catch (error) {
          if (error.response?.status === 404) {
            resultados[zona] = null;
          } else {
            console.error(`Error cargando ${zona}:`, error);
            resultados[zona] = null;
          }
        }
      }
      
      setCuadres(resultados);
    } catch (error) {
      console.error('Error cargando cuadres:', error);
      Alert.alert('Error', 'No se pudieron cargar los cuadres');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const fecha = formatFecha(fechaSeleccionada);
      const response = await api.get(`/cajas/resumen/${fecha}`);
      setResumenData(response.data.data);
      setResumenVisible(true);
    } catch (error) {
      console.error('Error cargando resumen:', error);
      Alert.alert('Error', 'No se pudo cargar el resumen');
    }
  };

  const agregarIngreso = async () => {
    if (!nuevoIngreso.monto || parseFloat(nuevoIngreso.monto) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      setLoading(true);
      const fecha = formatFecha(fechaSeleccionada);
      
      let cuadre = cuadres[zonaIngreso];
      if (!cuadre) {
        const response = await api.get(`/cajas/cuadre/${zonaIngreso}/${fecha}`);
        cuadre = response.data.data;
        setCuadres(prev => ({ ...prev, [zonaIngreso]: cuadre }));
      }
      
      const response = await api.post(`/cajas/cuadre/${cuadre._id}/ingreso`, {
        tipo: nuevoIngreso.tipo,
        monto: parseFloat(nuevoIngreso.monto),
        concepto: nuevoIngreso.concepto || '',
      });

      if (response.data.success) {
        setCuadres(prev => ({ ...prev, [zonaIngreso]: response.data.data }));
        setModalIngresoVisible(false);
        setNuevoIngreso({ tipo: 'OFICINA', monto: '', concepto: '' });
        Alert.alert('Éxito', 'Ingreso agregado correctamente');
      }
    } catch (error) {
      console.error('Error agregando ingreso:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al agregar ingreso');
    } finally {
      setLoading(false);
    }
  };

  const agregarPago = async () => {
    if (!nuevoPago.monto || parseFloat(nuevoPago.monto) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    if (!nuevoPago.descripcion || nuevoPago.descripcion.trim() === '') {
      Alert.alert('Error', 'Debes escribir una descripción para el egreso');
      return;
    }

    try {
      setLoading(true);
      const fecha = formatFecha(fechaSeleccionada);
      
      let cuadre = cuadres[zonaPago];
      if (!cuadre) {
        const response = await api.get(`/cajas/cuadre/${zonaPago}/${fecha}`);
        cuadre = response.data.data;
        setCuadres(prev => ({ ...prev, [zonaPago]: cuadre }));
      }
      
      const response = await api.post(`/cajas/cuadre/${cuadre._id}/pago`, {
        motivo: 'EGRESO',
        monto: parseFloat(nuevoPago.monto),
        descripcion: nuevoPago.descripcion.trim(),
      });

      if (response.data.success) {
        setCuadres(prev => ({ ...prev, [zonaPago]: response.data.data }));
        setModalPagoVisible(false);
        setNuevoPago({ motivo: 'EGRESO', monto: '', descripcion: '' });
        Alert.alert('Éxito', 'Egreso agregado correctamente');
      }
    } catch (error) {
      console.error('Error agregando egreso:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al agregar egreso');
    } finally {
      setLoading(false);
    }
  };

  const cerrarCuadre = async (zona) => {
    const cuadre = cuadres[zona];
    if (!cuadre) {
      Alert.alert('Error', 'No hay cuadre para esta zona');
      return;
    }

    if (cuadre.cerrado) {
      Alert.alert('Info', 'Este cuadre ya está cerrado');
      return;
    }

    Alert.alert(
      'Cerrar Cuadre',
      `¿Estás seguro de cerrar el cuadre de ${zona} para el día ${formatFechaDisplay(fechaSeleccionada)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.put(`/cajas/cuadre/${cuadre._id}/cerrar`);
              if (response.data.success) {
                setCuadres(prev => ({ ...prev, [zona]: response.data.data }));
                Alert.alert('Éxito', `Cuadre de ${zona} cerrado correctamente`);
              }
            } catch (error) {
              console.error('Error cerrando cuadre:', error);
              Alert.alert('Error', error.response?.data?.message || 'Error al cerrar cuadre');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const enviarResumen = async () => {
    const fecha = formatFecha(fechaSeleccionada);
    
    Alert.alert(
      'Enviar Resumen',
      `¿Enviar resumen de caja para el día ${formatFechaDisplay(fechaSeleccionada)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await api.post('/cajas/cuadre/enviar-correo', { fecha });
              if (response.data.success) {
                Alert.alert('Éxito', 'Resumen enviado correctamente a alejorodrigo7@gmail.com');
              }
            } catch (error) {
              console.error('Error enviando resumen:', error);
              Alert.alert('Error', error.response?.data?.message || 'Error al enviar resumen');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const cambiarFecha = (event, selectedDate) => {
    setMostrarDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaSeleccionada(selectedDate);
      setTimeout(() => cargarCuadres(), 100);
    }
  };

  useEffect(() => {
    cargarCuadres();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarCuadres();
  };

  const renderZonaCard = (zona) => {
    const cuadre = cuadres[zona];
    const totalIngresos = cuadre?.ingresos?.reduce((sum, i) => sum + i.monto, 0) || 0;
    const totalPagos = cuadre?.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
    
    const coloresZona = {
      TOLA: { bg: '#E8F0FE', border: '#4A90D9' },
      CHILIBULO: { bg: '#E8F5E9', border: '#43A047' },
      MAGDALENA: { bg: '#FFF3E0', border: '#FF9800' },
    };

    return (
      <View key={zona} style={[styles.zonaCard, { borderLeftColor: coloresZona[zona].border }]}>
        <View style={styles.zonaCardHeader}>
          <Text style={styles.zonaCardTitle}>📍 {zona}</Text>
          {cuadre?.cerrado ? (
            <View style={styles.estadoCerrado}>
              <Text style={styles.estadoCerradoText}>✅ CERRADO</Text>
            </View>
          ) : (
            <View style={styles.estadoAbierto}>
              <Text style={styles.estadoAbiertoText}>🔓 ABIERTO</Text>
            </View>
          )}
        </View>

        {cuadre ? (
          <>
            <View style={styles.saldoContainer}>
              <View style={styles.saldoItem}>
                <Text style={styles.saldoLabel}>Saldo Inicial</Text>
                <Text style={styles.saldoValor}>${cuadre.saldoInicial?.toFixed(2) || '0.00'}</Text>
              </View>
              <View style={styles.saldoItem}>
                <Text style={styles.saldoLabel}>Saldo Disponible</Text>
                <Text style={[styles.saldoValor, styles.saldoDisponible]}>
                  ${cuadre.saldoDisponible?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>

            <View style={styles.resumenMovimientos}>
              <Text style={styles.resumenMovimientosText}>
                📥 Ingresos: <Text style={styles.montoVerde}>+${totalIngresos.toFixed(2)}</Text>
              </Text>
              <Text style={styles.resumenMovimientosText}>
                📤 Egresos: <Text style={styles.montoRojo}>-${totalPagos.toFixed(2)}</Text>
              </Text>
            </View>

            <View style={styles.botonesZona}>
              <TouchableOpacity
                style={[styles.btnZona, styles.btnIngresoZona]}
                onPress={() => {
                  setZonaIngreso(zona);
                  setModalIngresoVisible(true);
                }}
                disabled={cuadre?.cerrado}
              >
                <Text style={styles.btnZonaText}>📥 Ingreso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnZona, styles.btnPagoZona]}
                onPress={() => {
                  setZonaPago(zona);
                  setModalPagoVisible(true);
                }}
                disabled={cuadre?.cerrado}
              >
                <Text style={styles.btnZonaText}>📤 Egreso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnZona, styles.btnCerrarZona]}
                onPress={() => cerrarCuadre(zona)}
                disabled={cuadre?.cerrado}
              >
                <Text style={styles.btnZonaText}>🔒 Cerrar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ultimosMovimientos}>
              <Text style={styles.ultimosMovimientosTitle}>Últimos movimientos</Text>
              {cuadre.ingresos?.slice(-3).map((item, index) => (
                <Text key={`i-${index}`} style={styles.movimientoText}>
                  📥 +${item.monto.toFixed(2)} - {item.tipo} {item.concepto ? `(${item.concepto})` : ''}
                </Text>
              ))}
              {cuadre.pagos?.slice(-3).map((item, index) => (
                <Text key={`p-${index}`} style={styles.movimientoText}>
                  📤 -${item.monto.toFixed(2)} - {item.descripcion || 'Sin descripción'}
                </Text>
              ))}
              {cuadre.ingresos?.length === 0 && cuadre.pagos?.length === 0 && (
                <Text style={styles.sinMovimientos}>Sin movimientos</Text>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.sinDatos}>No hay datos para esta zona</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando cuadres...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Cuadre de Caja</Text>
        </View>
        <TouchableOpacity onPress={() => setMostrarDatePicker(true)} style={styles.headerFecha}>
          <Text style={styles.headerFechaText}>{formatFechaDisplay(fechaSeleccionada)}</Text>
          <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {mostrarDatePicker && (
        <DateTimePicker
          value={fechaSeleccionada}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={cambiarFecha}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {zonas.map((zona) => renderZonaCard(zona))}

        <View style={styles.accionesGlobales}>
          <TouchableOpacity
            style={[styles.btnGlobal, styles.btnResumen]}
            onPress={cargarResumen}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.btnGlobalText}>📋 Ver Resumen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnGlobal, styles.btnEnviar]}
            onPress={enviarResumen}
          >
            <Ionicons name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.btnGlobalText}>📧 Enviar Resumen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de ingreso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalIngresoVisible}
        onRequestClose={() => setModalIngresoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📥 Agregar Ingreso - {zonaIngreso}</Text>

            <Text style={styles.modalLabel}>Tipo de Ingreso</Text>
            <View style={styles.pickerContainer}>
              {tiposIngreso.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.pickerOption,
                    nuevoIngreso.tipo === tipo && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setNuevoIngreso({ ...nuevoIngreso, tipo })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    nuevoIngreso.tipo === tipo && styles.pickerOptionTextSelected,
                  ]}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Monto ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoIngreso.monto}
              onChangeText={(text) => setNuevoIngreso({ ...nuevoIngreso, monto: text })}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Concepto (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoIngreso.concepto}
              onChangeText={(text) => setNuevoIngreso({ ...nuevoIngreso, concepto: text })}
              placeholder="Descripción del ingreso"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setModalIngresoVisible(false);
                  setNuevoIngreso({ tipo: 'OFICINA', monto: '', concepto: '' });
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={agregarIngreso}
              >
                <Text style={styles.modalButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de egreso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPagoVisible}
        onRequestClose={() => setModalPagoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📤 Agregar Egreso - {zonaPago}</Text>

            <Text style={styles.modalLabel}>Motivo</Text>
            <View style={styles.motivoDisplay}>
              <Text style={styles.motivoDisplayText}>💸 EGRESO</Text>
            </View>

            <Text style={styles.modalLabel}>Monto ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoPago.monto}
              onChangeText={(text) => setNuevoPago({ ...nuevoPago, monto: text })}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Descripción / Nota *</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={nuevoPago.descripcion}
              onChangeText={(text) => setNuevoPago({ ...nuevoPago, descripcion: text })}
              placeholder="Escribe el motivo del egreso..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setModalPagoVisible(false);
                  setNuevoPago({ motivo: 'EGRESO', monto: '', descripcion: '' });
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={agregarPago}
              >
                <Text style={styles.modalButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de resumen */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resumenVisible}
        onRequestClose={() => setResumenVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Resumen del Día</Text>
              <TouchableOpacity onPress={() => setResumenVisible(false)}>
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {resumenData.map((item) => (
                <View key={item.zona} style={styles.resumenItemCard}>
                  <Text style={styles.resumenItemTitle}>📍 {item.zona}</Text>
                  <Text style={styles.resumenItemText}>
                    Saldo Inicial: ${item.saldoInicial?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.resumenItemText}>
                    Ingresos: <Text style={styles.montoVerde}>+${item.totalIngresos?.toFixed(2) || '0.00'}</Text>
                  </Text>
                  <Text style={styles.resumenItemText}>
                    Egresos: <Text style={styles.montoRojo}>-${item.totalPagos?.toFixed(2) || '0.00'}</Text>
                  </Text>
                  <Text style={[styles.resumenItemText, styles.resumenItemTotal]}>
                    Saldo Disponible: ${item.saldoDisponible?.toFixed(2) || '0.00'}
                  </Text>
                  <Text style={styles.resumenItemEstado}>
                    {item.cerrado ? '✅ CERRADO' : '🔓 ABIERTO'}
                  </Text>
                </View>
              ))}
            </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  headerFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerFechaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  zonaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  zonaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  zonaCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoCerrado: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoCerradoText: {
    color: '#43A047',
    fontSize: 12,
    fontWeight: 'bold',
  },
  estadoAbierto: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoAbiertoText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saldoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saldoItem: {
    flex: 1,
  },
  saldoLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  saldoValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  saldoDisponible: {
    color: '#6C5CE7',
    fontSize: 20,
  },
  resumenMovimientos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  resumenMovimientosText: {
    fontSize: 14,
    color: '#2D3436',
  },
  montoVerde: {
    color: '#00B894',
    fontWeight: 'bold',
  },
  montoRojo: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  botonesZona: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  btnZona: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnIngresoZona: {
    backgroundColor: '#00B894',
  },
  btnPagoZona: {
    backgroundColor: '#FF6B6B',
  },
  btnCerrarZona: {
    backgroundColor: '#6C5CE7',
  },
  btnZonaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ultimosMovimientos: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  ultimosMovimientosTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 4,
  },
  movimientoText: {
    fontSize: 12,
    color: '#2D3436',
    marginVertical: 1,
  },
  sinMovimientos: {
    fontSize: 12,
    color: '#B2BEC3',
    textAlign: 'center',
    marginTop: 4,
  },
  sinDatos: {
    textAlign: 'center',
    color: '#B2BEC3',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  accionesGlobales: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  btnGlobal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnResumen: {
    backgroundColor: '#6C5CE7',
  },
  btnEnviar: {
    backgroundColor: '#0984E3',
  },
  btnGlobalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  motivoDisplay: {
    backgroundColor: '#E8F0FE',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6C5CE7',
    marginBottom: 10,
  },
  motivoDisplayText: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  pickerOptionSelected: {
    backgroundColor: '#6C5CE7',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#2D3436',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#DFE6E9',
  },
  modalButtonConfirm: {
    backgroundColor: '#6C5CE7',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumenItemCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  resumenItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  resumenItemText: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  resumenItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginTop: 4,
  },
  resumenItemEstado: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default CuadreCajas;