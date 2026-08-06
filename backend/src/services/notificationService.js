// backend/src/services/notificationService.js
const logger = require('../config/logger');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const fcmService = require('./fcmService');

// ============================================
// 📱 GUARDAR NOTIFICACIÓN EN BASE DE DATOS
// ============================================
const guardarNotificacion = async (userId, titulo, mensaje, tipo = 'sistema', datos = {}) => {
  try {
    const notificacion = new Notificacion({
      usuario: userId,
      titulo,
      mensaje,
      tipo,
      datos,
      leida: false,
      fecha: new Date(),
    });
    await notificacion.save();
    logger.info('📝 Notificación guardada en DB', {
      userId,
      tipo,
      notificacionId: notificacion._id
    });
    return notificacion;
  } catch (error) {
    logger.error('Error guardando notificación en DB', { userId, titulo, error: error.message });
    return null;
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A UN USUARIO (USANDO FCM)
// ============================================
const enviarNotificacion = async (userId, titulo, mensaje, datos = {}, tipo = 'sistema') => {
  try {
    // 1. Guardar en base de datos
    const notificacionDB = await guardarNotificacion(userId, titulo, mensaje, tipo, datos);

    // 2. Buscar el usuario
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('Usuario no encontrado para notificación', { userId });
      return {
        success: false,
        message: 'Usuario no encontrado',
        dbSaved: !!notificacionDB,
        notificacionId: notificacionDB?._id
      };
    }

    // 3. Verificar si tiene token push
    if (!user.pushToken) {
      logger.warn('Usuario sin token push registrado', {
        userId,
        email: user.email
      });
      return {
        success: false,
        message: 'Usuario sin token push',
        dbSaved: !!notificacionDB,
        notificacionId: notificacionDB?._id
      };
    }

    console.log('📤 Enviando notificación FCM a:', user.email);
    console.log('📱 Token:', user.pushToken.substring(0, 20) + '...');

    // 4. Enviar usando FCM
    const result = await fcmService.sendFCMNotification(
      user.pushToken,
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      {
        ...datos,
        notificacionId: notificacionDB?._id?.toString(),
        timestamp: new Date().toISOString(),
        userId: user._id.toString(),
        tipo: tipo,
      }
    );

    // 5. Si el token es inválido, limpiarlo
    if (result.code === 'messaging/invalid-registration-token') {
      await User.findByIdAndUpdate(userId, { pushToken: null });
      console.log(`🧹 Token inválido eliminado para ${user.email}`);
      return {
        success: false,
        message: 'Token inválido eliminado',
        dbSaved: !!notificacionDB,
        notificacionId: notificacionDB?._id
      };
    }

    logger.info('📱 Notificación FCM enviada', {
      userId: user._id,
      email: user.email,
      titulo,
      notificacionId: notificacionDB?._id,
      fcmSuccess: result.success
    });

    return {
      success: result.success,
      message: result.success ? 'Notificación enviada' : 'Error enviando notificación',
      userId: user._id,
      email: user.email,
      notificacionId: notificacionDB?._id,
      dbSaved: true,
      fcmResult: result
    };

  } catch (error) {
    logger.error('Error enviando notificación FCM', { userId, titulo, error: error.message });
    return {
      success: false,
      message: error.message,
      dbSaved: false
    };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A MÚLTIPLES USUARIOS
// ============================================
const enviarNotificacionMultiple = async (userIds, titulo, mensaje, datos = {}, tipo = 'sistema') => {
  try {
    // 1. Guardar notificaciones en DB para cada usuario
    const dbResults = [];
    for (const userId of userIds) {
      const notif = await guardarNotificacion(userId, titulo, mensaje, tipo, datos);
      if (notif) dbResults.push(notif);
    }

    // 2. Buscar todos los usuarios
    const users = await User.find({ _id: { $in: userIds } });

    // 3. Filtrar usuarios con token válido
    const tokens = users
      .filter(user => user.pushToken)
      .map(user => user.pushToken);

    if (tokens.length === 0) {
      logger.warn('No hay tokens válidos para enviar notificaciones', {
        usuarios: userIds.length,
        tokensValidos: 0,
        dbSaved: dbResults.length
      });
      return {
        success: false,
        message: 'No hay tokens válidos',
        dbSaved: dbResults.length
      };
    }

    // 4. Enviar usando FCM
    const result = await fcmService.sendMultipleFCMNotifications(
      tokens,
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      {
        ...datos,
        timestamp: new Date().toISOString(),
        tipo: tipo,
      }
    );

    logger.info('📱 Notificaciones FCM múltiples enviadas', {
      totalUsuarios: userIds.length,
      tokensValidos: tokens.length,
      dbSaved: dbResults.length,
      fcmSuccess: result.success
    });

    return {
      success: result.success,
      message: result.success ? 'Notificaciones enviadas' : 'Error enviando notificaciones',
      total: userIds.length,
      enviadas: tokens.length,
      dbSaved: dbResults.length,
      fcmResult: result
    };

  } catch (error) {
    logger.error('Error enviando notificaciones múltiples', { userIds, titulo, error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A TODOS LOS USUARIOS
// ============================================
const enviarNotificacionATodos = async (titulo, mensaje, datos = {}, roles = [], tipo = 'sistema') => {
  try {
    // Construir query de usuarios
    let query = { activo: true };
    if (roles.length > 0) {
      query.rol = { $in: roles };
    }

    const users = await User.find(query);
    const userIds = users.map(u => u._id);

    // Guardar notificaciones en DB para cada usuario
    const dbResults = [];
    for (const userId of userIds) {
      const notif = await guardarNotificacion(userId, titulo, mensaje, tipo, datos);
      if (notif) dbResults.push(notif);
    }

    // Filtrar usuarios con token válido
    const tokens = users
      .filter(user => user.pushToken)
      .map(user => user.pushToken);

    if (tokens.length === 0) {
      logger.warn('No hay tokens válidos para enviar notificaciones a todos', {
        dbSaved: dbResults.length
      });
      return {
        success: false,
        message: 'No hay tokens válidos',
        dbSaved: dbResults.length
      };
    }

    // Enviar usando FCM
    const result = await fcmService.sendMultipleFCMNotifications(
      tokens,
      titulo || '📢 Notificación RA²P',
      mensaje || 'Tienes una nueva notificación',
      {
        ...datos,
        timestamp: new Date().toISOString(),
        tipo: tipo,
      }
    );

    logger.info('📱 Notificaciones FCM a todos los usuarios enviadas', {
      totalUsuarios: users.length,
      tokensValidos: tokens.length,
      dbSaved: dbResults.length,
      roles: roles.length > 0 ? roles : 'todos',
      fcmSuccess: result.success
    });

    return {
      success: result.success,
      message: result.success ? 'Notificaciones enviadas a todos' : 'Error enviando notificaciones',
      total: users.length,
      enviadas: tokens.length,
      dbSaved: dbResults.length,
      fcmResult: result
    };

  } catch (error) {
    logger.error('Error enviando notificaciones a todos', { titulo, roles, error: error.message });
    return {
      success: false,
      message: error.message
    };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN DE VISITA REGISTRADA
// ============================================
const notificarVisitaRegistrada = async (visita) => {
  try {
    const titulo = '📋 Nueva Visita Registrada';
    const mensaje = `${visita.tecnicoNombre || 'Técnico'} registró una visita en ${visita.cliente}`;
    const datos = {
      visitaId: visita._id.toString(),
      cliente: visita.cliente,
      tecnico: visita.tecnicoNombre || 'Técnico',
      identificador: visita.identificador || '',
      tipoVisita: visita.tipo || 'Visita',
    };

    const resultado = await enviarNotificacionATodos(
      titulo,
      mensaje,
      datos,
      ['Admin', 'Jefe'],
      'visita'
    );

    return resultado;
  } catch (error) {
    logger.error('Error notificando visita registrada', { error: error.message });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN DE ASISTENCIA
// ============================================
const notificarAsistencia = async (asistencia, tipo) => {
  try {
    const tiposMap = {
      'entrada': 'Entrada',
      'inicio_almuerzo': 'Inicio de Almuerzo',
      'fin_almuerzo': 'Fin de Almuerzo',
      'salida': 'Salida'
    };

    const nombreTipo = tiposMap[tipo] || tipo;
    const hora = asistencia[tipo] || 'Hora no registrada';

    const titulo = `📍 ${nombreTipo} de Asistencia`;
    const mensaje = `${asistencia.usuarioNombre} registró ${nombreTipo.toLowerCase()} a las ${hora}`;
    const datos = {
      asistenciaId: asistencia._id.toString(),
      usuario: asistencia.usuarioNombre,
      evento: tipo,
      hora: hora,
    };

    const resultado = await enviarNotificacionATodos(
      titulo,
      mensaje,
      datos,
      ['Admin', 'Jefe'],
      'sistema'
    );

    return resultado;
  } catch (error) {
    logger.error('Error notificando asistencia', { error: error.message });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN DE NUEVO DEPÓSITO
// ============================================
const notificarNuevoDeposito = async (deposito, jefesSeleccionados) => {
  try {
    const titulo = '💰 Nuevo Depósito Registrado';
    const mensaje = `${deposito.usuarioNombre} realizó un depósito de $${deposito.valor} en la cuenta ${deposito.cuenta}`;
    const datos = {
      depositoId: deposito._id.toString(),
      usuario: deposito.usuarioNombre,
      valor: deposito.valor,
      cuenta: deposito.cuenta,
      banco: deposito.banco,
      fecha: deposito.fecha,
    };

    // Enviar notificaciones a los jefes seleccionados
    const userIds = jefesSeleccionados.map(j => j._id || j);
    const resultado = await enviarNotificacionMultiple(
      userIds,
      titulo,
      mensaje,
      datos,
      'deposito'
    );

    logger.info('📱 Notificación de depósito enviada a jefes', {
      depositoId: deposito._id,
      jefes: userIds.length,
      enviadas: resultado.enviadas || 0
    });

    return resultado;
  } catch (error) {
    logger.error('Error notificando nuevo depósito', { error: error.message });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN DE ESTADO DE DEPÓSITO
// ============================================
const notificarEstadoDeposito = async (deposito, estado, observaciones = '') => {
  try {
    const estadosMap = {
      'APROBADO': {
        titulo: '✅ Depósito Aprobado',
        emoji: '✅',
        mensaje: `Tu depósito de $${deposito.valor} ha sido APROBADO`
      },
      'RECHAZADO': {
        titulo: '❌ Depósito Rechazado',
        emoji: '❌',
        mensaje: `Tu depósito de $${deposito.valor} ha sido RECHAZADO`
      }
    };

    const info = estadosMap[estado];
    if (!info) return { success: false, message: 'Estado no válido' };

    const titulo = info.titulo;
    const mensaje = observaciones
      ? `${info.mensaje}. Motivo: ${observaciones}`
      : info.mensaje;

    const datos = {
      depositoId: deposito._id.toString(),
      estado: estado,
      valor: deposito.valor,
      observaciones: observaciones,
    };

    // Enviar notificación al usuario que subió el depósito
    const resultado = await enviarNotificacion(
      deposito.usuarioId,
      titulo,
      mensaje,
      datos,
      'deposito'
    );

    logger.info('📱 Notificación de estado de depósito enviada', {
      depositoId: deposito._id,
      estado,
      usuario: deposito.usuarioId
    });

    return resultado;
  } catch (error) {
    logger.error('Error notificando estado de depósito', { error: error.message });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 EXPORTAR FUNCIONES
// ============================================
module.exports = {
  enviarNotificacion,
  enviarNotificacionMultiple,
  enviarNotificacionATodos,
  guardarNotificacion,
  notificarVisitaRegistrada,
  notificarAsistencia,
  notificarNuevoDeposito,
  notificarEstadoDeposito,
};