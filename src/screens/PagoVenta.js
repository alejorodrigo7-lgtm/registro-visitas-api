// ra2p-nuevo/src/screens/PagoVenta.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { Picker } from '@react-native-picker/picker';

const PagoVenta = ({ navigation }) => {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [pagoData, setPagoData] = useState({
    valorPagado: '',
    responsable: '',
    formaPago: 'Efectivo',
  });

  useEffect(() => {
    cargarReportesPendientes();
  }, []);

  const cargarReportesPendientes = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ventas/reportes?pagado=false`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setReportes(response.data);
    } catch (error) {
      console.error('Error al cargar reportes:', error);
      Alert.alert('Error', 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarReportesPendientes();
  };

  const abrirModalPago = (reporte) => {
    setSelectedReporte(reporte);
    setPagoData({
      valorPagado: reporte.valorPagar.toString(),
      responsable: '',
      formaPago: 'Efectivo',
    });
    setModalVisible(true);
  };

  const registrarPago = async () => {
    if (!pagoData.valorPagado || !pagoData.responsable) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (isNaN(Number(pagoData.valorPagado)) || Number(pagoData.valorPagado) <= 0) {
      Alert.alert('Error', 'El valor pagado debe ser un número positivo');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/ventas/reporte/${selectedReporte._id}/pago`,
        {
          valorPagado: Number(pagoData.valorPagado),
          responsable: pagoData.responsable,
          formaPago: pagoData.formaPago,
        },
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      Alert.alert('✅ Éxito', 'Pago registrado correctamente');
      setModalVisible(false);
      setSelectedReporte(null);
      cargarReportesPendientes();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al registrar el pago');
    }
  };

  const formasPago = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];

  const renderReporte = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => abrirModalPago(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {item.usuario?.nombre || 'Usuario'}
        </Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Pendiente</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>Código: {item.codigo}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>Producto: {item.producto}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#888" />
          <Text style={[styles.cardDetail, styles.valorText]}>
            Valor a Pagar: ${item.valorPagar.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>
            {new Date(item.fechaVenta).toLocaleDateString('es-ES')}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.pagarText}>👆 Toca para registrar pago</Text>
        <Ionicons name="arrow-forward-circle" size={20} color="#4CAF50" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando reportes pendientes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D4A574" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago de Ventas</Text>
        <View style={styles.headerRight}>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{reportes.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Pendientes de pago: {reportes.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {reportes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.emptyTitle}>¡Sin pendientes!</Text>
            <Text style={styles.emptyText}>No hay reportes pendientes de pago</Text>
          </View>
        ) : (
          reportes.map((item) => (
            <View key={item._id}>
              {renderReporte({ item })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Pago */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Pago</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedReporte && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Cliente:</Text>
                  <Text style={styles.modalInfoValue}>{selectedReporte.usuario?.nombre}</Text>
                  <Text style={styles.modalInfoLabel}>Producto:</Text>
                  <Text style={styles.modalInfoValue}>{selectedReporte.producto}</Text>
                  <Text style={styles.modalInfoLabel}>Valor a Pagar:</Text>
                  <Text style={[styles.modalInfoValue, styles.modalValor]}>
                    ${selectedReporte.valorPagar.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>💰 Valor Pagado *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={pagoData.valorPagado}
                    onChangeText={(text) => setPagoData({ ...pagoData, valorPagado: text })}
                    placeholder="0.00"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>👤 Responsable *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={pagoData.responsable}
                    onChangeText={(text) => setPagoData({ ...pagoData, responsable: text })}
                    placeholder="Nombre del responsable"
                    placeholderTextColor="#444"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>💳 Forma de Pago *</Text>
                  <View style={styles.modalPickerContainer}>
                    <Picker
                      selectedValue={pagoData.formaPago}
                      onValueChange={(itemValue) => setPagoData({ ...pagoData, formaPago: itemValue })}
                      style={styles.modalPicker}
                      dropdownIconColor="#D4A574"
                      itemStyle={styles.modalPickerItem}
                    >
                      {formasPago.map((forma) => (
                        <Picker.Item key={forma} label={forma} value={forma} color="#FFF" />
                      ))}
                    </Picker>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalSubmitButton}
                  onPress={registrarPago}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.modalSubmitText}>Registrar Pago</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,165,116,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  badgeCount: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statsText: {
    color: '#888',
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#FF9800',
    fontSize: 10,
    fontWeight: '500',
  },
  cardBody: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDetail: {
    fontSize: 13,
    color: '#CCC',
  },
  valorText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  pagarText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D1A',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
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
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalClose: {
    padding: 4,
  },
  modalInfo: {
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  modalInfoValue: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 4,
  },
  modalValor: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalInputContainer: {
    marginBottom: 12,
  },
  modalLabel: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalPickerContainer: {
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalPicker: {
    color: '#FFF',
    height: 50,
  },
  modalPickerItem: {
    color: '#FFF',
    backgroundColor: '#0D0D1A',
  },
  modalSubmitButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PagoVenta;