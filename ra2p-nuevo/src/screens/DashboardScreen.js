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
  TextInput,
  FlatList,
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
  
  // ✅ Estado para el submenú
  const [subMenuActual, setSubMenuActual] = useState('resumen');
  
  // ✅ Estado para el modal de envío de correos
  const [modalCorreoVisible, setModalCorreoVisible] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
  const [emailAdicional, setEmailAdicional] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('visitas');

  // ✅ Estado para estadísticas
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
    serviciosHoy: 0,
    serviciosSemana: 0,
    serviciosMes: 0,
    serviciosPorNombre: {},
    
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
    
    // Visitas completas
    totalVisitas: 0,
    totalCobrado: 0,
    visitasMes: 0,
    cobradoMes: 0,
    visitasSemana: 0,
    cobradoSemana: 0,
    visitasHoy: 0,
    cobradoHoy: 0,
    visitasPorTipo: {
      COBRO: 0,
      INSTALACION: 0,
      MANTENIMIENTO: 0,
      OTROS: 0,
    },
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

  // ✅ Cargar usuarios para el selector de correos
  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/users');
      if (response.data.success) {
        const users = response.data.data || [];
        setUsuarios(users);
        setUsuariosFiltrados(users);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
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

      const response = await api.get('/recuperacion/ordenes');
      const todasOrdenes = response.data.data || [];

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
      // 4. SERVICIOS - CORREGIDO CON ESTADÍSTICAS DETALLADAS
      // ============================================
      let totalServicios = 0, serviciosActivos = 0, serviciosFinalizados = 0, serviciosPendientes = 0;
      let serviciosHoy = 0, serviciosSemana = 0, serviciosMes = 0;
      let serviciosPorNombre = {};

      try {
        // ✅ Usar endpoints por estado (funcionan correctamente)
        const [tomadosRes, ejecutadosRes, pendientesRes, retroalimentadosRes] = await Promise.all([
          api.get('/servicios/estado/TOMADO'),
          api.get('/servicios/estado/EJECUTADO'),
          api.get('/servicios/estado/PENDIENTE'),
          api.get('/servicios/estado/RETROALIMENTADO')
        ]);

        const tomados = tomadosRes.data?.data || [];
        const ejecutados = ejecutadosRes.data?.data || [];
        const pendientes = pendientesRes.data?.data || [];
        const retroalimentados = retroalimentadosRes.data?.data || [];

        // Total de servicios (suma de todos los estados)
        totalServicios = tomados.length + ejecutados.length + pendientes.length + retroalimentados.length;

        // TOMADO = Activos (servicios en proceso)
        serviciosActivos = tomados.length;

        // EJECUTADO = Finalizados
        serviciosFinalizados = ejecutados.length;

        // PENDIENTE = Pendientes
        serviciosPendientes = pendientes.length;

        // ✅ COMBINAR TODOS LOS SERVICIOS PARA ESTADÍSTICAS TEMPORALES
        const todosLosServicios = [...tomados, ...ejecutados, ...pendientes, ...retroalimentados];

        // ✅ Calcular servicios por período
        const hoyStr = new Date().toISOString().split('T')[0];
        const semanaAtras = new Date();
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        const mesActual = new Date().getMonth();

        // ✅ Contar servicios por período y por nombre
        todosLosServicios.forEach(s => {
          const fecha = new Date(s.createdAt || s.fechaCreacion || Date.now());
          const fechaStr = fecha.toISOString().split('T')[0];
          const nombreServicio = s.nombreServicio || 'Sin especificar';

          // Inicializar contador por nombre
          if (!serviciosPorNombre[nombreServicio]) {
            serviciosPorNombre[nombreServicio] = {
              total: 0,
              hoy: 0,
              semana: 0,
              mes: 0,
            };
          }

          // Total por nombre
          serviciosPorNombre[nombreServicio].total++;

          // Hoy
          if (fechaStr === hoyStr) {
            serviciosHoy++;
            serviciosPorNombre[nombreServicio].hoy++;
          }

          // Semana
          if (fecha >= semanaAtras) {
            serviciosSemana++;
            serviciosPorNombre[nombreServicio].semana++;
          }

          // Mes
          if (fecha.getMonth() === mesActual) {
            serviciosMes++;
            serviciosPorNombre[nombreServicio].mes++;
          }
        });

        console.log(`📊 Servicios: Total=${totalServicios}, Activos=${serviciosActivos}, Finalizados=${serviciosFinalizados}, Pendientes=${serviciosPendientes}`);
        console.log(`📊 Servicios Hoy: ${serviciosHoy}, Semana: ${serviciosSemana}, Mes: ${serviciosMes}`);
        console.log(`📊 Servicios por nombre:`, serviciosPorNombre);

      } catch (error) {
        console.error('❌ Error al cargar servicios:', error);
        // Si falla, usar valores por defecto
        totalServicios = 0;
        serviciosActivos = 0;
        serviciosFinalizados = 0;
        serviciosPendientes = 0;
        serviciosHoy = 0;
        serviciosSemana = 0;
        serviciosMes = 0;
        serviciosPorNombre = {};
      }

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
      // 12. VISITAS COMPLETAS
      // ============================================
      let totalVisitasData = 0, totalCobradoData = 0;
      let visitasMesCount = 0, cobradoMesCount = 0;
      let visitasSemanaCount = 0, cobradoSemanaCount = 0;
      let visitasHoyCount = 0, cobradoHoyCount = 0;
      let visitasPorTipo = { COBRO: 0, INSTALACION: 0, MANTENIMIENTO: 0, OTROS: 0 };

      try {
        const visitasRes = await api.get('/visitas');
        if (visitasRes.data.success) {
          const visitas = visitasRes.data.data || [];
          totalVisitasData = visitas.length;
          
          const hoyStr = new Date().toISOString().split('T')[0];
          const mesActual = new Date().getMonth();
          const semanaAtras = new Date();
          semanaAtras.setDate(semanaAtras.getDate() - 7);
          
          visitas.forEach(v => {
            const fecha = new Date(v.fecha);
            const fechaStr = fecha.toISOString().split('T')[0];
            const esCobro = v.tipo === 'Cobro';
            const monto = v.monto || 0;
            
            let tipo = v.tipo || 'OTROS';
            let tipoMapeado = 'OTROS';
            if (tipo === 'Cobro') tipoMapeado = 'COBRO';
            else if (tipo === 'Instalación') tipoMapeado = 'INSTALACION';
            else if (tipo === 'Mantenimiento') tipoMapeado = 'MANTENIMIENTO';
            
            visitasPorTipo[tipoMapeado] = (visitasPorTipo[tipoMapeado] || 0) + 1;
            
            if (esCobro) totalCobradoData += monto;
            
            if (fecha.getMonth() === mesActual) {
              visitasMesCount++;
              if (esCobro) cobradoMesCount += monto;
            }
            
            if (fecha >= semanaAtras) {
              visitasSemanaCount++;
              if (esCobro) cobradoSemanaCount += monto;
            }
            
            if (fechaStr === hoyStr) {
              visitasHoyCount++;
              if (esCobro) cobradoHoyCount += monto;
            }
          });
        }
      } catch (error) {
        console.error('Error al cargar visitas:', error);
      }

      // ============================================
      // 13. ACTIVIDAD RECIENTE
      // ============================================
      const sorted = [...ordenesFiltradas].sort((a, b) => 
        new Date(b.fechaSubida || b.createdAt) - new Date(a.fechaSubida || a.createdAt)
      );
      setRecentActivity(sorted.slice(0, 5));

      // ============================================
      // 14. ACTUALIZAR ESTADÍSTICAS
      // ============================================
      setStats({
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
        totalDepositos,
        depositosPendientes,
        depositosAprobados,
        depositosRechazados,
        totalCaja,
        cajaAbierta,
        cajaCerrada,
        saldoTotalCaja,
        totalTransferencias,
        transferenciasPendientes,
        transferenciasAprobadas,
        transferenciasDenegadas,
        totalServicios,
        serviciosActivos,
        serviciosFinalizados,
        serviciosPendientes,
        serviciosHoy,
        serviciosSemana,
        serviciosMes,
        serviciosPorNombre,
        totalDesconexiones,
        desconexionesPendientes,
        desconexionesEjecutadas,
        reconexionesRealizadas,
        totalRecibos,
        recibosPendientes,
        recibosSubidos,
        totalUsuarios,
        totalCoordinadores,
        totalAdmins,
        totalTecnicos,
        totalClientes,
        totalAsistencias,
        asistenciasHoy,
        ausenciasRegistradas,
        totalUbicaciones,
        ubicacionesHoy,
        totalBodegas,
        totalMateriales,
        materialesAsignados,
        totalReportes,
        reportesPendientes,
        reportesGenerados,
        totalVisitas: totalVisitasData,
        totalCobrado: totalCobradoData,
        visitasMes: visitasMesCount,
        cobradoMes: cobradoMesCount,
        visitasSemana: visitasSemanaCount,
        cobradoSemana: cobradoSemanaCount,
        visitasHoy: visitasHoyCount,
        cobradoHoy: cobradoHoyCount,
        visitasPorTipo,
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
    cargarUsuarios();
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [fechaInicio, fechaFin]);

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

  // ✅ Buscar usuarios por nombre o email
  const buscarUsuarios = (texto) => {
    setBusquedaUsuario(texto);
    if (texto.trim() === '') {
      setUsuariosFiltrados(usuarios);
    } else {
      const filtrados = usuarios.filter(u => 
        u.nombre?.toLowerCase().includes(texto.toLowerCase()) ||
        u.email?.toLowerCase().includes(texto.toLowerCase())
      );
      setUsuariosFiltrados(filtrados);
    }
  };

  // ✅ Seleccionar/Deseleccionar usuario
  const toggleUsuarioSeleccionado = (usuario) => {
    const exists = usuariosSeleccionados.find(u => u._id === usuario._id);
    if (exists) {
      setUsuariosSeleccionados(usuariosSeleccionados.filter(u => u._id !== usuario._id));
    } else {
      setUsuariosSeleccionados([...usuariosSeleccionados, usuario]);
    }
  };

  // ✅ Abrir modal de envío de correos
  const abrirModalCorreo = (tipo) => {
    setTipoReporte(tipo);
    setUsuariosSeleccionados([]);
    setEmailAdicional('');
    setBusquedaUsuario('');
    setUsuariosFiltrados(usuarios);
    setModalCorreoVisible(true);
  };

  // ✅ Enviar estadísticas por correo
  const enviarEstadisticasPorCorreo = async () => {
    const emails = [
      ...usuariosSeleccionados.map(u => u.email),
      emailAdicional
    ].filter(e => e && e.trim() !== '');

    if (emails.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un usuario o ingresa un correo adicional');
      return;
    }

    setEnviandoCorreo(true);

    try {
      // Generar reporte según el tipo
      let reporte = generarReporte(tipoReporte);
      
      // Enviar al backend
      const response = await api.post('/email/enviar-reporte', {
        to: emails,
        subject: `📊 Reporte de ${getTituloReporte(tipoReporte)} - ${new Date().toLocaleDateString('es-EC')}`,
        body: reporte,
      });

      if (response.data.success) {
        Alert.alert('✅ Éxito', `Reporte enviado a ${emails.length} destinatario(s)`);
        setModalCorreoVisible(false);
        setUsuariosSeleccionados([]);
        setEmailAdicional('');
      } else {
        Alert.alert('Error', 'No se pudo enviar el reporte');
      }
    } catch (error) {
      console.error('Error al enviar reporte:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar el reporte');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  // ✅ Generar reporte según el tipo
  const generarReporte = (tipo) => {
    const fecha = new Date().toLocaleDateString('es-EC');
    let reporte = `📊 REPORTE DE ${getTituloReporte(tipo).toUpperCase()} - RA²P\n`;
    reporte += `====================================\n`;
    reporte += `Fecha: ${fecha}\n\n`;

    switch (tipo) {
      case 'visitas':
        reporte += `📌 TOTALES GENERALES\n`;
        reporte += `- Total Visitas: ${stats.totalVisitas}\n`;
        reporte += `- Total Cobrado: $${stats.totalCobrado.toFixed(2)}\n\n`;
        reporte += `📆 ESTE MES\n`;
        reporte += `- Visitas del Mes: ${stats.visitasMes}\n`;
        reporte += `- Cobrado del Mes: $${stats.cobradoMes.toFixed(2)}\n\n`;
        reporte += `📅 ÚLTIMA SEMANA\n`;
        reporte += `- Visitas de la Semana: ${stats.visitasSemana}\n`;
        reporte += `- Cobrado de la Semana: $${stats.cobradoSemana.toFixed(2)}\n\n`;
        reporte += `📌 HOY\n`;
        reporte += `- Visitas de Hoy: ${stats.visitasHoy}\n`;
        reporte += `- Cobrado de Hoy: $${stats.cobradoHoy.toFixed(2)}\n\n`;
        reporte += `📋 POR TIPO DE VISITA\n`;
        reporte += `- COBRO: ${stats.visitasPorTipo?.COBRO || 0}\n`;
        reporte += `- INSTALACIÓN: ${stats.visitasPorTipo?.INSTALACION || 0}\n`;
        reporte += `- MANTENIMIENTO: ${stats.visitasPorTipo?.MANTENIMIENTO || 0}\n`;
        reporte += `- OTROS: ${stats.visitasPorTipo?.OTROS || 0}\n`;
        break;

      case 'cajas':
        reporte += `💰 CAJA / DEPÓSITOS\n`;
        reporte += `- Total Depósitos: ${stats.totalDepositos}\n`;
        reporte += `- Depósitos Pendientes: ${stats.depositosPendientes}\n`;
        reporte += `- Depósitos Aprobados: ${stats.depositosAprobados}\n`;
        reporte += `- Depósitos Rechazados: ${stats.depositosRechazados}\n\n`;
        reporte += `📋 CUADRES DE CAJA\n`;
        reporte += `- Total Cuadres: ${stats.totalCaja}\n`;
        reporte += `- Caja Abierta: ${stats.cajaAbierta}\n`;
        reporte += `- Caja Cerrada: ${stats.cajaCerrada}\n`;
        reporte += `- Saldo Total: $${stats.saldoTotalCaja.toFixed(2)}\n`;
        break;

      case 'transferencias':
        reporte += `🔄 TRANSFERENCIAS\n`;
        reporte += `- Total Transferencias: ${stats.totalTransferencias}\n`;
        reporte += `- Pendientes: ${stats.transferenciasPendientes}\n`;
        reporte += `- Aprobadas: ${stats.transferenciasAprobadas}\n`;
        reporte += `- Denegadas: ${stats.transferenciasDenegadas}\n`;
        break;

      case 'servicios':
        reporte += `🛠 SERVICIOS\n`;
        reporte += `====================================\n`;
        reporte += `📌 POR PERÍODO\n`;
        reporte += `- Total Servicios: ${stats.totalServicios}\n`;
        reporte += `- Servicios de Hoy: ${stats.serviciosHoy}\n`;
        reporte += `- Servicios de la Semana: ${stats.serviciosSemana}\n`;
        reporte += `- Servicios del Mes: ${stats.serviciosMes}\n\n`;
        reporte += `📋 POR ESTADO\n`;
        reporte += `- Activos (TOMADO): ${stats.serviciosActivos}\n`;
        reporte += `- Finalizados (EJECUTADO): ${stats.serviciosFinalizados}\n`;
        reporte += `- Pendientes: ${stats.serviciosPendientes}\n`;
        reporte += `- Retroalimentados: ${stats.totalServicios - stats.serviciosActivos - stats.serviciosFinalizados - stats.serviciosPendientes}\n\n`;
        reporte += `📋 POR TIPO DE SERVICIO\n`;
        const tipos = stats.serviciosPorNombre || {};
        if (Object.keys(tipos).length === 0) {
          reporte += `- No hay servicios registrados\n`;
        } else {
          Object.entries(tipos).forEach(([nombre, datos]) => {
            reporte += `- ${nombre}: Total ${datos.total} | Hoy ${datos.hoy} | Semana ${datos.semana} | Mes ${datos.mes}\n`;
          });
        }
        break;

      case 'desconexiones':
        reporte += `🔌 DESCONEXIONES / RECONEXIONES\n`;
        reporte += `- Total Desconexiones: ${stats.totalDesconexiones}\n`;
        reporte += `- Pendientes: ${stats.desconexionesPendientes}\n`;
        reporte += `- Ejecutadas: ${stats.desconexionesEjecutadas}\n`;
        reporte += `- Reconexiones: ${stats.reconexionesRealizadas}\n`;
        break;

      case 'recibos':
        reporte += `📄 RECIBOS SOLICITADOS\n`;
        reporte += `- Total Recibos: ${stats.totalRecibos}\n`;
        reporte += `- Pendientes: ${stats.recibosPendientes}\n`;
        reporte += `- Subidos: ${stats.recibosSubidos}\n`;
        break;

      case 'recuperacion':
        reporte += `📦 RECUPERACIÓN DE EQUIPOS\n`;
        reporte += `- Total Órdenes: ${stats.totalOrdenes}\n`;
        reporte += `- Asignadas: ${stats.ordenesAsignadas}\n`;
        reporte += `- No Retirado: ${stats.ordenesNoRetirado}\n`;
        reporte += `- Retirados: ${stats.ordenesRetirado}\n`;
        reporte += `- Anulados: ${stats.ordenesAnulado}\n`;
        reporte += `- Reconectados: ${stats.ordenesReconectado}\n\n`;
        reporte += `📋 VISITAS\n`;
        reporte += `- Visitas Realizadas: ${stats.visitasRealizadas}\n`;
        reporte += `- Visitas del Mes: ${stats.visitasMes}\n`;
        reporte += `- Clientes Atendidos: ${stats.clientesAtendidos}\n`;
        reporte += `- Promedio Visitas/Orden: ${stats.promedioVisitas}\n`;
        break;

      default:
        reporte += `Sin datos disponibles\n`;
    }

    reporte += `\n====================================\n`;
    reporte += `Reporte generado automáticamente desde RA²P\n`;
    return reporte;
  };

  const getTituloReporte = (tipo) => {
    const titulos = {
      'visitas': 'Visitas',
      'cajas': 'Caja / Depósitos',
      'transferencias': 'Transferencias',
      'servicios': 'Servicios',
      'desconexiones': 'Desconexiones',
      'recibos': 'Recibos',
      'recuperacion': 'Recuperación de Equipos'
    };
    return titulos[tipo] || 'Estadísticas';
  };

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

  // ✅ Botón de Enviar Correo
  const EmailButton = ({ tipo }) => (
    <TouchableOpacity
      style={styles.emailButton}
      onPress={() => abrirModalCorreo(tipo)}
    >
      <Ionicons name="mail-outline" size={16} color="#FFFFFF" />
      <Text style={styles.emailButtonText}>Enviar Estadísticas</Text>
    </TouchableOpacity>
  );

  // ✅ Renderizar contenido según submenú
  const renderContenido = () => {
    switch (subMenuActual) {
      case 'visitas':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>📊 Estadísticas de Visitas</Text>
              <EmailButton tipo="visitas" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Totales Generales</Text>
              <StatRow label="Total Visitas" value={stats.totalVisitas} icon="eye-outline" color="#6C5CE7" />
              <StatRow label="Total Cobrado" value={`$${stats.totalCobrado.toFixed(2)}`} icon="cash-outline" color="#00B894" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📆 Este Mes</Text>
              <StatRow label="Visitas del Mes" value={stats.visitasMes} icon="calendar-outline" color="#6C5CE7" />
              <StatRow label="Cobrado del Mes" value={`$${stats.cobradoMes.toFixed(2)}`} icon="cash-outline" color="#00B894" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📅 Última Semana</Text>
              <StatRow label="Visitas de la Semana" value={stats.visitasSemana} icon="calendar-outline" color="#6C5CE7" />
              <StatRow label="Cobrado de la Semana" value={`$${stats.cobradoSemana.toFixed(2)}`} icon="cash-outline" color="#00B894" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Hoy</Text>
              <StatRow label="Visitas de Hoy" value={stats.visitasHoy} icon="today-outline" color="#6C5CE7" />
              <StatRow label="Cobrado de Hoy" value={`$${stats.cobradoHoy.toFixed(2)}`} icon="cash-outline" color="#00B894" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📋 Por Tipo de Visita</Text>
              <StatRow label="💲 COBRO" value={stats.visitasPorTipo?.COBRO || 0} icon="cash-outline" color="#00B894" />
              <StatRow label="🔧 INSTALACIÓN" value={stats.visitasPorTipo?.INSTALACION || 0} icon="construct-outline" color="#3498DB" />
              <StatRow label="🛠 MANTENIMIENTO" value={stats.visitasPorTipo?.MANTENIMIENTO || 0} icon="settings-outline" color="#F39C12" />
              <StatRow label="📌 OTROS" value={stats.visitasPorTipo?.OTROS || 0} icon="ellipsis-horizontal-outline" color="#95A5A6" />
            </View>
          </View>
        );

      case 'cajas':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>💰 Estadísticas de Caja / Depósitos</Text>
              <EmailButton tipo="cajas" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Depósitos</Text>
              <StatRow label="Total Depósitos" value={stats.totalDepositos} icon="document-text-outline" color="#6C5CE7" />
              <StatRow label="Pendientes" value={stats.depositosPendientes} icon="time-outline" color="#F39C12" />
              <StatRow label="Aprobados" value={stats.depositosAprobados} icon="checkmark-circle-outline" color="#2ECC71" />
              <StatRow label="Rechazados" value={stats.depositosRechazados} icon="close-circle-outline" color="#E74C3C" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📋 Cuadres de Caja</Text>
              <StatRow label="Total Cuadres" value={stats.totalCaja} icon="document-text-outline" color="#6C5CE7" />
              <StatRow label="Caja Abierta" value={stats.cajaAbierta} icon="lock-open-outline" color="#F39C12" />
              <StatRow label="Caja Cerrada" value={stats.cajaCerrada} icon="lock-closed-outline" color="#2ECC71" />
              <StatRow label="Saldo Total" value={`$${stats.saldoTotalCaja.toFixed(2)}`} icon="cash-outline" color="#6C5CE7" />
            </View>
          </View>
        );

      case 'transferencias':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>🔄 Estadísticas de Transferencias</Text>
              <EmailButton tipo="transferencias" />
            </View>
            <StatRow label="Total Transferencias" value={stats.totalTransferencias} icon="swap-horizontal-outline" color="#6C5CE7" />
            <StatRow label="Pendientes" value={stats.transferenciasPendientes} icon="time-outline" color="#F39C12" />
            <StatRow label="Aprobadas" value={stats.transferenciasAprobadas} icon="checkmark-circle-outline" color="#2ECC71" />
            <StatRow label="Denegadas" value={stats.transferenciasDenegadas} icon="close-circle-outline" color="#E74C3C" />
          </View>
        );

      case 'servicios':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>🛠 Estadísticas de Servicios</Text>
              <EmailButton tipo="servicios" />
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Por Período</Text>
              <StatRow label="Total Servicios" value={stats.totalServicios} icon="construct-outline" color="#6C5CE7" />
              <StatRow label="Servicios de Hoy" value={stats.serviciosHoy} icon="today-outline" color="#F39C12" />
              <StatRow label="Servicios de la Semana" value={stats.serviciosSemana} icon="calendar-outline" color="#3498DB" />
              <StatRow label="Servicios del Mes" value={stats.serviciosMes} icon="calendar-outline" color="#2ECC71" />
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📋 Por Estado</Text>
              <StatRow label="🟡 Activos (TOMADO)" value={stats.serviciosActivos} icon="play-circle-outline" color="#F39C12" />
              <StatRow label="🟢 Finalizados (EJECUTADO)" value={stats.serviciosFinalizados} icon="checkmark-circle-outline" color="#2ECC71" />
              <StatRow label="🔴 Pendientes" value={stats.serviciosPendientes} icon="time-outline" color="#E74C3C" />
              <StatRow label="🔵 Retroalimentados" value={stats.totalServicios - stats.serviciosActivos - stats.serviciosFinalizados - stats.serviciosPendientes} icon="chatbubble-outline" color="#3498DB" />
            </View>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📋 Por Tipo de Servicio</Text>
              {Object.keys(stats.serviciosPorNombre || {}).length === 0 ? (
                <Text style={styles.emptyText}>No hay servicios registrados</Text>
              ) : (
                Object.entries(stats.serviciosPorNombre || {}).map(([nombre, datos]) => (
                  <View key={nombre} style={styles.servicioTipoItem}>
                    <Text style={styles.servicioTipoNombre}>{nombre}</Text>
                    <View style={styles.servicioTipoDetalles}>
                      <Text style={styles.servicioTipoCantidad}>Total: {datos.total}</Text>
                      <Text style={styles.servicioTipoCantidad}>Hoy: {datos.hoy}</Text>
                      <Text style={styles.servicioTipoCantidad}>Semana: {datos.semana}</Text>
                      <Text style={styles.servicioTipoCantidad}>Mes: {datos.mes}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        );

      case 'desconexiones':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>🔌 Estadísticas de Desconexiones / Reconexiones</Text>
              <EmailButton tipo="desconexiones" />
            </View>
            <StatRow label="Total Desconexiones" value={stats.totalDesconexiones} icon="power-outline" color="#6C5CE7" />
            <StatRow label="Pendientes" value={stats.desconexionesPendientes} icon="time-outline" color="#F39C12" />
            <StatRow label="Ejecutadas" value={stats.desconexionesEjecutadas} icon="checkmark-circle-outline" color="#2ECC71" />
            <StatRow label="Reconexiones" value={stats.reconexionesRealizadas} icon="wifi-outline" color="#3498DB" />
          </View>
        );

      case 'recibos':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>📄 Estadísticas de Recibos</Text>
              <EmailButton tipo="recibos" />
            </View>
            <StatRow label="Total Recibos" value={stats.totalRecibos} icon="document-text-outline" color="#6C5CE7" />
            <StatRow label="Pendientes" value={stats.recibosPendientes} icon="time-outline" color="#F39C12" />
            <StatRow label="Subidos" value={stats.recibosSubidos} icon="cloud-upload-outline" color="#2ECC71" />
          </View>
        );

      case 'recuperacion':
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>📦 Estadísticas de Recuperación de Equipos</Text>
              <EmailButton tipo="recuperacion" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Órdenes</Text>
              <StatRow label="Total Órdenes" value={stats.totalOrdenes} icon="document-text-outline" color="#6C5CE7" />
              <StatRow label="Asignadas" value={stats.ordenesAsignadas} icon="time-outline" color="#F39C12" />
              <StatRow label="No Retirado" value={stats.ordenesNoRetirado} icon="alert-circle-outline" color="#E74C3C" />
              <StatRow label="Retirados" value={stats.ordenesRetirado} icon="checkmark-circle-outline" color="#2ECC71" />
              <StatRow label="Anulados" value={stats.ordenesAnulado} icon="close-circle-outline" color="#E74C3C" />
              <StatRow label="Reconectados" value={stats.ordenesReconectado} icon="wifi-outline" color="#3498DB" />
            </View>
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📋 Visitas</Text>
              <StatRow label="Visitas Realizadas" value={stats.visitasRealizadas} icon="eye-outline" color="#6C5CE7" />
              <StatRow label="Visitas del Mes" value={stats.visitasMes} icon="calendar-outline" color="#6C5CE7" />
              <StatRow label="Clientes Atendidos" value={stats.clientesAtendidos} icon="people-outline" color="#2ECC71" />
              <StatRow label="Promedio Visitas/Orden" value={stats.promedioVisitas} icon="stats-chart-outline" color="#F39C12" />
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.vistaContainer}>
            <View style={styles.vistaHeader}>
              <Text style={styles.vistaTitle}>📊 Resumen General</Text>
            </View>
            <View style={styles.totalCard}>
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
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>📌 Últimas Actividades</Text>
              {recentActivity.slice(0, 3).map((item, index) => (
                <View key={index} style={styles.recentItem}>
                  <Text style={styles.recentCliente}>{item.cliente?.nombre || 'Sin nombre'}</Text>
                  <Text style={styles.recentDate}>
                    {new Date(item.fechaSubida || item.createdAt).toLocaleDateString('es-EC')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
    }
  };

  // ✅ SUBMENÚ
  const SubMenu = () => (
    <View style={styles.subMenuContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subMenuScroll}>
        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'resumen' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('resumen')}
        >
          <Ionicons name="home-outline" size={16} color={subMenuActual === 'resumen' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'resumen' && styles.subMenuItemTextActive]}>Resumen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'visitas' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('visitas')}
        >
          <Ionicons name="eye-outline" size={16} color={subMenuActual === 'visitas' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'visitas' && styles.subMenuItemTextActive]}>Visitas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'cajas' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('cajas')}
        >
          <Ionicons name="cash-outline" size={16} color={subMenuActual === 'cajas' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'cajas' && styles.subMenuItemTextActive]}>Cajas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'transferencias' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('transferencias')}
        >
          <Ionicons name="swap-horizontal-outline" size={16} color={subMenuActual === 'transferencias' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'transferencias' && styles.subMenuItemTextActive]}>Transferencias</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'servicios' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('servicios')}
        >
          <Ionicons name="construct-outline" size={16} color={subMenuActual === 'servicios' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'servicios' && styles.subMenuItemTextActive]}>Servicios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'desconexiones' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('desconexiones')}
        >
          <Ionicons name="power-outline" size={16} color={subMenuActual === 'desconexiones' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'desconexiones' && styles.subMenuItemTextActive]}>Desconexiones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'recibos' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('recibos')}
        >
          <Ionicons name="document-text-outline" size={16} color={subMenuActual === 'recibos' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'recibos' && styles.subMenuItemTextActive]}>Recibos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subMenuItem, subMenuActual === 'recuperacion' && styles.subMenuItemActive]}
          onPress={() => setSubMenuActual('recuperacion')}
        >
          <Ionicons name="hardware-chip-outline" size={16} color={subMenuActual === 'recuperacion' ? '#6C5CE7' : '#636E72'} />
          <Text style={[styles.subMenuItemText, subMenuActual === 'recuperacion' && styles.subMenuItemTextActive]}>Recuperación</Text>
        </TouchableOpacity>
      </ScrollView>
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

      {/* Submenú */}
      <SubMenu />

      {/* Contenido */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderContenido()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>RA²P v2.0</Text>
          <Text style={styles.footerSubtext}>Dashboard en tiempo real - {new Date().toLocaleDateString('es-EC')}</Text>
        </View>
      </ScrollView>

      {/* ✅ MODAL PARA ENVIAR CORREO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCorreoVisible}
        onRequestClose={() => setModalCorreoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📧 Enviar Reporte por Correo</Text>
            <Text style={styles.modalSubtitle}>
              Reporte: {getTituloReporte(tipoReporte)}
            </Text>

            {/* Buscador de usuarios */}
            <Text style={styles.modalLabel}>👥 Seleccionar usuarios:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="🔍 Buscar por nombre o correo..."
              value={busquedaUsuario}
              onChangeText={buscarUsuarios}
            />

            <FlatList
              data={usuariosFiltrados}
              keyExtractor={(item) => item._id}
              style={styles.usuariosList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.usuarioItem,
                    usuariosSeleccionados.find(u => u._id === item._id) && styles.usuarioItemSelected
                  ]}
                  onPress={() => toggleUsuarioSeleccionado(item)}
                >
                  <View>
                    <Text style={styles.usuarioNombre}>{item.nombre || item.email}</Text>
                    <Text style={styles.usuarioEmail}>{item.email}</Text>
                  </View>
                  {usuariosSeleccionados.find(u => u._id === item._id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#00B894" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron usuarios</Text>
              }
            />

            {/* Correo adicional */}
            <Text style={styles.modalLabel}>✉️ Correo adicional:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="correo@ejemplo.com"
              value={emailAdicional}
              onChangeText={setEmailAdicional}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.modalInfo}>
              {usuariosSeleccionados.length} usuario(s) seleccionado(s)
              {emailAdicional ? ` + ${emailAdicional}` : ''}
            </Text>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelar]}
                onPress={() => {
                  setModalCorreoVisible(false);
                  setUsuariosSeleccionados([]);
                  setEmailAdicional('');
                }}
                disabled={enviandoCorreo}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalEnviar]}
                onPress={enviarEstadisticasPorCorreo}
                disabled={enviandoCorreo}
              >
                {enviandoCorreo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>📧 Enviar</Text>
                )}
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
  // Submenú
  subMenuContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subMenuScroll: {
    paddingHorizontal: 12,
    gap: 4,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    backgroundColor: '#F5F7FA',
    marginRight: 6,
  },
  subMenuItemActive: {
    backgroundColor: '#6C5CE720',
  },
  subMenuItemText: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  subMenuItemTextActive: {
    color: '#6C5CE7',
    fontWeight: '600',
  },
  // Total Card
  totalCard: {
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
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
  // Vista contenedor
  vistaContainer: {
    paddingHorizontal: 16,
  },
  vistaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  vistaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  // Email Button
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  // Stat Row
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statRowLabel: {
    fontSize: 13,
    color: '#636E72',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Sub sección
  subSection: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 6,
  },
  // Servicio por tipo
  servicioTipoItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  servicioTipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  servicioTipoDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicioTipoCantidad: {
    fontSize: 12,
    color: '#636E72',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  // Recent Activity
  recentItem: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  recentCliente: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  recentDate: {
    fontSize: 12,
    color: '#999',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  usuariosList: {
    maxHeight: 200,
    marginVertical: 8,
  },
  usuarioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 4,
  },
  usuarioItemSelected: {
    backgroundColor: '#E8F8F5',
    borderWidth: 1,
    borderColor: '#00B894',
  },
  usuarioNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  usuarioEmail: {
    fontSize: 12,
    color: '#636E72',
  },
  modalInfo: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    marginVertical: 8,
  },
  modalBotones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelar: {
    backgroundColor: '#DFE6E9',
  },
  modalEnviar: {
    backgroundColor: '#6C5CE7',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
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