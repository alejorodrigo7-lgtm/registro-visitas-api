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
    
    console.log('📊 Fechas:', { hoy, inicioSemana, inicioMes });

    // 1. ESTADÍSTICAS DE USUARIOS
    const totalUsuarios = await User.countDocuments();
    const usuariosActivos = await User.countDocuments({ activo: true });
    const usuariosInactivos = await User.countDocuments({ activo: false });
    console.log('📊 Usuarios:', { totalUsuarios, usuariosActivos, usuariosInactivos });

    // 2. ESTADÍSTICAS DE VISITAS
    const visitasHoy = await Visita.countDocuments({
      createdAt: { $gte: hoy }
    });
    const visitasSemana = await Visita.countDocuments({
      createdAt: { $gte: inicioSemana }
    });
    const visitasMes = await Visita.countDocuments({
      createdAt: { $gte: inicioMes }
    });
    const totalVisitas = await Visita.countDocuments();
    console.log('📊 Visitas:', { visitasHoy, visitasSemana, visitasMes, totalVisitas });

    // 3. ESTADÍSTICAS DE ASISTENCIAS
    const asistenciasHoy = await Asistencia.countDocuments({
      fecha: { $gte: hoy }
    });
    const asistenciasSemana = await Asistencia.countDocuments({
      fecha: { $gte: inicioSemana }
    });
    const asistenciasMes = await Asistencia.countDocuments({
      fecha: { $gte: inicioMes }
    });
    const totalAsistencias = await Asistencia.countDocuments();
    console.log('📊 Asistencias:', { asistenciasHoy, asistenciasSemana, asistenciasMes, totalAsistencias });

    // 4. ESTADÍSTICAS DE SERVICIOS POR ESTADO
    console.log('📊 Consultando servicios...');
    const serviciosTomado = await Servicio.countDocuments({ estado: 'TOMADO' });
    const serviciosEjecutado = await Servicio.countDocuments({ estado: 'EJECUTADO' });
    const serviciosPendiente = await Servicio.countDocuments({ estado: 'PENDIENTE' });
    const serviciosRetroalimentado = await Servicio.countDocuments({ estado: 'RETROALIMENTADO' });
    console.log('📊 Servicios:', { serviciosTomado, serviciosEjecutado, serviciosPendiente, serviciosRetroalimentado });

    // 5. ESTADÍSTICAS DE TRANSFERENCIAS POR ESTADO
    console.log('📊 Consultando transferencias...');
    const transferenciasSubida = await Transferencia.countDocuments({ estado: 'SUBIDA' });
    const transferenciasAprobado = await Transferencia.countDocuments({ estado: 'APROBADO' });
    const transferenciasDenegado = await Transferencia.countDocuments({ estado: 'DENEGADO' });
    const transferenciasIngresado = await Transferencia.countDocuments({ estado: 'INGRESADO' });
    console.log('📊 Transferencias:', { transferenciasSubida, transferenciasAprobado, transferenciasDenegado, transferenciasIngresado });

    // 6. ESTADÍSTICAS DE DESCONEXIONES/RECONEXIONES
    console.log('📊 Consultando desconexiones...');
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
    console.log('📊 Desconexiones:', { desconexionesTomadas, reconexionesTomadas, desconexionesEjecutadas, reconexionesEjecutadas });

    // 7. ESTADÍSTICAS DE NOTIFICACIONES
    const notificacionesNoLeidas = await Notificacion.countDocuments({ leida: false });
    const totalNotificaciones = await Notificacion.countDocuments();
    console.log('📊 Notificaciones:', { notificacionesNoLeidas, totalNotificaciones });

    // 8. ESTADÍSTICAS DE AUSENCIAS
    const ausenciasPendientes = await Ausencia.countDocuments({ estado: 'PENDIENTE' });
    const ausenciasAprobadas = await Ausencia.countDocuments({ estado: 'APROBADA' });
    const ausenciasRechazadas = await Ausencia.countDocuments({ estado: 'RECHAZADA' });
    console.log('📊 Ausencias:', { ausenciasPendientes, ausenciasAprobadas, ausenciasRechazadas });

    // 9. RANKINGS
    const tecnicosMasActivos = await Visita.aggregate([
      { $group: { _id: '$tecnico', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    console.log('📊 Técnicos activos:', tecnicosMasActivos.length);

    // 10. RESPONDER CON TODOS LOS DATOS
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
          usuariosMasAsistencias: await Asistencia.aggregate([
            { $group: { _id: '$usuarioNombre', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ]),
          tiposVisita: await Visita.aggregate([
            { $group: { _id: '$tipo', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]),
        },
        fechas: {
          hoy: hoy.toISOString().split('T')[0],
          inicioSemana: inicioSemana.toISOString().split('T')[0],
          inicioMes: inicioMes.toISOString().split('T')[0],
        },
        actualizado: new Date().toISOString(),
      }
    };

    console.log('📊 Enviando respuesta con todos los datos');
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error en dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
