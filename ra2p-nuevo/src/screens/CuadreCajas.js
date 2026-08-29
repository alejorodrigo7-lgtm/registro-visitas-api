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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const CuadreCajas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [zonaSeleccionada, setZonaSeleccionada] = useState('TOLA');
  
  const zonas = ['TOLA', 'CHILIBULO', 'MAGDALENA'];
  
  // Estado del cuadre
  const [cuadre, setCuadre] = useState({
    fecha: new Date().toISOString().split('T')[0],
    saldoInicial: 0,
    saldoDisponible: 0,
    ingresos: [],
    pagos: [],
  });
  
  // Estado para el modal de ingreso
  const [modalIngresoVisible, setModalIngresoVisible] = useState(false);
  const [nuevoIngreso, setNuevoIngreso] = useState({
    tipo: 'OFICINA',
    monto: '',
    concepto: '',
  });
  
  // Estado para el modal de pago
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    motivo: 'PAGO',
    monto: '',
    descripcion: '',
  });

  // Cargar cuadre del día para la zona seleccionada
  const cargarCuadre = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/cajas/cuadre/${zonaSeleccionada}/${today}`);
      
      if (response.data.success) {
        setCuadre(response.data.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No hay cuadre para hoy, crear uno nuevo con el saldo del día anterior
        await crearCuadre();
      } else {
        console.error('Error cargando cuadre:', error);
        Alert.alert('Error', 'No se pudo cargar el cuadre de caja');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Crear cuadre del día para la zona seleccionada
  const crearCuadre = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.post('/cajas/cuadre', {
        zona: zonaSeleccionada,
        fecha: today,
        saldoInicial: await obtenerSaldoAnterior() || 0,
      });
      
      if (response.data.success) {
        setCuadre(response.data.data);
      }
    } catch (error) {
      console.error('Error creando cuadre:', error);
      Alert.alert('Error', 'No se pudo crear el cuadre');
    }
  };

  // Obtener saldo del día anterior para la zona seleccionada
  const obtenerSaldoAnterior = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const fecha = yesterday.toISOString().split('T')[0];
      
      const response = await api.get(`/cajas/cuadre/${zonaSeleccionada}/${fecha}`);
      if (response.data.success) {
        return response.data.data.saldoDisponible || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  };

  // Cambiar de zona
  const cambiarZona = (zona) => {
    setZonaSeleccionada(zona);
    setTimeout(() => cargarCuadre(), 100);
  };

  // Agregar ingreso
  const agregarIngreso = async () => {
    if (!nuevoIngreso.monto || parseFloat(nuevoIngreso.monto) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      const response = await api.post(`/cajas/cuadre/${cuadre._id}/ingreso`, {
        tipo: nuevoIngreso.tipo,
        monto: parseFloat(nuevoIngreso.monto),
        concepto: nuevoIngreso.concepto || '',
      });

      if (response.data.success) {
        setCuadre(response.data.data);
        setModalIngresoVisible(false);
        setNuevoIngreso({ tipo: 'OFICINA', monto: '', concepto: '' });
        Alert.alert('Éxito', 'Ingreso registrado correctamente');
      }
    } catch (error) {
      console.error('Error agregando ingreso:', error);
      Alert.alert('Error', 'No se pudo registrar el ingreso');
    }
  };

  // Agregar pago
  const agregarPago = async () => {
    if (!nuevoPago.monto || parseFloat(nuevoPago.monto) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      const response = await api.post(`/cajas/cuadre/${cuadre._id}/pago`, {
        motivo: nuevoPago.motivo,
        monto: parseFloat(nuevoPago.monto),
        descripcion: nuevoPago.descripcion || '',
      });

      if (response.data.success) {
        setCuadre(response.data.data);
        setModalPagoVisible(false);
        setNuevoPago({ motivo: 'PAGO', monto: '', descripcion: '' });
        Alert.alert('Éxito', 'Pago registrado correctamente');
      }
    } catch (error) {
      console.error('Error agregando pago:', error);
      Alert.alert('Error', 'No se pudo registrar el pago');
    }
  };

  // Calcular totales
  const totalIngresos = cuadre.ingresos?.reduce((sum, i) => sum + i.monto, 0) || 0;
  const totalPagos = cuadre.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0;
  const saldoDisponible = (cuadre.saldoInicial || 0) + totalIngresos - totalPagos;

  // Generar PDF del cuadre
  const generarPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              h1 { color: #6C5CE7; text-align: center; }
              .zona-title { text-align: center; font-size: 24px; color: #2D3436; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #6C5CE7; color: white; }
              .total { font-weight: bold; font-size: 16px; }
              .disponible { font-size: 24px; color: #6C5CE7; font-weight: bold; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>📊 CUADRE DE CAJA</h1>
            <div class="zona-title">📍 ${zonaSeleccionada}</div>
            <p><strong>Fecha:</strong> ${cuadre.fecha}</p>
            <p><strong>Responsable:</strong> ${user?.nombre || 'N/A'}</p>
            
            <h2>💰 Resumen</h2>
            <table>
              <tr><td><strong>Saldo Inicial</strong></td><td>$${cuadre.saldoInicial?.toFixed(2) || '0.00'}</td></tr>
              <tr><td><strong>Total Ingresos</strong></td><td>$${totalIngresos.toFixed(2)}</td></tr>
              <tr><td><strong>Total Pagos</strong></td><td>$${totalPagos.toFixed(2)}</td></tr>
              <tr style="background-color: #f0f0f0;"><td><strong>Saldo Disponible</strong></td><td><strong>$${saldoDisponible.toFixed(2)}</strong></td></tr>
            </table>

            <h2>📥 Ingresos</h2>
            ${cuadre.ingresos?.length > 0 ? `
              <table>
                <tr><th>Tipo</th><th>Monto</th><th>Concepto</th><th>Hora</th></tr>
                ${cuadre.ingresos.map(i => `
                  <tr>
                    <td>${i.tipo}</td>
                    <td>$${i.monto.toFixed(2)}</td>
                    <td>${i.concepto || '-'}</td>
                    <td>${new Date(i.fecha).toLocaleTimeString()}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold;"><td>TOTAL INGRESOS</td><td>$${totalIngresos.toFixed(2)}</td><td></td><td></td></tr>
              </table>
            ` : '<p>No hay ingresos registrados</p>'}

            <h2>📤 Pagos</h2>
            ${cuadre.pagos?.length > 0 ? `
              <table>
                <tr><th>Motivo</th><th>Monto</th><th>Descripción</th><th>Hora</th></tr>
                ${cuadre.pagos.map(p => `
                  <tr>
                    <td>${p.motivo}</td>
                    <td>$${p.monto.toFixed(2)}</td>
                    <td>${p.descripcion || '-'}</td>
                    <td>${new Date(p.fecha).toLocaleTimeString()}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold;"><td>TOTAL PAGOS</td><td>$${totalPagos.toFixed(2)}</td><td></td><td></td></tr>
              </table>
            ` : '<p>No hay pagos registrados</p>'}

            <div class="disponible">
              SALDO DISPONIBLE: $${saldoDisponible.toFixed(2)}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Error', 'No se puede compartir el archivo');
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    }
  };

  useEffect(() => {
    cargarCuadre();
  }, [zonaSeleccionada]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarCuadre();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando cuadre de caja...</Text>
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
        <Text style={styles.headerDate}>{cuadre.fecha}</Text>
      </View>

      {/* Selector de Zona */}
      <View style={styles.zonaSelector}>
        {zonas.map((zona) => (
          <TouchableOpacity
            key={zona}
            style={[
              styles.zonaButton,
              zonaSeleccionada === zona && styles.zonaButtonActive,
            ]}
            onPress={() => cambiarZona(zona)}
          >
            <Text style={[
              styles.zonaButtonText,
              zonaSeleccionada === zona && styles.zonaButtonTextActive,
            ]}>📍 {zona}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Resumen */}
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitle}>💰 Resumen del Día - {zonaSeleccionada}</Text>
          
          <View style={styles.resumenRow}>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Saldo Inicial</Text>
              <Text style={styles.resumenMonto}>${cuadre.saldoInicial?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Total Ingresos</Text>
              <Text style={[styles.resumenMonto, styles.montoVerde]}>+${totalIngresos.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.resumenRow}>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Total Pagos</Text>
              <Text style={[styles.resumenMonto, styles.montoRojo]}>-${totalPagos.toFixed(2)}</Text>
            </View>
            <View style={styles.resumenItem}>
              <Text style={styles.resumenLabel}>Saldo Disponible</Text>
              <Text style={[styles.resumenMonto, styles.montoMorado]}>${saldoDisponible.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Botones de acción */}
        <View style={styles.accionesContainer}>
          <TouchableOpacity
            style={[styles.accionButton, styles.btnIngreso]}
            onPress={() => setModalIngresoVisible(true)}
          >
            <Ionicons name="arrow-down-circle" size={24} color="#FFFFFF" />
            <Text style={styles.accionButtonText}>Agregar Ingreso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.accionButton, styles.btnPago]}
            onPress={() => setModalPagoVisible(true)}
          >
            <Ionicons name="arrow-up-circle" size={24} color="#FFFFFF" />
            <Text style={styles.accionButtonText}>Agregar Pago</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de ingresos */}
        {cuadre.ingresos?.length > 0 && (
          <View style={styles.listaContainer}>
            <Text style={styles.listaTitle}>📥 Ingresos</Text>
            {cuadre.ingresos.map((item, index) => (
              <View key={index} style={styles.listaItem}>
                <View style={styles.listaItemLeft}>
                  <Text style={styles.listaItemTipo}>{item.tipo}</Text>
                  <Text style={styles.listaItemConcepto}>{item.concepto || 'Sin concepto'}</Text>
                </View>
                <Text style={styles.listaItemMontoVerde}>+${item.monto.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Lista de pagos */}
        {cuadre.pagos?.length > 0 && (
          <View style={styles.listaContainer}>
            <Text style={styles.listaTitle}>📤 Pagos</Text>
            {cuadre.pagos.map((item, index) => (
              <View key={index} style={styles.listaItem}>
                <View style={styles.listaItemLeft}>
                  <Text style={styles.listaItemTipo}>{item.motivo}</Text>
                  <Text style={styles.listaItemConcepto}>{item.descripcion || 'Sin descripción'}</Text>
                </View>
                <Text style={styles.listaItemMontoRojo}>-${item.monto.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.btnPDF}
          onPress={generarPDF}
        >
          <Ionicons name="document-text" size={20} color="#FFFFFF" />
          <Text style={styles.btnPDFText}>📄 Descargar Reporte PDF</Text>
        </TouchableOpacity>
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
            <Text style={styles.modalTitle}>📥 Agregar Ingreso - {zonaSeleccionada}</Text>

            <Text style={styles.modalLabel}>Tipo de Ingreso</Text>
            <View style={styles.pickerContainer}>
              {['OFICINA', 'EFECTIVO COORDINADOR', 'OTRO'].map((tipo) => (
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

      {/* Modal de pago */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPagoVisible}
        onRequestClose={() => setModalPagoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📤 Agregar Pago - {zonaSeleccionada}</Text>

            <Text style={styles.modalLabel}>Motivo de Pago</Text>
            <View style={styles.pickerContainer}>
              {['PAGO', 'OTRO'].map((motivo) => (
                <TouchableOpacity
                  key={motivo}
                  style={[
                    styles.pickerOption,
                    nuevoPago.motivo === motivo && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setNuevoPago({ ...nuevoPago, motivo })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    nuevoPago.motivo === motivo && styles.pickerOptionTextSelected,
                  ]}>{motivo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Monto ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoPago.monto}
              onChangeText={(text) => setNuevoPago({ ...nuevoPago, monto: text })}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Descripción (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoPago.descripcion}
              onChangeText={(text) => setNuevoPago({ ...nuevoPago, descripcion: text })}
              placeholder="Detalle del pago"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setModalPagoVisible(false);
                  setNuevoPago({ motivo: 'PAGO', monto: '', descripcion: '' });
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
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  zonaSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  zonaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  zonaButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  zonaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
  },
  zonaButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  resumenContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resumenTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  resumenItem: {
    flex: 1,
  },
  resumenLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  resumenMonto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  montoVerde: {
    color: '#00B894',
  },
  montoRojo: {
    color: '#FF6B6B',
  },
  montoMorado: {
    color: '#6C5CE7',
  },
  accionesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  accionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnIngreso: {
    backgroundColor: '#00B894',
  },
  btnPago: {
    backgroundColor: '#FF6B6B',
  },
  accionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  listaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  listaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listaItemLeft: {
    flex: 1,
  },
  listaItemTipo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  listaItemConcepto: {
    fontSize: 12,
    color: '#636E72',
  },
  listaItemMontoVerde: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00B894',
  },
  listaItemMontoRojo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  btnPDF: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 30,
  },
  btnPDFText: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 16,
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
});

export default CuadreCajas;