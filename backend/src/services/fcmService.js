// backend/src/services/fcmService.js
// ⚠️ FIREBASE DESACTIVADO TEMPORALMENTE - Modo simulación
// Para reactivar: instalar firebase-admin y descomentar las líneas

let firebaseApp = null;

// Función simulada de inicialización
const initializeFirebase = () => {
  try {
    console.log('⚠️ Firebase en modo simulación (desactivado)');
    return null;
  } catch (error) {
    console.error('❌ Error en simulación Firebase:', error);
    return null;
  }
};

// Enviar notificación FCM (simulada)
const sendFCMNotification = async (token, title, body, data = {}) => {
  try {
    console.log('📱 [FCM SIMULADO] Enviando notificación...');
    console.log('📱 Token:', token ? token.substring(0, 20) + '...' : 'sin token');
    console.log('📱 Título:', title || '🔔 Notificación RA²P');
    console.log('📱 Body:', body || 'Tienes una nueva notificación');
    console.log('📱 Data:', data);
    console.log('✅ [FCM SIMULADO] Notificación enviada exitosamente');
    
    // Simular éxito
    return { 
      success: true, 
      response: { 
        messageId: 'simulated-' + Date.now() 
      } 
    };

  } catch (error) {
    console.error('❌ Error en simulación FCM:', error);
    return { 
      success: false, 
      error: error.message, 
      code: 'simulated_error' 
    };
  }
};

// Enviar notificación a múltiples tokens (simulada)
const sendMultipleFCMNotifications = async (tokens, title, body, data = {}) => {
  try {
    console.log(`📱 [FCM SIMULADO] Enviando a ${tokens?.length || 0} dispositivos...`);
    console.log('📱 Título:', title || '🔔 Notificación RA²P');
    console.log('📱 Body:', body || 'Tienes una nueva notificación');
    
    // Simular éxito
    return { 
      success: true, 
      response: { 
        successCount: tokens?.length || 0,
        messageId: 'simulated-' + Date.now()
      } 
    };

  } catch (error) {
    console.error('❌ Error en simulación FCM múltiple:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initializeFirebase,
  sendFCMNotification,
  sendMultipleFCMNotifications,
};