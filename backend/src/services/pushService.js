const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

// Crear una instancia de Expo
let expo = new Expo();

// ============================================
// ENVIAR NOTIFICACIÓN PUSH
// ============================================
exports.enviarNotificacionPush = async (userId, notification) => {
  try {
    console.log(`📱 Intentando enviar push a usuario: ${userId}`);
    
    // Buscar el usuario
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ Usuario ${userId} no encontrado`);
      return { success: false, message: 'Usuario no encontrado' };
    }

    console.log(`📱 Usuario: ${user.email}, Token: ${user.expoPushToken ? '✅ SI' : '❌ NO'}`);

    // Verificar que el usuario tiene token push
    if (!user.expoPushToken) {
      console.log(`⚠️ Usuario ${user.email} no tiene token push registrado`);
      return { success: false, message: 'No push token' };
    }

    // Verificar que el token es válido
    if (!Expo.isExpoPushToken(user.expoPushToken)) {
      console.log(`⚠️ Token push inválido para ${user.email}`);
      return { success: false, message: 'Invalid push token' };
    }

    // Construir el mensaje
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title: notification.title || 'Nueva Alerta',
      body: notification.body || 'Tienes una nueva notificación',
      data: notification.data || {},
    }];

    console.log(`📤 Enviando push a ${user.email}:`, messages);

    // Enviar notificaciones en lotes
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`✅ Push enviado a ${user.email}`, ticketChunk);
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

// ============================================
// VERIFICAR RECIBOS DE NOTIFICACIONES (opcional)
// ============================================
exports.verificarTicketsPush = async (tickets) => {
  try {
    const receiptIds = [];
    for (let ticket of tickets) {
      if (ticket.id) {
        receiptIds.push(ticket.id);
      }
    }

    if (receiptIds.length === 0) {
      return;
    }

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (let chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log('📋 Recibos de notificaciones:', receipts);

        for (let receiptId in receipts) {
          const { status, message, details } = receipts[receiptId];
          if (status === 'error') {
            console.error(`❌ Error en notificación ${receiptId}:`, message, details);
            // Si el token es inválido, eliminarlo de la base de datos
            if (details && details.error === 'DeviceNotRegistered') {
              // Aquí podrías eliminar el token inválido
            }
          }
        }
      } catch (error) {
        console.error('❌ Error al obtener recibos:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error en verificarTicketsPush:', error);
  }
};