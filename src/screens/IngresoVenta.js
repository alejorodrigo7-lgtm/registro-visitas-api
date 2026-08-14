// ra2p-nuevo/src/screens/IngresoVenta.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

const IngresoVenta = ({ navigation }) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ventas/ventas`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setVentas(response.data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarVentas();
  };

  const toggleIngreso = async (id, currentEstado) => {
    setUpdating(id);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/ventas/venta/${id}/ingreso`,
        { ingresada: !currentEstado },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      setVentas(ventas.map(v => 
        v._id === id ? { ...v, ingresada: !currentEstado } : v
      ));
    } catch (error) {
      console.error('Error al actualizar:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setUpdating(null);
    }
  };

  const renderVenta = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>
            {item.usuario?.nombre || 'Usuario'}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.fecha).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </Text>
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {item.ingresada ? 'Ingresada' : 'Pendiente'}
          </Text>
          <Switch
            value={item.ingresada}
            onValueChange={() => toggleIngreso(item._id, item.ingresada)}
            disabled={updating === item._id}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={item.ingresada ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>Plan: {item.plan}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>{item.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#888" />
          <Text style={styles.cardDetail}>{item.telefono1} - {item.telefono2}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#888" />
          <Text style={[styles.cardDetail, styles.addressText]} numberOfLines={2}>
            {item.direccionCompleta}
          </Text>
        </View>
      </View>

      <View style={styles.badgeContainer}>
        <View style={[styles.badge, item.ingresada ? styles.badgeSuccess : styles.badgeWarning]}>
          <Text style={styles.badgeText}>
            {item.ingresada ? '✓ Ingresada' : '⏳ Pendiente'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </View>
    );
  }

  const pendientes = ventas.filter(v => !v.ingresada).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D4A574" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ingreso de Ventas</Text>
        <View style={styles.headerRight}>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{pendientes}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Total: {ventas.length} | Pendientes: {pendientes}
        </Text>
      </View>

      <FlatList
        data={ventas}
        renderItem={renderVenta}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color="#444" />
            <Text style={styles.emptyText}>No hay ventas registradas</Text>
          </View>
        }
      />
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
    backgroundColor: '#4CAF50',
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
  switchContainer: {
    alignItems: 'flex-end',
  },
  switchLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
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
    flex: 1,
  },
  addressText: {
    flex: 1,
  },
  badgeContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(76,175,80,0.15)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(255,193,7,0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFF',
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
  emptyText: {
    color: '#444',
    fontSize: 16,
    marginTop: 12,
  },
});

export default IngresoVenta;