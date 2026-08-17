// src/services/notificationService.web.js
// Mock de servicio de notificaciones para web

export const setupNotificationListeners = () => {
  console.log('🌐 Notificaciones: mock para web');
  return {
    remove: () => console.log('🌐 Notificaciones: removed'),
  };
};

export const registerForPushNotifications = async () => {
  console.log('🌐 Notificaciones push no disponibles en web');
  return null;
};

export const sendPushNotification = async (expoPushToken, message) => {
  console.log('🌐 Notificación push (mock):', message);
  return { success: true, mock: true };
};

export default {
  setupNotificationListeners,
  registerForPushNotifications,
  sendPushNotification,
};