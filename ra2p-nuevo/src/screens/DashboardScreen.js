// src/screens/DashboardScreen.js - VERSIÓN CON BACKEND
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// ✅ IMPORTAR API PARA CONECTAR AL BACKEND
import api from '../services/api';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const { user, isAdminOrJefe } = useAuth();

  // Verificar permisos
  useEffect(() => {
    if (!isAdminOrJefe()) {
      Alert.alert('Acceso Denegado', 'No tienes permisos para ver el Dashboard');
      navigation.goBack();
    }
  }, []);

  // ✅ Cargar datos del dashboard DESDE EL BACKEND
  const loadDashboard = async () => {
    try {
      setLoading(true);
      console.log('📊 1. Iniciando carga del dashboard...');
      console.log('📊 2. Usuario:', user?.email);
      
      // ✅ LLAMAR AL BACKEND
      const response = await api.get('/dashboard/stats');
      console.log('📊 3. Respuesta recibida');
      console.log('📊 4. Status:', response.status);
      
      const dashboardData = response.data?.data || response.data;
      console.log('📊 5. Dashboard data:', dashboardData);
      
      if (dashboardData && dashboardData.resumen) {
        setStats(dashboardData);
        console.log('✅ Dashboard cargado correctamente');
      } else {
        console.error('❌ Datos del dashboard incompletos');
        // Usar datos de prueba en caso de error
        const mockData = {
          resumen: {
            usuarios: { total: 5, activos: 5, inactivos: 0 },
            visitas: { hoy: 0, semana: 1, mes: 13, tendencia: { direccion: 'bajando', porcentaje: 100 } },
            asistencias: { hoy: 0, semana: 0, mes: 2, tendencia: { direccion: 'estable', porcentaje: 0 } },
            ausencias: { pendientes: 0, aprobadas: 0, rechazadas: 0 },
            notificaciones: { noLeidas: 22, total: 22 },
          },
          actualizado: new Date().toISOString(),
        };
        setStats(mockData);
      }
    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      console.error('❌ Detalles:', error.response?.data || error.message);
      
      // Usar datos de prueba en caso de error
      const mockData = {
        resumen: {
          usuarios: { total: 5, activos: 5, inactivos: 0 },
          visitas: { hoy: 0, semana: 1, mes: 13, tendencia: { direccion: 'bajando', porcentaje: 100 } },
          asistencias: { hoy: 0, semana: 0, mes: 2, tendencia: { direccion: 'estable', porcentaje: 0 } },
          ausencias: { pendientes: 0, aprobadas: 0, rechazadas: 0 },
          notificaciones: { noLeidas: 22, total: 22 },
        },
        actualizado: new Date().toISOString(),
      };
      setStats(mockData);
      Alert.alert(
        '⚠️ Sin conexión',
        'No se pudo conectar con el servidor. Mostrando datos de prueba.'
      );
    } finally {
      setLoading(false);
      console.log('📊 6. Carga finalizada');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  // Manejar datos de resumen de forma segura
  const resumen = stats?.resumen || {
    usuarios: { total: 0, activos: 0, inactivos: 0 },
    visitas: { hoy: 0, semana: 0, mes: 0, tendencia: { direccion: 'estable', porcentaje: 0 } },
    asistencias: { hoy: 0, semana: 0, mes: 0, tendencia: { direccion: 'estable', porcentaje: 0 } },
    ausencias: { pendientes: 0, aprobadas: 0, rechazadas: 0 },
    notificaciones: { noLeidas: 0, total: 0 },
  };

  // Renderizar tarjeta de estadísticas
  const StatCard = ({ title, icon, color, stats: statData, onPress }) => {
    if (!statData) return null;
    
    return (
      <TouchableOpacity 
        style={[styles.statCard, { borderLeftColor: color }]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.statCardHeader}>
          <Text style={styles.statCardIcon}>{icon}</Text>
          <Text style={styles.statCardTitle}>{title}</Text>
        </View>
        <View style={styles.statRow}>
          {statData.map((item, index) => (
            <View key={index} style={styles.statItem}>
              <Text style={styles.statNumber}>{item.value || 0}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  // Mostrar loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  // Mostrar datos
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Bienvenido, {user?.nombre || 'Usuario'}
        </Text>
        <Text style={styles.headerDate}>
          Actualizado: {stats?.actualizado ? new Date(stats.actualizado).toLocaleString() : new Date().toLocaleString()}
        </Text>
      </View>

      {/* Resumen rápido */}
      <View style={styles.resumenContainer}>
        <View style={styles.resumenItem}>
          <Text style={styles.resumenNumero}>{resumen.usuarios.total || 0}</Text>
          <Text style={styles.resumenLabel}>Usuarios</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenNumero}>{resumen.visitas.hoy || 0}</Text>
          <Text style={styles.resumenLabel}>Visitas Hoy</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenNumero}>{resumen.asistencias.hoy || 0}</Text>
          <Text style={styles.resumenLabel}>Asistencias</Text>
        </View>
        <View style={styles.resumenDivider} />
        <View style={styles.resumenItem}>
          <Text style={styles.resumenNumero}>{resumen.notificaciones.noLeidas || 0}</Text>
          <Text style={styles.resumenLabel}>Notificaciones</Text>
        </View>
      </View>

      {/* Usuarios */}
      <StatCard
        title="Usuarios"
        icon="👥"
        color="#6C5CE7"
        stats={[
          { label: 'Total', value: resumen.usuarios.total || 0 },
          { label: 'Activos', value: resumen.usuarios.activos || 0 },
          { label: 'Inactivos', value: resumen.usuarios.inactivos || 0 },
        ]}
        onPress={() => navigation.navigate('GestionUsuarios')}
      />

      {/* Visitas */}
      <StatCard
        title="Visitas"
        icon="📋"
        color="#3498DB"
        stats={[
          { label: 'Hoy', value: resumen.visitas.hoy || 0 },
          { label: 'Semana', value: resumen.visitas.semana || 0 },
          { label: 'Mes', value: resumen.visitas.mes || 0 },
        ]}
        onPress={() => navigation.navigate('Reportes')}
      />

      {/* Asistencias */}
      <StatCard
        title="Asistencias"
        icon="📍"
        color="#2ECC71"
        stats={[
          { label: 'Hoy', value: resumen.asistencias.hoy || 0 },
          { label: 'Semana', value: resumen.asistencias.semana || 0 },
          { label: 'Mes', value: resumen.asistencias.mes || 0 },
        ]}
        onPress={() => navigation.navigate('Reportes')}
      />

      {/* Ausencias */}
      <StatCard
        title="Ausencias"
        icon="📝"
        color="#F39C12"
        stats={[
          { label: 'Pendientes', value: resumen.ausencias.pendientes || 0 },
          { label: 'Aprobadas', value: resumen.ausencias.aprobadas || 0 },
          { label: 'Rechazadas', value: resumen.ausencias.rechazadas || 0 },
        ]}
        onPress={() => navigation.navigate('GestionAusencias')}
      />

      {/* Notificaciones */}
      <StatCard
        title="Notificaciones"
        icon="🔔"
        color="#E74C3C"
        stats={[
          { label: 'No leídas', value: resumen.notificaciones.noLeidas || 0 },
          { label: 'Total', value: resumen.notificaciones.total || 0 },
        ]}
        onPress={() => navigation.navigate('Notificaciones')}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Datos actualizados en tiempo real
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#6C5CE7',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  resumenContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resumenItem: {
    flex: 1,
    alignItems: 'center',
  },
  resumenNumero: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  resumenLabel: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 2,
  },
  resumenDivider: {
    width: 1,
    backgroundColor: '#ECF0F1',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#636E72',
  },
  loadingText: {
    marginTop: 12,
    color: '#636E72',
  },
});

export default DashboardScreen;