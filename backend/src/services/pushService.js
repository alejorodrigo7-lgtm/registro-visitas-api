const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

let expo = new Expo();

exports.enviarNotificacionPush = async (userId, notification) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ Usuario ${userId} no encontrado`);
      return { success: false, message: 'Usuario no encontrado' };
    }

    if (!user.expoPushToken) {
      console.log(`⚠️ Usuario ${user.email} no tiene token push registrado`);
      return { success: false, message: 'No push token' };
    }

    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.log(`⚠️ Token push inválido para ${user.email}`);
      return { success: false, message: 'Invalid push token' };
    }

    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title: notification.title || 'Nueva Alerta',
      body: notification.body || 'Tienes una nueva notificación',
      data: notification.data || {},
    }];

    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`📤 Push enviado a ${user.email}`, ticketChunk);
      } catch (error) {
        console.error('❌ Error al enviar push:', error);
      }
    }

    return { success: true, tickets };
  } catch (error) {
    console.error('❌ Error en enviarNotificacionPush:', error);
    return { success: false, error: error.message };
  }
};