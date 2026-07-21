const { Expo } = require('expo-server-sdk');
const logger = require('../config/logger');
const User = require('../models/User');

// Crear instancia de Expo
const expo = new Expo();

// ============================================
// 📱 ENVIAR NOTIFICACIÓN A UN USUARIO
// ============================================
const enviarNotificacion = async (userId, titulo, cuerpo, data = {}) => {
  try {
    // Buscar el usuario
    const user = await User.findById(userId);
    if (!user) {
      logger.warn('Usuario no encontrado para notificación', { userId });
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Verificar si tiene token push
    if (!user.expoPushToken) {
      logger.warn('Usuario sin token push registrado', { 
        userId, 
        email: user.email 
      });
      return { success: false, message: 'Usuario sin token push' };
    }

    // Verificar si el token es válido
    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      logger.warn('Token push inválido', { 
        userId, 
        token: user.expoPushToken 
      });
      return { success: false, message: 'Token push inválido' };
    }

    // Construir mensaje
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title: titulo || '📢 Notificación RA²P',
      body: cuerpo || 'Tienes una nueva notificación',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        userId: user._id.toString(),
      },
      priority: 'high',
      badge: 1,
    }];

    // Enviar notificación
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
      cuerpo,
      ticketCount: tickets.length
    });

    return { 
      success: true, 
      message: 'Notificación enviada',
      tickets,
      userId: user._id,
      email: user.email
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificación push', error, {
      userId,
      titulo,
      cuerpo
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
const enviarNotificacionMultiple = async (userIds, titulo, cuerpo, data = {}) => {
  try {
    // Buscar todos los usuarios
    const users = await User.find({ _id: { $in: userIds } });
    
    // Filtrar usuarios con token válido
    const tokens = users
      .filter(user => user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken))
      .map(user => ({
        to: user.expoPushToken,
        sound: 'default',
        title: titulo || '📢 Notificación RA²P',
        body: cuerpo || 'Tienes una nueva notificación',
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
        },
        priority: 'high',
        badge: 1,
      }));

    if (tokens.length === 0) {
      logger.warn('No hay tokens válidos para enviar notificaciones', { 
        usuarios: userIds.length,
        tokensValidos: 0
      });
      return { success: false, message: 'No hay tokens válidos' };
    }

    // Enviar notificaciones en chunks
    const chunks = expo.chunkPushNotifications(tokens);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(ticketChunk);
    }

    logger.info('📱 Notificaciones push múltiples enviadas', {
      totalUsuarios: userIds.length,
      tokensValidos: tokens.length,
      chunks: chunks.length,
      ticketCount: tickets.length
    });

    return {
      success: true,
      message: 'Notificaciones enviadas',
      total: userIds.length,
      enviadas: tokens.length,
      tickets
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificaciones múltiples', error, {
      userIds,
      titulo,
      cuerpo
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
const enviarNotificacionATodos = async (titulo, cuerpo, data = {}, roles = []) => {
  try {
    // Construir query de usuarios
    let query = { activo: true };
    if (roles.length > 0) {
      query.rol = { $in: roles };
    }

    const users = await User.find(query);
    
    // Filtrar usuarios con token válido
    const tokens = users
      .filter(user => user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken))
      .map(user => ({
        to: user.expoPushToken,
        sound: 'default',
        title: titulo || '📢 Notificación RA²P',
        body: cuerpo || 'Tienes una nueva notificación',
        data: {
          ...data,
          timestamp: new Date().toISOString(),
          userId: user._id.toString(),
        },
        priority: 'high',
        badge: 1,
      }));

    if (tokens.length === 0) {
      logger.warn('No hay tokens válidos para enviar notificaciones a todos');
      return { success: false, message: 'No hay tokens válidos' };
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
      roles: roles.length > 0 ? roles : 'todos'
    });

    return {
      success: true,
      message: 'Notificaciones enviadas a todos',
      total: users.length,
      enviadas: tokens.length,
      tickets
    };

  } catch (error) {
    logger.errorWithContext('Error enviando notificaciones a todos', error, {
      titulo,
      cuerpo,
      roles
    });
    return {
      success: false,
      message: error.message
    };
  }
};

// ============================================
// 📱 REGISTRAR TOKEN PUSH DE UN USUARIO
// ============================================
const registrarTokenPush = async (userId, token) => {
  try {
    if (!userId || !token) {
      return { success: false, message: 'UserId y token son requeridos' };
    }

    if (!Expo.isExpoPushToken(token)) {
      logger.warn('Intento de registro de token inválido', { userId, token });
      return { success: false, message: 'Token push inválido' };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    user.expoPushToken = token;
    await user.save();

    logger.info('✅ Token push registrado', {
      userId: user._id,
      email: user.email,
      token: token.substring(0, 20) + '...'
    });

    return {
      success: true,
      message: 'Token push registrado correctamente',
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre
      }
    };

  } catch (error) {
    logger.errorWithContext('Error registrando token push', error, { userId, token });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 OBTENER ESTADO DE NOTIFICACIONES
// ============================================
const obtenerEstadoNotificaciones = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const tieneToken = !!user.expoPushToken;
    const tokenValido = tieneToken ? Expo.isExpoPushToken(user.expoPushToken) : false;

    return {
      success: true,
      data: {
        tieneToken,
        tokenValido,
        token: user.expoPushToken || null,
        email: user.email,
        nombre: user.nombre
      }
    };

  } catch (error) {
    logger.errorWithContext('Error obteniendo estado de notificaciones', error, { userId });
    return { success: false, message: error.message };
  }
};

// ============================================
// 📱 ENVIAR NOTIFICACIÓN DE VISITA REGISTRADA
// ============================================
const notificarVisitaRegistrada = async (visita) => {
  try {
    // Notificar a jefes y admins
    const titulo = '📋 Nueva Visita Registrada';
    const cuerpo = `${visita.tecnicoNombre} registró una visita en ${visita.cliente}`;
    const data = {
      tipo: 'visita',
      visitaId: visita._id.toString(),
      cliente: visita.cliente,
      tecnico: visita.tecnicoNombre,
    };

    const resultado = await enviarNotificacionATodos(
      titulo,
      cuerpo,
      data,
      ['Admin', 'Jefe']
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
    // Notificar a jefes y admins sobre asistencias
    const titulo = `📍 ${tipo} de Asistencia`;
    const cuerpo = `${asistencia.usuarioNombre} registró ${tipo.toLowerCase()} a las ${asistencia[tipo.toLowerCase()]}`;
    const data = {
      tipo: 'asistencia',
      asistenciaId: asistencia._id.toString(),
      usuario: asistencia.usuarioNombre,
      evento: tipo,
    };

    const resultado = await enviarNotificacionATodos(
      titulo,
      cuerpo,
      data,
      ['Admin', 'Jefe']
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
  registrarTokenPush,
  obtenerEstadoNotificaciones,
  notificarVisitaRegistrada,
  notificarAsistencia,
};