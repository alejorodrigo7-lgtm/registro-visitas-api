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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  
  // ✅ Estadísticas de TODOS los módulos
  const [stats, setStats] = useState({
    // Recuperación de Equipos
    totalOrdenes: 0,
    ordenesAsignadas: 0,
    ordenesNoRetirado: 0,
    ordenesRetirado: 0,
    ordenesAnulado: 0,
    ordenesReconectado: 0,
    visitasRealizadas: 0,
    visitasHoy: 0,
    visitasMes: 0,
    clientesAtendidos: 0,
    promedioVisitas: 0,
    
    // Caja / Depósitos
    totalDepositos: 0,
    depositosPendientes: 0,
    depositosAprobados: 0,
    depositosRechazados: 0,
    totalCaja: 0,
    cajaAbierta: 0,
    cajaCerrada: 0,
    saldoTotalCaja: 0,
    
    // Transferencias
    totalTransferencias: 0,
    transferenciasPendientes: 0,
    transferenciasAprobadas: 0,
    transferenciasDenegadas: 0,
    
    // Servicios
    totalServicios: 0,
    serviciosActivos: 0,
    serviciosFinalizados: 0,
    serviciosPendientes: 0,
    
    // Desconexiones
    totalDesconexiones: 0,
    desconexionesPendientes: 0,
    desconexionesEjecutadas: 0,
    reconexionesRealizadas: 0,
    
    // Recibos
    totalRecibos: 0,
    recibosPendientes: 0,
    recibosSubidos: 0,
    
    // Usuarios
    totalUsuarios: 0,
    totalCoordinadores: 0,
    totalAdmins: 0,
    totalTecnicos: 0,
    totalClientes: 0,
    
    // Asistencia
    totalAsistencias: 0,
    asistenciasHoy: 0,
    ausenciasRegistradas: 0,
    
    // Ubicaciones
    totalUbicaciones: 0,
    ubicacionesHoy: 0,
    
    // Bodegas
    totalBodegas: 0,
    totalMateriales: 0,
    materialesAsignados: 0,
    
    // Reportes
    totalReportes: 0,
    reportesPendientes: 0,
    reportesGenerados: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const rolUsuario = user?.rol?.toLowerCase() || '';
  const isAdminOrJefe = ['admin', 'jefe'].includes(rolUsuario);

  // ✅ Formatear fecha
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateAPI = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // ✅ Cargar TODAS las estadísticas
  const cargarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      
      const hoy = new Date().toISOString().split('T')[0];
      const mes = new Date().getMonth();

      // ============================================
      // 1. RECUPERACIÓN DE EQUIPOS
      // ============================================
      const [asignadas, noRetirado, retirado, anulado, reconectado] = await Promise.all([
        api.get('/recuperacion/ordenes/estado/asignada'),
        api.get('/recuperacion/ordenes/estado/no_retirado'),
        api.get('/recuperacion/ordenes/estado/retirado'),
        api.get('/recuperacion/ordenes/estado/anulado'),
        api.get('/recuperacion/ordenes/estado/reconectado'),
      ]);

      const totalOrdenes = 
        (asignadas.data.data?.length || 0) +
        (noRetirado.data.data?.length || 0) +
        (retirado.data.data?.length || 0) +
        (anulado.data.data?.length || 0) +
        (reconectado.data.data?.length || 0);

      // Obtener todas las órdenes para calcular visitas
      const response = await api.get('/recuperacion/ordenes');
      const todasOrdenes = response.data.data || [];

      // Filtrar por fecha
      const fechaInicioStr = formatDateAPI(fechaInicio);
      const fechaFinStr = formatDateAPI(fechaFin);
      
      const ordenesFiltradas = todasOrdenes.filter(o => {
        const fechaCreacion = new Date(o.fechaSubida || o.createdAt);
        const fechaCreacionStr = formatDateAPI(fechaCreacion);
        return fechaCreacionStr >= fechaInicioStr && fechaCreacionStr <= fechaFinStr;
      });

      const visitasRealizadas = ordenesFiltradas.reduce((acc, o) => acc + (o.visitas?.length || 0), 0);
      const visitasHoy = ordenesFiltradas.filter(o => {
        const ultimaVisita = o.visitas?.[o.visitas.length - 1];
        if (!ultimaVisita) return false;
        const fechaVisita = new Date(ultimaVisita.fechaVisita).toISOString().split('T')[0];
        return fechaVisita === hoy;
      }).length;

      const visitasMes = ordenesFiltradas.filter(o => {
        const ultimaVisita = o.visitas?.[o.visitas.length - 1];
        if (!ultimaVisita) return false;
        const fechaVisita = new Date(ultimaVisita.fechaVisita);
        return fechaVisita.getMonth() === mes;
      }).length;

      const clientesAtendidos = ordenesFiltradas.filter(o => o.visitas?.length > 0).length;
      const totalVisitas = ordenesFiltradas.reduce((acc, o) => acc + (o.visitas?.length || 0), 0);
      const promedioVisitas = totalOrdenes > 0 ? Number((totalVisitas / totalOrdenes).toFixed(1)) : 0;

      // ============================================
      // 2. CAJA / DEPÓSITOS
      // ============================================
      let totalDepositos = 0, depositosPendientes = 0, depositosAprobados = 0, depositosRechazados = 0;
      let totalCaja = 0, cajaAbierta = 0, cajaCerrada = 0, saldoTotalCaja = 0;

      try {
        const depositosRes = await api.get('/depositos');
        if (depositosRes.data.success) {
          const depositos = depositosRes.data.data || [];
          totalDepositos = depositos.length;
          depositosPendientes = depositos.filter(d => d.estado === 'pendiente').length;
          depositosAprobados = depositos.filter(d => d.estado === 'aprobado').length;
          depositosRechazados = depositos.filter(d => d.estado === 'rechazado').length;
        }
      } catch (error) {}

      try {
        const cajaRes = await api.get('/caja/cuadres');
        if (cajaRes.data.success) {
          const cajaData = cajaRes.data.data || [];
          totalCaja = cajaData.length;
          cajaAbierta = cajaData.filter(c => !c.cerrado).length;
          cajaCerrada = cajaData.filter(c => c.cerrado).length;
          saldoTotalCaja = cajaData.reduce((acc, c) => acc + (c.saldoDisponible || 0), 0);
        }
      } catch (error) {}

      // ============================================
      // 3. TRANSFERENCIAS
      // ============================================
      let totalTransferencias = 0, transferenciasPendientes = 0, transferenciasAprobadas = 0, transferenciasDenegadas = 0;

      try {
        const transferenciasRes = await api.get('/transferencias');
        if (transferenciasRes.data.success) {
          const transferencias = transferenciasRes.data.data || [];
          totalTransferencias = transferencias.length;
          transferenciasPendientes = transferencias.filter(t => t.estado === 'pendiente').length;
          transferenciasAprobadas = transferencias.filter(t => t.estado === 'aprobado').length;
          transferenciasDenegadas = transferencias.filter(t => t.estado === 'denegado').length;
        }
      } catch (error) {}

      // ============================================
      // 4. SERVICIOS
      // ============================================
      let totalServicios = 0, serviciosActivos = 0, serviciosFinalizados = 0, serviciosPendientes = 0;

      try {
        const serviciosRes = await api.get('/servicios');
        if (serviciosRes.data.success) {
          const servicios = serviciosRes.data.data || [];
          totalServicios = servicios.length;
          serviciosActivos = servicios.filter(s => s.estado === 'activo').length;
          serviciosFinalizados = servicios.filter(s => s.estado === 'finalizado').length;
          serviciosPendientes = servicios.filter(s => s.estado === 'pendiente').length;
        }
      } catch (error) {}

      // ============================================
      // 5. DESCONEXIONES
      // ============================================
      let totalDesconexiones = 0, desconexionesPendientes = 0, desconexionesEjecutadas = 0, reconexionesRealizadas = 0;

      try {
        const desconexionesRes = await api.get('/desconexiones');
        if (desconexionesRes.data.success) {
          const desconexiones = desconexionesRes.data.data || [];
          totalDesconexiones = desconexiones.length;
          desconexionesPendientes = desconexiones.filter(d => d.estado === 'pendiente').length;
          desconexionesEjecutadas = desconexiones.filter(d => d.estado === 'ejecutada').length;
          reconexionesRealizadas = desconexiones.filter(d => d.estado === 'reconectado').length;
        }
      } catch (error) {}

      // ============================================
      // 6. RECIBOS
      // ============================================
      let totalRecibos = 0, recibosPendientes = 0, recibosSubidos = 0;

      try {
        const recibosRes = await api.get('/recibos');
        if (recibosRes.data.success) {
          const recibos = recibosRes.data.data || [];
          totalRecibos = recibos.length;
          recibosPendientes = recibos.filter(r => r.estado === 'pendiente').length;
          recibosSubidos = recibos.filter(r => r.estado === 'subido').length;
        }
      } catch (error) {}

      // ============================================
      // 7. USUARIOS
      // ============================================
      let totalUsuarios = 0, totalCoordinadores = 0, totalAdmins = 0, totalTecnicos = 0, totalClientes = 0;

      try {
        const usersRes = await api.get('/users');
        if (usersRes.data.success) {
          const users = usersRes.data.data || [];
          totalUsuarios = users.length;
          totalCoordinadores = users.filter(u => u.rol?.toLowerCase() === 'coordinador').length;
          totalAdmins = users.filter(u => ['admin', 'jefe'].includes(u.rol?.toLowerCase())).length;
          totalTecnicos = users.filter(u => u.rol?.toLowerCase() === 'tecnico').length;
          totalClientes = users.filter(u => u.rol?.toLowerCase() === 'cliente').length;
        }
      } catch (error) {}

      // ============================================
      // 8. ASISTENCIA
      // ============================================
      let totalAsistencias = 0, asistenciasHoy = 0, ausenciasRegistradas = 0;

      try {
        const asistenciaRes = await api.get('/asistencia');
        if (asistenciaRes.data.success) {
          const asistencias = asistenciaRes.data.data || [];
          totalAsistencias = asistencias.length;
          asistenciasHoy = asistencias.filter(a => {
            const fecha = new Date(a.fecha).toISOString().split('T')[0];
            return fecha === hoy;
          }).length;
          ausenciasRegistradas = asistencias.filter(a => a.estado === 'ausente').length;
        }
      } catch (error) {}

      // ============================================
      // 9. UBICACIONES
      // ============================================
      let totalUbicaciones = 0, ubicacionesHoy = 0;

      try {
        const ubicacionesRes = await api.get('/ubicaciones');
        if (ubicacionesRes.data.success) {
          const ubicaciones = ubicacionesRes.data.data || [];
          totalUbicaciones = ubicaciones.length;
          ubicacionesHoy = ubicaciones.filter(u => {
            const fecha = new Date(u.createdAt || u.fecha).toISOString().split('T')[0];
            return fecha === hoy;
          }).length;
        }
      } catch (error) {}

      // ============================================
      // 10. BODEGAS
      // ============================================
      let totalBodegas = 0, totalMateriales = 0, materialesAsignados = 0;

      try {
        const bodegasRes = await api.get('/bodegas');
        if (bodegasRes.data.success) {
          const bodegas = bodegasRes.data.data || [];
          totalBodegas = bodegas.length;
          totalMateriales = bodegas.reduce((acc, b) => acc + (b.materiales?.length || 0), 0);
          materialesAsignados = bodegas.reduce((acc, b) => acc + (b.materiales?.filter(m => m.asignado).length || 0), 0);
        }
      } catch (error) {}

      // ============================================
      // 11. REPORTES
      // ============================================
      let totalReportes = 0, reportesPendientes = 0, reportesGenerados = 0;

      try {
        const reportesRes = await api.get('/reportes');
        if (reportesRes.data.success) {
          const reportes = reportesRes.data.data || [];
          totalReportes = reportes.length;
          reportesPendientes = reportes.filter(r => r.estado === 'pendiente').length;
          reportesGenerados = reportes.filter(r => r.estado === 'generado').length;
        }
      } catch (error) {}

      // ============================================
      // 12. ACTIVIDAD RECIENTE
      // ============================================
      const sorted = [...ordenesFiltradas].sort((a, b) => 
        new Date(b.fechaSubida || b.createdAt) - new Date(a.fechaSubida || a.createdAt)
      );
      setRecentActivity(sorted.slice(0, 5));

      // ============================================
      // 13. ACTUALIZAR ESTADÍSTICAS
      // ============================================
      setStats({
        // Recuperación
        totalOrdenes,
        ordenesAsignadas: asignadas.data.data?.length || 0,
        ordenesNoRetirado: noRetirado.data.data?.length || 0,
        ordenesRetirado: retirado.data.data?.length || 0,
        ordenesAnulado: anulado.data.data?.length || 0,
        ordenesReconectado: reconectado.data.data?.length || 0,
        visitasRealizadas,
        visitasHoy,
        visitasMes,
        clientesAtendidos,
        promedioVisitas,
        
        // Caja / Depósitos
        totalDepositos,
        depositosPendientes,
        depositosAprobados,
        depositosRechazados,
        totalCaja,
        cajaAbierta,
        cajaCerrada,
        saldoTotalCaja,
        
        // Transferencias
        totalTransferencias,
        transferenciasPendientes,
        transferenciasAprobadas,
        transferenciasDenegadas,
        
        // Servicios
        totalServicios,
        serviciosActivos,
        serviciosFinalizados,
        serviciosPendientes,
        
        // Desconexiones
        totalDesconexiones,
        desconexionesPendientes,
        desconexionesEjecutadas,
        reconexionesRealizadas,
        
        // Recibos
        totalRecibos,
        recibosPendientes,
        recibosSubidos,
        
        // Usuarios
        totalUsuarios,
        totalCoordinadores,
        totalAdmins,
        totalTecnicos,
        totalClientes,
        
        // Asistencia
        totalAsistencias,
        asistenciasHoy,
        ausenciasRegistradas,
        
        // Ubicaciones
        totalUbicaciones,
        ubicacionesHoy,
        
        // Bodegas
        totalBodegas,
        totalMateriales,
        materialesAsignados,
        
        // Reportes
        totalReportes,
        reportesPendientes,
        reportesGenerados,
      });

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDashboard();
  }, [cargarDashboard]);

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

  const aplicarFiltroRapido = (dias) => {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    setFechaInicio(inicio);
    setFechaFin(hoy);
    setTimeout(() => cargarDashboard(), 100);
  };

  // ✅ Renderizar sección
  const Section = ({ title, icon, children, color = '#6C5CE7' }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  // ✅ Renderizar fila de estadística
  const StatRow = ({ label, value, icon, color = '#2D3436' }) => (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.statRowLabel}>{label}</Text>
      </View>
      <Text style={[styles.statRowValue, { color }]}>{value}</Text>
    </View>
  );

  // ✅ Renderizar tarjeta de resumen
  const SummaryCard = ({ title, value, icon, color }) => (
    <View style={[styles.summaryCard, { borderColor: color }]}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>📊 Dashboard</Text>
            <Text style={styles.userName}>{user?.nombre || user?.email || 'Usuario'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.rol || 'Sin rol'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={28} color="#6C5CE7" />
          </TouchableOpacity>
        </View>

        {/* Filtro de fecha */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>📅 Rango de fechas:</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => { setDatePickerMode('start'); setShowDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={16} color="#6C5CE7" />
              <Text style={styles.filterButtonText}>{formatDate(fechaInicio)}</Text>
            </TouchableOpacity>
            <Text style={styles.filterSeparator}>→</Text>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => { setDatePickerMode('end'); setShowDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={16} color="#6C5CE7" />
              <Text style={styles.filterButtonText}>{formatDate(fechaFin)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterQuickActions}>
            <TouchableOpacity style={styles.quickFilterButton} onPress={() => aplicarFiltroRapido(0)}>
              <Text style={styles.quickFilterText}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterButton} onPress={() => aplicarFiltroRapido(7)}>
              <Text style={styles.quickFilterText}>7 días</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterButton} onPress={() => aplicarFiltroRapido(30)}>
              <Text style={styles.quickFilterText}>30 días</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickFilterButton} onPress={() => aplicarFiltroRapido(90)}>
              <Text style={styles.quickFilterText}>3 meses</Text>
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

        {/* Resumen General */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>📊 Resumen General</Text>
          <View style={styles.totalGrid}>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.totalOrdenes}</Text>
              <Text style={styles.totalSubLabel}>Órdenes</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.visitasHoy}</Text>
              <Text style={styles.totalSubLabel}>Visitas Hoy</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.totalUsuarios}</Text>
              <Text style={styles.totalSubLabel}>Usuarios</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.saldoTotalCaja.toFixed(2)}</Text>
              <Text style={styles.totalSubLabel}>Saldo Caja</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.totalServicios}</Text>
              <Text style={styles.totalSubLabel}>Servicios</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalNumber}>{stats.totalTransferencias}</Text>
              <Text style={styles.totalSubLabel}>Transferencias</Text>
            </View>
          </View>
        </View>

        {/* 📦 Recuperación de Equipos */}
        <Section title="Recuperación de Equipos" icon="hardware-chip-outline" color="#6C5CE7">
          <StatRow label="Total Órdenes" value={stats.totalOrdenes} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Asignadas" value={stats.ordenesAsignadas} icon="time-outline" color="#F39C12" />
          <StatRow label="No Retirado" value={stats.ordenesNoRetirado} icon="alert-circle-outline" color="#E74C3C" />
          <StatRow label="Retirados" value={stats.ordenesRetirado} icon="checkmark-circle-outline" color="#2ECC71" />
          <StatRow label="Anulados" value={stats.ordenesAnulado} icon="close-circle-outline" color="#E74C3C" />
          <StatRow label="Reconectados" value={stats.ordenesReconectado} icon="wifi-outline" color="#3498DB" />
          <StatRow label="Visitas Realizadas" value={stats.visitasRealizadas} icon="eye-outline" color="#6C5CE7" />
          <StatRow label="Visitas del Mes" value={stats.visitasMes} icon="calendar-outline" color="#6C5CE7" />
          <StatRow label="Clientes Atendidos" value={stats.clientesAtendidos} icon="people-outline" color="#2ECC71" />
          <StatRow label="Promedio Visitas/Orden" value={stats.promedioVisitas} icon="stats-chart-outline" color="#F39C12" />
        </Section>

        {/* 💰 Caja / Depósitos */}
        <Section title="Caja / Depósitos" icon="cash-outline" color="#F39C12">
          <StatRow label="Total Depósitos" value={stats.totalDepositos} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Depósitos Pendientes" value={stats.depositosPendientes} icon="time-outline" color="#F39C12" />
          <StatRow label="Depósitos Aprobados" value={stats.depositosAprobados} icon="checkmark-circle-outline" color="#2ECC71" />
          <StatRow label="Depósitos Rechazados" value={stats.depositosRechazados} icon="close-circle-outline" color="#E74C3C" />
          <StatRow label="Total Cuadres" value={stats.totalCaja} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Caja Abierta" value={stats.cajaAbierta} icon="lock-open-outline" color="#F39C12" />
          <StatRow label="Caja Cerrada" value={stats.cajaCerrada} icon="lock-closed-outline" color="#2ECC71" />
          <StatRow label="Saldo Total" value={`$${stats.saldoTotalCaja.toFixed(2)}`} icon="cash-outline" color="#6C5CE7" />
        </Section>

        {/* 🔄 Transferencias */}
        <Section title="Transferencias" icon="swap-horizontal-outline" color="#3498DB">
          <StatRow label="Total Transferencias" value={stats.totalTransferencias} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Pendientes" value={stats.transferenciasPendientes} icon="time-outline" color="#F39C12" />
          <StatRow label="Aprobadas" value={stats.transferenciasAprobadas} icon="checkmark-circle-outline" color="#2ECC71" />
          <StatRow label="Denegadas" value={stats.transferenciasDenegadas} icon="close-circle-outline" color="#E74C3C" />
        </Section>

        {/* 🛠 Servicios */}
        <Section title="Servicios" icon="construct-outline" color="#00B894">
          <StatRow label="Total Servicios" value={stats.totalServicios} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Activos" value={stats.serviciosActivos} icon="checkmark-circle-outline" color="#2ECC71" />
          <StatRow label="Finalizados" value={stats.serviciosFinalizados} icon="flag-outline" color="#6C5CE7" />
          <StatRow label="Pendientes" value={stats.serviciosPendientes} icon="time-outline" color="#F39C12" />
        </Section>

        {/* 🔌 Desconexiones */}
        <Section title="Desconexiones" icon="power-outline" color="#E74C3C">
          <StatRow label="Total Desconexiones" value={stats.totalDesconexiones} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Pendientes" value={stats.desconexionesPendientes} icon="time-outline" color="#F39C12" />
          <StatRow label="Ejecutadas" value={stats.desconexionesEjecutadas} icon="checkmark-circle-outline" color="#2ECC71" />
          <StatRow label="Reconexiones" value={stats.reconexionesRealizadas} icon="wifi-outline" color="#3498DB" />
        </Section>

        {/* 📄 Recibos */}
        <Section title="Recibos" icon="document-text-outline" color="#F39C12">
          <StatRow label="Total Recibos" value={stats.totalRecibos} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Pendientes" value={stats.recibosPendientes} icon="time-outline" color="#F39C12" />
          <StatRow label="Subidos" value={stats.recibosSubidos} icon="cloud-upload-outline" color="#2ECC71" />
        </Section>

        {/* 👥 Usuarios */}
        <Section title="Usuarios" icon="people-outline" color="#6C5CE7">
          <StatRow label="Total Usuarios" value={stats.totalUsuarios} icon="people-outline" color="#6C5CE7" />
          <StatRow label="Coordinadores" value={stats.totalCoordinadores} icon="person-outline" color="#F39C12" />
          <StatRow label="Administradores/Jefes" value={stats.totalAdmins} icon="shield-outline" color="#E74C3C" />
          <StatRow label="Técnicos" value={stats.totalTecnicos} icon="construct-outline" color="#3498DB" />
          <StatRow label="Clientes" value={stats.totalClientes} icon="person-outline" color="#2ECC71" />
        </Section>

        {/* 📍 Ubicaciones */}
        <Section title="Ubicaciones" icon="location-outline" color="#3498DB">
          <StatRow label="Total Ubicaciones" value={stats.totalUbicaciones} icon="location-outline" color="#6C5CE7" />
          <StatRow label="Ubicaciones Hoy" value={stats.ubicacionesHoy} icon="calendar-outline" color="#2ECC71" />
        </Section>

        {/* 🏢 Bodegas */}
        <Section title="Bodegas" icon="business-outline" color="#F39C12">
          <StatRow label="Total Bodegas" value={stats.totalBodegas} icon="business-outline" color="#6C5CE7" />
          <StatRow label="Total Materiales" value={stats.totalMateriales} icon="cube-outline" color="#6C5CE7" />
          <StatRow label="Materiales Asignados" value={stats.materialesAsignados} icon="checkmark-circle-outline" color="#2ECC71" />
        </Section>

        {/* 📋 Reportes */}
        <Section title="Reportes" icon="stats-chart-outline" color="#E74C3C">
          <StatRow label="Total Reportes" value={stats.totalReportes} icon="document-text-outline" color="#6C5CE7" />
          <StatRow label="Pendientes" value={stats.reportesPendientes} icon="time-outline" color="#F39C12" />
          <StatRow label="Generados" value={stats.reportesGenerados} icon="checkmark-circle-outline" color="#2ECC71" />
        </Section>

        {/* 📋 Actividad Reciente */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#6C5CE720' }]}>
              <Ionicons name="time-outline" size={20} color="#6C5CE7" />
            </View>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
          </View>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No hay actividad reciente</Text>
          ) : (
            recentActivity.map((item, index) => (
              <View key={index} style={styles.recentItem}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
                  <View style={[styles.recentStatus, { backgroundColor: getEstadoColor(item.estado) + '20' }]}>
                    <Text style={[styles.recentStatusText, { color: getEstadoColor(item.estado) }]}>
                      {getEstadoTexto(item.estado)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recentMac}>📶 {item.mac || 'N/A'}</Text>
                <Text style={styles.recentDate}>
                  {new Date(item.fechaSubida || item.createdAt).toLocaleDateString('es-EC')}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>RA²P v2.0</Text>
          <Text style={styles.footerSubtext}>Dashboard en tiempo real - {new Date().toLocaleDateString('es-EC')}</Text>
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
  // Total Card
  totalCard: {
    backgroundColor: '#6C5CE7',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
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
    textAlign: 'center',
    marginBottom: 10,
  },
  totalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  totalItem: {
    width: '31%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  totalNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalSubLabel: {
    fontSize: 9,
    color: '#FFFFFF90',
    marginTop: 1,
  },
  // Sections
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 6,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  sectionContent: {
    gap: 1,
  },
  // Stat Row
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statRowLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Recent Activity
  recentItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCliente: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
  },
  recentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
  },
  recentStatusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  recentMac: {
    fontSize: 11,
    color: '#636E72',
  },
  recentDate: {
    fontSize: 10,
    color: '#999',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 10,
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#B2BEC3',
    marginTop: 2,
  },
});

export default DashboardScreen;