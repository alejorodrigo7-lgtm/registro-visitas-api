const User = require('../models/User');
const Visita = require('../models/Visita');
const Asistencia = require('../models/Asistencia');
const Servicio = require('../models/Servicio');
const Transferencia = require('../models/Transferencia');
const Desconexion = require('../models/Desconexion');
const Notificacion = require('../models/Notificacion');
const Ausencia = require('../models/Ausencia');

// ============================================
// 📊 OBTENER ESTADÍSTICAS DEL DASHBOARD
// ============================================
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Dashboard solicitado');
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // 1. USUARIOS
    const totalUsuarios = await User.countDocuments();
    const usuariosActivos = await User.countDocuments({ activo: true });
    const usuariosInactivos = await User.countDocuments({ activo: false });

    // 2. VISITAS
    const visitasHoy = await Visita.countDocuments({ createdAt: { $gte: hoy } });
    const visitasSemana = await Visita.countDocuments({ createdAt: { $gte: inicioSemana } });
    const visitasMes = await Visita.countDocuments({ createdAt: { $gte: inicioMes } });
    const totalVisitas = await Visita.countDocuments();

    // 3. ASISTENCIAS
    const asistenciasHoy = await Asistencia.countDocuments({ fecha: { $gte: hoy } });
    const asistenciasSemana = await Asistencia.countDocuments({ fecha: { $gte: inicioSemana } });
    const asistenciasMes = await Asistencia.countDocuments({ fecha: { $gte: inicioMes } });
    const totalAsistencias = await Asistencia.countDocuments();

    // 4. SERVICIOS POR ESTADO
    const serviciosTomado = await Servicio.countDocuments({ estado: 'TOMADO' });
    const serviciosEjecutado = await Servicio.countDocuments({ estado: 'EJECUTADO' });
    const serviciosPendiente = await Servicio.countDocuments({ estado: 'PENDIENTE' });
    const serviciosRetroalimentado = await Servicio.countDocuments({ estado: 'RETROALIMENTADO' });

    // 5. TRANSFERENCIAS POR ESTADO
    const transferenciasSubida = await Transferencia.countDocuments({ estado: 'SUBIDA' });
    const transferenciasAprobado = await Transferencia.countDocuments({ estado: 'APROBADO' });
    const transferenciasDenegado = await Transferencia.countDocuments({ estado: 'DENEGADO' });
    const transferenciasIngresado = await Transferencia.countDocuments({ estado: 'INGRESADO' });

    // 6. DESCONEXIONES/RECONEXIONES
    const desconexionesTomadas = await Desconexion.countDocuments({ 
      tipo: 'DESCONEXION',
      estado: 'PENDIENTE' 
    });
    const reconexionesTomadas = await Desconexion.countDocuments({ 
      tipo: 'RECONEXION',
      estado: 'PENDIENTE' 
    });
    const desconexionesEjecutadas = await Desconexion.countDocuments({ 
      tipo: 'DESCONEXION',
      estado: 'EJECUTADO' 
    });
    const reconexionesEjecutadas = await Desconexion.countDocuments({ 
      tipo: 'RECONEXION',
      estado: 'EJECUTADO' 
    });

    // 7. NOTIFICACIONES
    const notificacionesNoLeidas = await Notificacion.countDocuments({ leida: false });
    const totalNotificaciones = await Notificacion.countDocuments();

    // 8. AUSENCIAS
    const ausenciasPendientes = await Ausencia.countDocuments({ estado: 'PENDIENTE' });
    const ausenciasAprobadas = await Ausencia.countDocuments({ estado: 'APROBADA' });
    const ausenciasRechazadas = await Ausencia.countDocuments({ estado: 'RECHAZADA' });

    // 9. RANKINGS
    const tecnicosMasActivos = await Visita.aggregate([
      { $group: { _id: '$tecnico', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const usuariosMasAsistencias = await Asistencia.aggregate([
      { $group: { _id: '$usuarioNombre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const tiposVisita = await Visita.aggregate([
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 10. RESPUESTA COMPLETA
    const responseData = {
      success: true,
      data: {
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
            total: totalVisitas,
          },
          asistencias: {
            hoy: asistenciasHoy,
            semana: asistenciasSemana,
            mes: asistenciasMes,
            total: totalAsistencias,
          },
          notificaciones: {
            noLeidas: notificacionesNoLeidas,
            total: totalNotificaciones,
          },
          ausencias: {
            pendientes: ausenciasPendientes,
            aprobadas: ausenciasAprobadas,
            rechazadas: ausenciasRechazadas,
          },
        },
        servicios: {
          tomado: serviciosTomado,
          ejecutado: serviciosEjecutado,
          pendiente: serviciosPendiente,
          retroalimentado: serviciosRetroalimentado,
        },
        transferencias: {
          subida: transferenciasSubida,
          aprobado: transferenciasAprobado,
          denegado: transferenciasDenegado,
          ingresado: transferenciasIngresado,
        },
        desconexiones: {
          desconexionesTomadas: desconexionesTomadas,
          reconexionesTomadas: reconexionesTomadas,
          desconexionesEjecutadas: desconexionesEjecutadas,
          reconexionesEjecutadas: reconexionesEjecutadas,
        },
        rankings: {
          tecnicosMasActivos: tecnicosMasActivos,
          usuariosMasAsistencias: usuariosMasAsistencias,
          tiposVisita: tiposVisita,
        },
        fechas: {
          hoy: hoy.toISOString().split('T')[0],
          inicioSemana: inicioSemana.toISOString().split('T')[0],
          inicioMes: inicioMes.toISOString().split('T')[0],
        },
        actualizado: new Date().toISOString(),
      }
    };

    console.log('📊 Enviando respuesta con todas las secciones');
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error en dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


