const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

// Crear cliente Expo
const expo = new Expo();

// Enviar notificación push
const enviarNotificacionPush = async (userId, { title, body, data = {} }) => {
  try {
    // Buscar el usuario
    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ Usuario ${userId} no encontrado`);
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Verificar si tiene token push
    if (!user.pushToken) {
      console.log(`⚠️ Usuario ${user.email} no tiene token push registrado`);
      return { success: false, error: 'No tiene token push' };
    }

    // Verificar si el token es válido
    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.log(`❌ Token push inválido para usuario ${user.email}: ${user.pushToken}`);
      return { success: false, error: 'Token push inválido' };
    }

    // Crear mensaje
    const message = {
      to: user.pushToken,
      sound: 'default',
      title: title || 'Notificación',
      body: body || 'Tienes una nueva notificación',
      data: data || {},
      priority: 'high',
      channelId: 'default',
    };

    console.log(`📤 Enviando push a ${user.email}`);
    console.log(`📱 Token: ${user.pushToken.substring(0, 20)}...`);

    // Enviar notificación
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`✅ Push enviado a ${user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando push a ${user.email}:`, error);
        return { success: false, error: error.message };
      }
    }

    // Verificar tickets
    const receiptIds = tickets
      .filter(ticket => ticket.id)
      .map(ticket => ticket.id);

    if (receiptIds.length > 0) {
      const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
      for (const receiptId of receiptIds) {
        const receipt = receipts[receiptId];
        if (receipt && receipt.status === 'error') {
          console.error(`❌ Error en push ${receiptId}:`, receipt.message);
          if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
            // Limpiar token inválido
            await User.findByIdAndUpdate(userId, { pushToken: null });
            console.log(`🧹 Token inválido eliminado para ${user.email}`);
          }
        }
      }
    }

    return { success: true, tickets };
  } catch (error) {
    console.error('❌ Error en enviarNotificacionPush:', error);
    return { success: false, error: error.message };
  }
};

// Guardar token push
const guardarTokenPush = async (userId, token) => {
  try {
    if (!userId || !token) {
      return { success: false, error: 'Faltan datos' };
    }

    // Verificar token válido
    if (!Expo.isExpoPushToken(token)) {
      console.log(`❌ Token push inválido: ${token.substring(0, 20)}...`);
      return { success: false, error: 'Token push inválido' };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { pushToken: token },
      { new: true }
    );

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    console.log(`✅ Token push guardado para ${user.email}`);
    return { success: true, user };
  } catch (error) {
    console.error('❌ Error guardando token push:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  enviarNotificacionPush,
  guardarTokenPush,
  Expo,
};
