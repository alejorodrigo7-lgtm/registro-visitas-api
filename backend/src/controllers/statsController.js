const User = require('../models/User');
const Visita = require('../models/Visita');
const Asistencia = require('../models/Asistencia');
const Monserrath = require('../models/Monserrath');
const PedirAusencia = require('../models/PedirAusencia');
const Notificacion = require('../models/Notificacion');
const logger = require('../config/logger');

// ============================================
// 📊 FUNCIÓN PARA OBTENER FECHA LOCAL
// ============================================
const getFechaStr = () => {
  const d = new Date();
  const fecha = new Date(d.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================
// 📊 OBTENER ESTADÍSTICAS DEL DASHBOARD
// ============================================
exports.getDashboardStats = async (req, res) => {
  try {
    const startTime = Date.now();
    logger.info('📊 Dashboard solicitado', { 
      usuario: req.user.email,
      rol: req.user.rol
    });

    // Fechas para cálculos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());
    
    const fechaStr = getFechaStr();

    // Ejecutar todas las consultas en paralelo
    const [
      totalUsuarios,
      usuariosActivos,
      usuariosInactivos,
      visitasHoy,
      visitasSemana,
      visitasMes,
      visitasTotales,
      asistenciasHoy,
      asistenciasSemana,
      asistenciasMes,
      asistenciasTotales,
      monserrathHoy,
      monserrathSemana,
      monserrathMes,
      ausenciasPendientes,
      ausenciasAprobadas,
      ausenciasRechazadas,
      notificacionesNoLeidas,
      notificacionesTotales,
      visitasPorTecnico,
      asistenciasPorUsuario,
      visitasPorTipo,
    ] = await Promise.all([
      // Usuarios
      User.countDocuments(),
      User.countDocuments({ activo: true }),
      User.countDocuments({ activo: false }),
      
      // Visitas
      Visita.countDocuments({ fecha: { $gte: today } }),
      Visita.countDocuments({ fecha: { $gte: firstDayOfWeek } }),
      Visita.countDocuments({ fecha: { $gte: firstDayOfMonth } }),
      Visita.countDocuments(),
      
      // Asistencias
      Asistencia.countDocuments({ fechaStr: fechaStr }),
      Asistencia.countDocuments({ fechaStr: { $gte: firstDayOfWeek.toISOString().split('T')[0] } }),
      Asistencia.countDocuments({ fechaStr: { $gte: firstDayOfMonth.toISOString().split('T')[0] } }),
      Asistencia.countDocuments(),
      
      // Monserrath
      Monserrath.countDocuments({ fecha: { $gte: today } }),
      Monserrath.countDocuments({ fecha: { $gte: firstDayOfWeek } }),
      Monserrath.countDocuments({ fecha: { $gte: firstDayOfMonth } }),
      
      // Ausencias
      PedirAusencia.countDocuments({ estado: 'Pendiente' }),
      PedirAusencia.countDocuments({ estado: 'Aprobado' }),
      PedirAusencia.countDocuments({ estado: 'Rechazado' }),
      
      // Notificaciones
      Notificacion.countDocuments({ usuario: req.user._id, leida: false }),
      Notificacion.countDocuments({ usuario: req.user._id }),
      
      // Visitas por técnico (top 5)
      Visita.aggregate([
        { $match: { fecha: { $gte: today } } },
        { $group: { _id: '$tecnicoNombre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Asistencias por usuario (top 5)
      Asistencia.aggregate([
        { $match: { fechaStr: fechaStr } },
        { $group: { _id: '$usuarioNombre', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      
      // Visitas por tipo
      Visita.aggregate([
        { $match: { fecha: { $gte: today } } },
        { $group: { _id: '$tipo', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Calcular tendencias (comparación con día anterior)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const visitasAyer = await Visita.countDocuments({ fecha: { $gte: yesterday, $lt: today } });
    const tendenciaVisitas = visitasHoy > visitasAyer ? 'subiendo' : visitasHoy < visitasAyer ? 'bajando' : 'estable';
    const porcentajeVisitas = visitasAyer > 0 ? ((visitasHoy - visitasAyer) / visitasAyer * 100).toFixed(1) : 0;

    const asistenciasAyer = await Asistencia.countDocuments({ fechaStr: yesterday.toISOString().split('T')[0] });
    const tendenciaAsistencias = asistenciasHoy > asistenciasAyer ? 'subiendo' : asistenciasHoy < asistenciasAyer ? 'bajando' : 'estable';
    const porcentajeAsistencias = asistenciasAyer > 0 ? ((asistenciasHoy - asistenciasAyer) / asistenciasAyer * 100).toFixed(1) : 0;

    const stats = {
      // 📊 Resumen general
      resumen: {
        usuarios: {
          total: totalUsuarios,
          activos: usuariosActivos,
          inactivos: usuariosInactivos,
          porcentajeActivos: totalUsuarios > 0 ? ((usuariosActivos / totalUsuarios) * 100).toFixed(1) : 0,
        },
        visitas: {
          hoy: visitasHoy,
          semana: visitasSemana,
          mes: visitasMes,
          total: visitasTotales,
          tendencia: {
            porcentaje: porcentajeVisitas,
            direccion: tendenciaVisitas,
          }
        },
        asistencias: {
          hoy: asistenciasHoy,
          semana: asistenciasSemana,
          mes: asistenciasMes,
          total: asistenciasTotales,
          tendencia: {
            porcentaje: porcentajeAsistencias,
            direccion: tendenciaAsistencias,
          }
        },
        monserrath: {
          hoy: monserrathHoy,
          semana: monserrathSemana,
          mes: monserrathMes,
        },
        ausencias: {
          pendientes: ausenciasPendientes,
          aprobadas: ausenciasAprobadas,
          rechazadas: ausenciasRechazadas,
        },
        notificaciones: {
          noLeidas: notificacionesNoLeidas,
          total: notificacionesTotales,
        }
      },
      
      // 📈 Rankings
      rankings: {
        tecnicosMasActivos: visitasPorTecnico,
        usuariosMasAsistencias: asistenciasPorUsuario,
        tiposVisita: visitasPorTipo,
      },
      
      // 📅 Fechas
      fechas: {
        hoy: fechaStr,
        inicioSemana: firstDayOfWeek.toISOString().split('T')[0],
        inicioMes: firstDayOfMonth.toISOString().split('T')[0],
      },
      
      // 🕐 Timestamp
      actualizado: new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    logger.performance('dashboard', duration, {
      usuario: req.user.email,
      visitas: visitasHoy,
      asistencias: asistenciasHoy
    });

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.errorWithContext('Error en dashboard', error, {
      usuario: req.user?.email
    });
    console.error('❌ Error en dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📊 OBTENER ESTADÍSTICAS POR TÉCNICO
// ============================================
exports.getStatsByTecnico = async (req, res) => {
  try {
    const { tecnicoId, fechaInicio, fechaFin } = req.query;
    
    let query = {};
    if (tecnicoId) query.tecnico = tecnicoId;
    if (fechaInicio && fechaFin) {
      query.fecha = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin),
      };
    }

    const stats = await Visita.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$tecnico',
          tecnicoNombre: { $first: '$tecnicoNombre' },
          totalVisitas: { $sum: 1 },
          totalMonto: { $sum: '$monto' },
          tipos: { 
            $push: { tipo: '$tipo', monto: '$monto' }
          }
        }
      },
      { $sort: { totalVisitas: -1 } }
    ]);

    logger.info('📊 Estadísticas por técnico solicitadas', {
      usuario: req.user.email,
      tecnicoId: tecnicoId || 'todos'
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.errorWithContext('Error en stats por técnico', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📊 OBTENER ESTADÍSTICAS DE VISITAS POR FECHAS
// ============================================
exports.getStatsVisitas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, tecnico } = req.query;
    
    let match = {};
    if (fechaInicio && fechaFin) {
      match.fecha = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin),
      };
    }
    if (tecnico) match.tecnico = tecnico;

    const stats = await Visita.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
          total: { $sum: 1 },
          montoTotal: { $sum: '$monto' },
          promedio: { $avg: '$monto' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.errorWithContext('Error en stats de visitas', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📊 OBTENER ESTADÍSTICAS DE ASISTENCIA
// ============================================
exports.getStatsAsistencia = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario } = req.query;
    
    let match = {};
    if (fechaInicio && fechaFin) {
      match.fechaStr = { $gte: fechaInicio, $lte: fechaFin };
    }
    if (usuario) match.usuario = usuario;

    const stats = await Asistencia.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$fechaStr',
          total: { $sum: 1 },
          completos: {
            $sum: {
              $cond: [{ $eq: ['$estado', 'Completo'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.errorWithContext('Error en stats de asistencia', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};