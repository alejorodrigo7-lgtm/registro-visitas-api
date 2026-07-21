const { Expo } = require('expo-server-sdk');
const logger = require('../config/logger');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');

// Crear instancia de Expo
const expo = new Expo();

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
    logger.errorWithContext('Error guardando notificación en DB', error, { userId, titulo });
    return null;
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A UN USUARIO
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
    if (!user.expoPushToken) {
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

    // 4. Verificar si el token es válido
    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      logger.warn('Token push inválido', { 
        userId, 
        token: user.expoPushToken 
      });
      return { 
        success: false, 
        message: 'Token push inválido',
        dbSaved: !!notificacionDB,
        notificacionId: notificacionDB?._id
      };
    }

    // 5. Construir mensaje para push
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title: titulo || '📢 Notificación RA²P',
      body: mensaje || 'Tienes una nueva notificación',
      data: {
        ...datos,
        notificacionId: notificacionDB?._id?.toString(),
        timestamp: new Date().toISOString(),
        userId: user._id.toString(),
        tipo: tipo,
      },
      priority: 'high',
      badge: 1,
    }];

    // 6. Enviar notificación push
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(ticketChunk);
    }

    logger.info('📱 Notificación push enviada', {
      userId: user._id,
      email: user.email,
      titulo,
      notificacionId: notificacionDB?._id,
      ticketCount: tickets.length
    });

    return { 
      success: true, 
      message: 'Notificación enviada',
      tickets,
      userId: user._id,
      email: user.email,
      notificacionId: notificacionDB?._id,
      dbSaved: true
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificación push', error, {
      userId,
      titulo
    });
    return { 
      success: false, 
      message: error.message 
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
      .filter(user => user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken))
      .map(user => ({
        to: user.expoPushToken,
        sound: 'default',
        title: titulo || '📢 Notificación RA²P',
        body: mensaje || 'Tienes una nueva notificación',
        data: {
          ...datos,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          tipo: tipo,
        },
        priority: 'high',
        badge: 1,
      }));

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

    // 4. Enviar notificaciones en chunks
    const chunks = expo.chunkPushNotifications(tokens);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(ticketChunk);
    }

    logger.info('📱 Notificaciones push múltiples enviadas', {
      totalUsuarios: userIds.length,
      tokensValidos: tokens.length,
      dbSaved: dbResults.length,
      ticketCount: tickets.length
    });

    return {
      success: true,
      message: 'Notificaciones enviadas',
      total: userIds.length,
      enviadas: tokens.length,
      dbSaved: dbResults.length,
      tickets
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificaciones múltiples', error, {
      userIds,
      titulo
    });
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
      .filter(user => user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken))
      .map(user => ({
        to: user.expoPushToken,
        sound: 'default',
        title: titulo || '📢 Notificación RA²P',
        body: mensaje || 'Tienes una nueva notificación',
        data: {
          ...datos,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
          tipo: tipo,
        },
        priority: 'high',
        badge: 1,
      }));

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

    // Enviar notificaciones en chunks
    const chunks = expo.chunkPushNotifications(tokens);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(ticketChunk);
    }

    logger.info('📱 Notificaciones push a todos los usuarios enviadas', {
      totalUsuarios: users.length,
      tokensValidos: tokens.length,
      dbSaved: dbResults.length,
      roles: roles.length > 0 ? roles : 'todos'
    });

    return {
      success: true,
      message: 'Notificaciones enviadas a todos',
      total: users.length,
      enviadas: tokens.length,
      dbSaved: dbResults.length,
      tickets
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificaciones a todos', error, {
      titulo,
      mensaje,
      roles
    });
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
    logger.errorWithContext('Error notificando visita registrada', error);
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
    logger.errorWithContext('Error notificando asistencia', error);
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
};