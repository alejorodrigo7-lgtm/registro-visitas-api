import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [stats, setStats] = useState({
    total: 0,
    asignadas: 0,
    noRetirado: 0,
    retirado: 0,
    anulado: 0,
    reconectado: 0,
    visitasHoy: 0,
    visitasMes: 0,
    clientesAtendidos: 0,
    promedioVisitas: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCoordinadores, setTopCoordinadores] = useState([]);
  const [evolucionDiaria, setEvolucionDiaria] = useState([]);

  const rolUsuario = user?.rol?.toLowerCase() || '';
  const isAdminOrJefe = ['admin', 'jefe'].includes(rolUsuario);

  // ✅ Formatear fecha para mostrar
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ✅ Formatear fecha para API
  const formatDateAPI = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // ✅ Calcular estadísticas
  const cargarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      
      const fechaInicioStr = formatDateAPI(fechaInicio);
      const fechaFinStr = formatDateAPI(fechaFin);

      // Cargar todas las órdenes
      const response = await api.get('/recuperacion/ordenes');
      let todasOrdenes = response.data.data || [];

      // ✅ Filtrar por rango de fechas
      const ordenesFiltradas = todasOrdenes.filter(o => {
        const fechaCreacion = new Date(o.fechaSubida || o.createdAt);
        const fechaCreacionStr = formatDateAPI(fechaCreacion);
        return fechaCreacionStr >= fechaInicioStr && fechaCreacionStr <= fechaFinStr;
      });

      // ✅ Estadísticas generales
      const total = ordenesFiltradas.length;
      const asignadas = ordenesFiltradas.filter(o => o.estado === 'asignada').length;
      const noRetirado = ordenesFiltradas.filter(o => o.estado === 'no_retirado').length;
      const retirado = ordenesFiltradas.filter(o => o.estado === 'retirado').length;
      const anulado = ordenesFiltradas.filter(o => o.estado === 'anulado').length;
      const reconectado = ordenesFiltradas.filter(o => o.estado === 'reconectado').length;

      // ✅ Visitas de hoy
      const hoy = new Date().toISOString().split('T')[0];
      const visitasHoy = ordenesFiltradas.filter(o => {
        const ultimaVisita = o.visitas?.[o.visitas.length - 1];
        if (!ultimaVisita) return false;
        const fechaVisita = new Date(ultimaVisita.fechaVisita).toISOString().split('T')[0];
        return fechaVisita === hoy;
      }).length;

      // ✅ Visitas del mes
      const mes = new Date().getMonth();
      const visitasMes = ordenesFiltradas.filter(o => {
        const ultimaVisita = o.visitas?.[o.visitas.length - 1];
        if (!ultimaVisita) return false;
        const fechaVisita = new Date(ultimaVisita.fechaVisita);
        return fechaVisita.getMonth() === mes;
      }).length;

      // ✅ Clientes atendidos (con al menos una visita)
      const clientesAtendidos = ordenesFiltradas.filter(o => o.visitas?.length > 0).length;

      // ✅ Promedio de visitas por orden
      const totalVisitas = ordenesFiltradas.reduce((acc, o) => acc + (o.visitas?.length || 0), 0);
      const promedioVisitas = total > 0 ? Number((totalVisitas / total).toFixed(1)) : 0;

      setStats({
        total,
        asignadas,
        noRetirado,
        retirado,
        anulado,
        reconectado,
        visitasHoy,
        visitasMes,
        clientesAtendidos,
        promedioVisitas,
      });

      // ✅ Top coordinadores
      const coordinadoresMap = {};
      ordenesFiltradas.forEach(o => {
        const coordId = o.coordinadorAsignado?._id || o.coordinadorAsignado;
        const coordNombre = o.coordinadorAsignado?.nombre || 'Sin asignar';
        if (coordId) {
          if (!coordinadoresMap[coordId]) {
            coordinadoresMap[coordId] = { nombre: coordNombre, count: 0 };
          }
          coordinadoresMap[coordId].count++;
        }
      });
      const topCoords = Object.values(coordinadoresMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopCoordinadores(topCoords);

      // ✅ Evolución diaria (últimos 7 días)
      const evolucion = [];
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = formatDateAPI(fecha);
        const count = ordenesFiltradas.filter(o => {
          const fechaCreacion = new Date(o.fechaSubida || o.createdAt);
          return formatDateAPI(fechaCreacion) === fechaStr;
        }).length;
        evolucion.push({
          fecha: fechaStr,
          dia: fecha.toLocaleDateString('es-EC', { weekday: 'short' }),
          count,
        });
      }
      setEvolucionDiaria(evolucion);

      // ✅ Órdenes recientes (últimas 5)
      const sorted = [...ordenesFiltradas].sort((a, b) => 
        new Date(b.fechaSubida || b.createdAt) - new Date(a.fechaSubida || a.createdAt)
      );
      setRecentOrders(sorted.slice(0, 5));

    } catch (error) {
      console.error('Error cargando dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  // ✅ Manejar refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDashboard();
  }, [cargarDashboard]);

  // ✅ Cambiar fecha
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setFechaInicio(selectedDate);
      } else {
        setFechaFin(selectedDate);
      }
    }
  };

  // ✅ Aplicar filtro de fecha rápido
  const aplicarFiltroRapido = (dias) => {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    setFechaInicio(inicio);
    setFechaFin(hoy);
    // Recargar datos después de cambiar fechas
    setTimeout(() => cargarDashboard(), 100);
  };

  // ✅ Navegar a detalle de estado
  const navigateTo = (screen, params = {}) => {
    navigation.navigate(screen, params);
  };

  // ✅ Renderizar barra de evolución
  const EvolutionBar = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.count), 1);
    
    return (
      <View style={styles.evolutionContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.evolutionItem}>
            <View style={styles.evolutionBarContainer}>
              <View 
                style={[
                  styles.evolutionBar, 
                  { height: (item.count / maxValue) * 60 }
                ]} 
              />
              <Text style={styles.evolutionValue}>{item.count}</Text>
            </View>
            <Text style={styles.evolutionDay}>{item.dia}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ✅ Renderizar tarjeta de estadística
  const StatCard = ({ title, count, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statCount, { color }]}>{count}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  // ✅ Renderizar MiniStatCard
  const MiniStatCard = ({ title, count, icon, color }) => (
    <View style={styles.miniStatCard}>
      <View style={[styles.miniStatIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.miniStatCount}>{count}</Text>
        <Text style={styles.miniStatTitle}>{title}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header con bienvenida */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>📊 Dashboard</Text>
            <Text style={styles.userName}>{user?.nombre || user?.email || 'Usuario'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.rol || 'Sin rol'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={28} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* Filtro de fecha */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>📅 Rango de fechas:</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => {
                setDatePickerMode('start');
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color="#6C5CE7" />
              <Text style={styles.filterButtonText}>{formatDate(fechaInicio)}</Text>
            </TouchableOpacity>
            <Text style={styles.filterSeparator}>→</Text>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => {
                setDatePickerMode('end');
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color="#6C5CE7" />
              <Text style={styles.filterButtonText}>{formatDate(fechaFin)}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterQuickActions}>
            <TouchableOpacity 
              style={styles.quickFilterButton}
              onPress={() => aplicarFiltroRapido(0)}
            >
              <Text style={styles.quickFilterText}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickFilterButton}
              onPress={() => aplicarFiltroRapido(7)}
            >
              <Text style={styles.quickFilterText}>7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickFilterButton}
              onPress={() => aplicarFiltroRapido(30)}
            >
              <Text style={styles.quickFilterText}>30 días</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickFilterButton}
              onPress={() => {
                const inicio = new Date();
                inicio.setMonth(inicio.getMonth() - 1);
                setFechaInicio(inicio);
                setFechaFin(new Date());
                setTimeout(() => cargarDashboard(), 100);
              }}
            >
              <Text style={styles.quickFilterText}>1 mes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={datePickerMode === 'start' ? fechaInicio : fechaFin}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Resumen total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total de Órdenes</Text>
          <Text style={styles.totalNumber}>{stats.total}</Text>
          <View style={styles.totalSubInfo}>
            <View style={styles.totalSubItem}>
              <Text style={styles.totalSubLabel}>📅 Visitas Hoy</Text>
              <Text style={styles.totalSubValue}>{stats.visitasHoy}</Text>
            </View>
            <View style={styles.totalSubItem}>
              <Text style={styles.totalSubLabel}>📈 Visitas Mes</Text>
              <Text style={styles.totalSubValue}>{stats.visitasMes}</Text>
            </View>
          </View>
        </View>

        {/* Métricas adicionales */}
        <View style={styles.miniStatsContainer}>
          <MiniStatCard 
            title="Clientes Atendidos" 
            count={stats.clientesAtendidos} 
            icon="people-outline" 
            color="#6C5CE7" 
          />
          <MiniStatCard 
            title="Promedio Visitas" 
            count={stats.promedioVisitas} 
            icon="stats-chart-outline" 
            color="#F39C12" 
          />
        </View>

        {/* Estadísticas por estado */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Asignadas"
            count={stats.asignadas}
            icon="time-outline"
            color="#F39C12"
            onPress={() => navigateTo('RevisarOrdenes')}
          />
          <StatCard
            title="No Retirado"
            count={stats.noRetirado}
            icon="alert-circle-outline"
            color="#E74C3C"
            onPress={() => navigateTo('PendientesRetirar')}
          />
          <StatCard
            title="Retirados"
            count={stats.retirado}
            icon="checkmark-circle-outline"
            color="#2ECC71"
            onPress={() => navigateTo('Retirados')}
          />
          {isAdminOrJefe && (
            <>
              <StatCard
                title="Anulados"
                count={stats.anulado}
                icon="close-circle-outline"
                color="#E74C3C"
                onPress={() => navigateTo('RevisarOrdenes')}
              />
              <StatCard
                title="Reconectados"
                count={stats.reconectado}
                icon="wifi-outline"
                color="#3498DB"
                onPress={() => navigateTo('RevisarOrdenes')}
              />
            </>
          )}
        </View>

        {/* Evolución diaria */}
        <View style={styles.evolutionSection}>
          <Text style={styles.sectionTitle}>📈 Evolución Diaria</Text>
          <View style={styles.evolutionCard}>
            <EvolutionBar data={evolucionDiaria} />
          </View>
        </View>

        {/* Top coordinadores */}
        <View style={styles.topCoordinadoresSection}>
          <Text style={styles.sectionTitle}>🏆 Top Coordinadores</Text>
          {topCoordinadores.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay datos de coordinadores</Text>
            </View>
          ) : (
            topCoordinadores.map((coord, index) => (
              <View key={index} style={styles.topCoordItem}>
                <View style={styles.topCoordRank}>
                  <Text style={styles.topCoordNumber}>#{index + 1}</Text>
                </View>
                <View style={styles.topCoordInfo}>
                  <Text style={styles.topCoordName}>{coord.nombre}</Text>
                  <Text style={styles.topCoordCount}>{coord.count} órdenes</Text>
                </View>
                <View style={styles.topCoordBar}>
                  <View 
                    style={[
                      styles.topCoordBarFill, 
                      { width: `${(coord.count / (topCoordinadores[0]?.count || 1)) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Acciones rápidas */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={() => navigateTo('SubirOrden')}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Subir Orden</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionSuccess]}
              onPress={() => navigateTo('EjecutarOrden')}
            >
              <Ionicons name="play-circle-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Ejecutar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionWarning]}
              onPress={() => navigateTo('PendientesRetirar')}
            >
              <Ionicons name="time-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Pendientes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionInfo]}
              onPress={() => navigateTo('RevisarOrdenes')}
            >
              <Ionicons name="list-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Ver Todas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Órdenes recientes */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>📋 Últimas Órdenes</Text>
          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No hay órdenes recientes</Text>
            </View>
          ) : (
            recentOrders.map((orden) => (
              <TouchableOpacity
                key={orden._id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('RevisarOrdenes')}
              >
                <View style={styles.recentHeader}>
                  <Text style={styles.recentCliente}>{orden.cliente?.nombre || 'Sin nombre'}</Text>
                  <View style={[styles.recentStatus, { backgroundColor: getEstadoColor(orden.estado) + '20' }]}>
                    <Text style={[styles.recentStatusText, { color: getEstadoColor(orden.estado) }]}>
                      {getEstadoTexto(orden.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recentMac}>📶 {orden.mac || 'N/A'}</Text>
                <Text style={styles.recentDate}>
                  {new Date(orden.fechaSubida || orden.createdAt).toLocaleDateString('es-EC')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>RA²P v2.0</Text>
          <Text style={styles.footerSubtext}>© 2026 - Dashboard en tiempo real</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ✅ Funciones auxiliares
const getEstadoColor = (estado) => {
  const colores = {
    'asignada': '#F39C12',
    'no_retirado': '#E74C3C',
    'retirado': '#2ECC71',
    'anulado': '#E74C3C',
    'reconectado': '#3498DB'
  };
  return colores[estado] || '#95A5A6';
};

const getEstadoTexto = (estado) => {
  const textos = {
    'asignada': 'Asignada',
    'no_retirado': 'No Retirado',
    'retirado': 'Retirado',
    'anulado': 'Anulado',
    'reconectado': 'Reconectado'
  };
  return textos[estado] || estado;
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
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#636E72',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#636E72',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: '#6C5CE720',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 11,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  refreshButton: {
    padding: 5,
  },
  // Filtro
  filterContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#2D3436',
  },
  filterSeparator: {
    fontSize: 16,
    color: '#636E72',
  },
  filterQuickActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  quickFilterButton: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  quickFilterText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  // Total
  totalCard: {
    backgroundColor: '#6C5CE7',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#FFFFFF90',
    fontWeight: '500',
  },
  totalNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  totalSubInfo: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 12,
  },
  totalSubItem: {
    alignItems: 'center',
  },
  totalSubLabel: {
    fontSize: 12,
    color: '#FFFFFF90',
  },
  totalSubValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  // Mini Stats
  miniStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  miniStatTitle: {
    fontSize: 10,
    color: '#636E72',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 6,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 2,
    marginBottom: 6,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 11,
    color: '#636E72',
  },
  // Evolution
  evolutionSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  evolutionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  evolutionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  evolutionItem: {
    alignItems: 'center',
  },
  evolutionBarContainer: {
    alignItems: 'center',
    height: 70,
    justifyContent: 'flex-end',
  },
  evolutionBar: {
    width: 20,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minHeight: 4,
  },
  evolutionValue: {
    fontSize: 10,
    color: '#636E72',
    marginTop: 2,
  },
  evolutionDay: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  // Top Coordinadores
  topCoordinadoresSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  topCoordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topCoordRank: {
    width: 28,
    alignItems: 'center',
  },
  topCoordNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  topCoordInfo: {
    flex: 1,
    marginLeft: 8,
  },
  topCoordName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  topCoordCount: {
    fontSize: 11,
    color: '#636E72',
  },
  topCoordBar: {
    width: 60,
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  topCoordBarFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 3,
  },
  // Quick Actions
  quickActions: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionPrimary: {
    backgroundColor: '#6C5CE7',
  },
  actionSuccess: {
    backgroundColor: '#00B894',
  },
  actionWarning: {
    backgroundColor: '#F39C12',
  },
  actionInfo: {
    backgroundColor: '#3498DB',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Recent Orders
  recentSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  recentItem: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentCliente: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    flex: 1,
  },
  recentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  recentStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recentMac: {
    fontSize: 12,
    color: '#636E72',
  },
  recentDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 4,
  },
});

export default DashboardScreen;