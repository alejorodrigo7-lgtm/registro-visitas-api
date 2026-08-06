// backend/src/services/fcmService.js
const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin SDK
let firebaseApp = null;

const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      // Usar las credenciales del archivo JSON
      const serviceAccount = require('../../credentials/firebase-credentials.json');
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      
      console.log('✅ Firebase Admin SDK inicializado correctamente');
    }
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    throw error;
  }
};

// Enviar notificación FCM
const sendFCMNotification = async (token, title, body, data = {}) => {
  try {
    initializeFirebase();
    
    const message = {
      notification: {
        title: title || '🔔 Notificación RA²P',
        body: body || 'Tienes una nueva notificación',
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ra2p_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      token: token,
    };

    console.log('📤 Enviando FCM notification...');
    console.log('📤 Token:', token.substring(0, 20) + '...');
    console.log('📤 Título:', title);
    console.log('📤 Body:', body);

    const response = await admin.messaging().send(message);
    console.log('✅ FCM notification enviada:', response);
    return { success: true, response };

  } catch (error) {
    console.error('❌ Error enviando FCM notification:', error);
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('⚠️ Token inválido, debería eliminarse de la BD');
    }
    return { success: false, error: error.message, code: error.code };
  }
};

// Enviar notificación a múltiples tokens
const sendMultipleFCMNotifications = async (tokens, title, body, data = {}) => {
  try {
    initializeFirebase();
    
    const messages = tokens.map(token => ({
      notification: {
        title: title || '🔔 Notificación RA²P',
        body: body || 'Tienes una nueva notificación',
      },
      data: data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ra2p_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
      token: token,
    }));

    console.log(`📤 Enviando ${messages.length} FCM notifications...`);

    const response = await admin.messaging().sendEach(messages);
    console.log('✅ FCM notifications enviadas:', response);
    return { success: true, response };

  } catch (error) {
    console.error('❌ Error enviando FCM notifications múltiples:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeFirebase,
  sendFCMNotification,
  sendMultipleFCMNotifications,
};