// ra2p-nuevo/src/screens/BuscarVentasPagadas.js
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
  Image,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const BuscarVentasPagadas = ({ navigation }) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [filtros, setFiltros] = useState({
    fechaInicio: null,
    fechaFin: null,
    producto: '',
    usuario: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(null);
  const [productos] = useState(['', 'TV', 'Internet', 'Duo']);

  useEffect(() => {
    cargarVentasPagadas();
  }, []);

  const cargarVentasPagadas = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      let url = `${API_URL}/api/ventas/ventas-pagadas`;
      const params = new URLSearchParams();
      
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio.toISOString().split('T')[0]);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin.toISOString().split('T')[0]);
      if (filtros.producto) params.append('producto', filtros.producto);
      if (filtros.usuario) params.append('usuario', filtros.usuario);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setVentas(response.data);
    } catch (error) {
      console.error('Error al cargar ventas pagadas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ventas pagadas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarVentasPagadas();
  };

  const aplicarFiltros = () => {
    cargarVentasPagadas();
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: null,
      fechaFin: null,
      producto: '',
      usuario: '',
    });
    setTimeout(() => cargarVentasPagadas(), 100);
  };

  const verDetalle = (venta) => {
    setSelectedVenta(venta);
    setModalVisible(true);
  };

  const renderVenta = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => verDetalle(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>
            {item.usuario?.nombre || 'Usuario'}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.fechaVenta).toLocaleDateString('es-ES')}
          </Text>
        </View>
        <View style={styles.pagadoBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.pagadoBadgeText}>Pagado</Text>
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
            Pagado: ${item.pagoInfo?.valorPagado?.toFixed(2) || '0.00'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>Responsable: {item.pagoInfo?.responsable || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>Forma: {item.pagoInfo?.formaPago || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando ventas pagadas...</Text>
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
        <Text style={styles.headerTitle}>Ventas Pagadas</Text>
        <View style={styles.headerRight}>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{ventas.length}</Text>
          </View>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtrosRow}>
            <TouchableOpacity 
              style={styles.filtroButton}
              onPress={() => setShowDatePicker('inicio')}
            >
              <Ionicons name="calendar" size={16} color="#D4A574" />
              <Text style={styles.filtroButtonText}>
                {filtros.fechaInicio ? filtros.fechaInicio.toLocaleDateString('es-ES') : 'Desde'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.filtroButton}
              onPress={() => setShowDatePicker('fin')}
            >
              <Ionicons name="calendar" size={16} color="#D4A574" />
              <Text style={styles.filtroButtonText}>
                {filtros.fechaFin ? filtros.fechaFin.toLocaleDateString('es-ES') : 'Hasta'}
              </Text>
            </TouchableOpacity>

            <View style={styles.filtroPickerContainer}>
              <Picker
                selectedValue={filtros.producto}
                onValueChange={(value) => setFiltros({ ...filtros, producto: value })}
                style={styles.filtroPicker}
                dropdownIconColor="#D4A574"
              >
                {productos.map((p) => (
                  <Picker.Item key={p || 'todos'} label={p || 'Todos'} value={p} color="#FFF" />
                ))}
              </Picker>
            </View>

            <TouchableOpacity style={styles.filtroAction} onPress={aplicarFiltros}>
              <Ionicons name="search" size={18} color="#2196F3" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.filtroAction} onPress={limpiarFiltros}>
              <Ionicons name="close-circle" size={18} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'inicio' ? (filtros.fechaInicio || new Date()) : (filtros.fechaFin || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              setFiltros({ 
                ...filtros, 
                [showDatePicker === 'inicio' ? 'fechaInicio' : 'fechaFin']: selectedDate 
              });
            }
            setShowDatePicker(null);
          }}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {ventas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#444" />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>No hay ventas pagadas con estos filtros</Text>
          </View>
        ) : (
          ventas.map((item) => (
            <View key={item._id}>
              {renderVenta({ item })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Detalle */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Pago</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedVenta && (
              <ScrollView>
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Cliente:</Text>
                    <Text style={styles.modalInfoValue}>{selectedVenta.usuario?.nombre}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Código:</Text>
                    <Text style={styles.modalInfoValue}>{selectedVenta.codigo}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Producto:</Text>
                    <Text style={styles.modalInfoValue}>{selectedVenta.producto}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Valor Pagado:</Text>
                    <Text style={[styles.modalInfoValue, styles.modalValor]}>
                      ${selectedVenta.pagoInfo?.valorPagado?.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Responsable:</Text>
                    <Text style={styles.modalInfoValue}>{selectedVenta.pagoInfo?.responsable}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Forma de Pago:</Text>
                    <Text style={styles.modalInfoValue}>{selectedVenta.pagoInfo?.formaPago}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Fecha de Pago:</Text>
                    <Text style={styles.modalInfoValue}>
                      {new Date(selectedVenta.pagoInfo?.fechaPago).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Fecha de Venta:</Text>
                    <Text style={styles.modalInfoValue}>
                      {new Date(selectedVenta.fechaVenta).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  {selectedVenta.ventaAsociada && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Venta Asociada:</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedVenta.ventaAsociada?.plan || 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
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
    backgroundColor: '#2196F3',
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
  filtrosContainer: {
    backgroundColor: '#1A1A2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  filtrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filtroButtonText: {
    color: '#CCC',
    fontSize: 12,
  },
  filtroPickerContainer: {
    backgroundColor: '#0D0D1A',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 100,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filtroPicker: {
    color: '#FFF',
    height: 36,
    width: 100,
  },
  filtroAction: {
    padding: 8,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pagadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pagadoBadgeText: {
    color: '#4CAF50',
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
    color: '#FFF',
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
    padding: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalInfoLabel: {
    color: '#888',
    fontSize: 13,
  },
  modalInfoValue: {
    color: '#FFF',
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  modalValor: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BuscarVentasPagadas;