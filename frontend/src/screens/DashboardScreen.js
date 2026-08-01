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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  // Cargar datos del dashboard
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      if (error.response?.status === 403) {
        Alert.alert('Acceso Denegado', 'No tienes permisos para ver el Dashboard');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
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

  // Renderizar tarjeta de estadísticas
  const StatCard = ({ title, icon, color, stats: statData, onPress }) => {
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
              <Text style={styles.statNumber}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        {statData.tendencia && (
          <View style={styles.tendenciaContainer}>
            <Ionicons 
              name={statData.tendencia.direccion === 'subiendo' ? 'trending-up' : 'trending-down'} 
              size={16} 
              color={statData.tendencia.direccion === 'subiendo' ? '#2ECC71' : '#E74C3C'} 
            />
            <Text style={styles.tendenciaText}>
              {statData.tendencia.porcentaje}% {statData.tendencia.direccion}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={50} color="#E74C3C" />
        <Text style={styles.errorText}>No se pudieron cargar las estadísticas</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { resumen } = stats;

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
        {/* ✅ CORREGIDO: Texto directo, sin Text anidado */}
        <Text style={styles.headerSubtitle}>
          Bienvenido, {user?.nombre || 'Usuario'}
        </Text>
        <Text style={styles.headerDate}>
          Actualizado: {new Date(stats.actualizado).toLocaleString()}
        </Text>
      </View>

      {/* Usuarios */}
      <StatCard
        title="Usuarios"
        icon="👥"
        color="#6C5CE7"
        stats={[
          { label: 'Total', value: resumen.usuarios.total },
          { label: 'Activos', value: resumen.usuarios.activos },
          { label: 'Inactivos', value: resumen.usuarios.inactivos },
        ]}
        onPress={() => navigation.navigate('GestionUsuarios')}
      />

      {/* Visitas */}
      <StatCard
        title="Visitas"
        icon="📋"
        color="#3498DB"
        stats={[
          { label: 'Hoy', value: resumen.visitas.hoy },
          { label: 'Semana', value: resumen.visitas.semana },
          { label: 'Mes', value: resumen.visitas.mes },
        ]}
        tendencia={resumen.visitas.tendencia}
        onPress={() => navigation.navigate('Reportes')}
      />

      {/* Asistencias */}
      <StatCard
        title="Asistencias"
        icon="📍"
        color="#2ECC71"
        stats={[
          { label: 'Hoy', value: resumen.asistencias.hoy },
          { label: 'Semana', value: resumen.asistencias.semana },
          { label: 'Mes', value: resumen.asistencias.mes },
        ]}
        tendencia={resumen.asistencias.tendencia}
        onPress={() => navigation.navigate('Reportes')}
      />

      {/* Monserrath */}
      <StatCard
        title="Monserrath"
        icon="📋"
        color="#9B59B6"
        stats={[
          { label: 'Hoy', value: resumen.monserrath.hoy },
          { label: 'Semana', value: resumen.monserrath.semana },
          { label: 'Mes', value: resumen.monserrath.mes },
        ]}
        onPress={() => navigation.navigate('Reportes')}
      />

      {/* Ausencias */}
      <StatCard
        title="Ausencias"
        icon="📝"
        color="#F39C12"
        stats={[
          { label: 'Pendientes', value: resumen.ausencias.pendientes },
          { label: 'Aprobadas', value: resumen.ausencias.aprobadas },
          { label: 'Rechazadas', value: resumen.ausencias.rechazadas },
        ]}
        onPress={() => navigation.navigate('GestionAusencias')}
      />

      {/* Notificaciones */}
      <StatCard
        title="Notificaciones"
        icon="🔔"
        color="#E74C3C"
        stats={[
          { label: 'No leídas', value: resumen.notificaciones.noLeidas },
          { label: 'Total', value: resumen.notificaciones.total },
        ]}
        onPress={() => navigation.navigate('Notificaciones')}
      />

      {/* Ranking de Técnicos */}
      {stats.rankings.tecnicosMasActivos && stats.rankings.tecnicosMasActivos.length > 0 && (
        <View style={styles.rankingCard}>
          <Text style={styles.rankingTitle}>🏆 Técnicos más activos</Text>
          {stats.rankings.tecnicosMasActivos.map((tecnico, index) => (
            <View key={index} style={styles.rankingItem}>
              <Text style={styles.rankingPosition}>{index + 1}</Text>
              <Text style={styles.rankingName}>{tecnico._id || 'Sin nombre'}</Text>
              <Text style={styles.rankingCount}>{tecnico.count} visitas</Text>
            </View>
          ))}
        </View>
      )}

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
  tendenciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },
  tendenciaText: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 4,
  },
  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  rankingPosition: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
    width: 30,
  },
  rankingName: {
    flex: 1,
    fontSize: 14,
    color: '#2D3436',
  },
  rankingCount: {
    fontSize: 14,
    color: '#636E72',
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
  errorText: {
    marginTop: 12,
    color: '#E74C3C',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default DashboardScreen;