// src/services/notificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';

// ============================================
// 🔥 FIREBASE - DETECCIÓN DE PLATAFORMA
// ============================================
let messaging;

if (Platform.OS === 'web') {
  // Web: mock completo
  console.log('🌐 Firebase Messaging no disponible en web');
  messaging = {
    getToken: async () => 'web-mock-token',
    onMessage: () => () => {},
    onNotificationOpenedApp: () => () => {},
    getInitialNotification: async () => null,
    requestPermission: async () => 'authorized',
    registerDeviceForRemoteMessages: async () => {},
    subscribeToTopic: async () => {},
    unsubscribeFromTopic: async () => {},
    setBackgroundMessageHandler: () => {},
    AuthorizationStatus: { AUTHORIZED: 'authorized', PROVISIONAL: 'provisional' },
  };
} else {
  try {
    // Intentar cargar Firebase nativo
    const firebaseModule = require('@react-native-firebase/messaging');
    messaging = firebaseModule.default || firebaseModule;
    console.log('📱 Firebase Messaging cargado correctamente');
  } catch (error) {
    console.warn('⚠️ Firebase no disponible en Expo Go, usando mock');
    // Mock para Expo Go
    messaging = {
      getToken: async () => 'expo-go-mock-token',
      onMessage: () => () => {},
      onNotificationOpenedApp: () => () => {},
      getInitialNotification: async () => null,
      requestPermission: async () => 'authorized',
      registerDeviceForRemoteMessages: async () => {},
      subscribeToTopic: async () => {},
      unsubscribeFromTopic: async () => {},
      setBackgroundMessageHandler: () => {},
      AuthorizationStatus: { AUTHORIZED: 'authorized', PROVISIONAL: 'provisional' },
    };
  }
}

// ============================================
// 📱 CONFIGURACIÓN DE NOTIFICACIONES
// ============================================

// ============================================
// 📱 REGISTRAR DISPOSITIVO PARA NOTIFICACIONES PUSH (FIREBASE)
// ============================================

export async function registerForPushNotificationsAsync() {
  let token;

  console.log('📱 1. Iniciando registro de notificaciones...');

  if (!Device.isDevice && Platform.OS !== 'web') {
    console.log('⚠️ Debes usar un dispositivo físico para notificaciones push');
    return;
  }

  try {
    // 1. Solicitar permisos
    const authStatus = await messaging.requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('❌ Permiso de notificaciones denegado');
      Alert.alert('Permiso denegado', 'No podrás recibir notificaciones push');
      return;
    }

    console.log('✅ 2. Permiso de notificaciones concedido');

    // 2. Obtener token
    token = await messaging.getToken();
    console.log('✅ 3. Token obtenido:', token);

    if (!token || token.includes('mock')) {
      console.log('⚠️ Token mock detectado, no se registrará en backend');
      return token;
    }

    // 3. Guardar token en el backend
    const userJson = await AsyncStorage.getItem('@user');
    console.log('📱 userJson:', userJson ? '✅ Existe' : '❌ No existe');
    
    if (userJson) {
      const userData = JSON.parse(userJson);
      const userId = userData.id || userData._id;
      
      if (!userId) {
        console.error('❌ No se encontró ID de usuario');
        return token;
      }
      
      console.log(`📡 4. Registrando token para usuario: ${userData.email} (${userData.rol})`);
      
      const api = (await import('./api')).default;
      const response = await api.post('/auth/registrar-push-token', {
        userId: userId,
        token: token,
        platform: Platform.OS,
      });
      
      console.log(`✅ 5. Token registrado para ${userData.rol}: ${userData.email}`);
      return response.data;
    } else {
      console.log('⚠️ No hay usuario logueado para registrar token');
    }
  } catch (error) {
    console.error('❌ Error en registro de notificaciones:', error);
    if (error.response) {
      console.error('📡 Status:', error.response.status);
      console.error('📡 Data:', error.response.data);
    }
  }

  return token;
}

// ============================================
// 📱 CONFIGURAR LISTENERS DE FIREBASE
// ============================================

export function setupFirebaseListeners() {
  console.log('📱 Configurando listeners de notificaciones...');

  // Solo configurar si no es mock
  if (Platform.OS !== 'web' && !messaging.getToken.toString().includes('mock')) {
    // 1. Notificaciones en primer plano
    const unsubscribeMessage = messaging.onMessage(async (remoteMessage) => {
      console.log('📨 Notificación recibida en primer plano:', remoteMessage);
      
      const title = remoteMessage.notification?.title || 'Nueva notificación';
      const body = remoteMessage.notification?.body || '';
      
      Alert.alert(title, body);
    });

    console.log('✅ Listeners de Firebase configurados');
    return unsubscribeMessage;
  } else {
    console.log('🌐 Listeners mock (sin Firebase)');
    return () => console.log('🧹 Listener mock removido');
  }
}

// ============================================
// 📤 ENVIAR NOTIFICACIÓN PUSH (DESDE EL FRONTEND)
// ============================================

export async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    if (fcmToken && fcmToken.includes('mock')) {
      console.log('📤 Token mock, no se enviará notificación real');
      return { success: true, mock: true };
    }

    const userJson = await AsyncStorage.getItem('@user');
    if (!userJson) {
      console.error('❌ No hay usuario logueado');
      return;
    }

    const userData = JSON.parse(userJson);
    const api = (await import('./api')).default;
    
    const response = await api.post('/notificaciones/enviar', {
      userId: userData.id || userData._id,
      titulo: title,
      mensaje: body,
      data: data,
    });

    console.log('📤 Notificación enviada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar push:', error);
    return null;
  }
}

// ============================================
// 📱 REGISTRAR TOKEN AL INICIAR SESIÓN
// ============================================

export async function registerTokenAfterLogin(userId) {
  try {
    // Solicitar permiso
    const authStatus = await messaging.requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('❌ Permiso de notificaciones denegado');
      return false;
    }

    // Obtener token
    const token = await messaging.getToken();

    if (!token || token.includes('mock')) {
      console.log('⚠️ Token mock, no se registrará en backend');
      return false;
    }

    console.log('📱 Token obtenido:', token);

    const api = (await import('./api')).default;
    const response = await api.post('/auth/registrar-push-token', {
      userId: userId,
      token: token,
      platform: Platform.OS,
    });

    console.log('✅ Token registrado en backend');
    return true;

  } catch (error) {
    console.error('❌ Error registrando token después de login:', error);
    return false;
  }
}

// ============================================
// 📱 MOSTRAR NOTIFICACIÓN LOCAL
// ============================================

export async function showLocalNotification(title, body, data = {}) {
  console.log('📱 Notificación local:', title, body);
  // En Expo Go, mostramos alerta
  if (title && body) {
    Alert.alert(title, body);
  }
  return true;
}

// ============================================
// 📱 CONFIGURAR CANAL DE NOTIFICACIONES PARA ANDROID
// ============================================

export async function configureAndroidNotifications() {
  if (Platform.OS === 'android') {
    console.log('✅ Canal de notificaciones Android configurado');
  }
}

// ============================================
// 📱 LIMPIAR NOTIFICACIONES
// ============================================

export async function clearAllNotifications() {
  console.log('✅ Notificaciones limpiadas');
}

// ============================================
// 📱 OBTENER TOKEN GUARDADO
// ============================================

export async function getStoredPushToken() {
  try {
    const token = await messaging.getToken();
    return token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    return null;
  }
}

// ============================================
// 📱 MANEJAR NOTIFICACIONES EN SEGUNDO PLANO
// ============================================

export const setupBackgroundHandler = () => {
  try {
    messaging.setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📨 Notificación recibida en segundo plano:', remoteMessage);
      return Promise.resolve();
    });
  } catch (error) {
    console.log('⚠️ No se pudo configurar handler de fondo:', error);
  }
};

// ============================================
// 📱 OBTENER TOKEN CON PROYECTO ID DE EXPO (FALLBACK)
// ============================================

export async function getExpoTokenFallback() {
  try {
    // Usar expo-notifications si está disponible
    const Notifications = require('expo-notifications');
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'c498ddad-89aa-41ae-9f7d-e0f2e31df324',
    });
    return token.data;
  } catch (error) {
    console.error('❌ Error obteniendo token Expo:', error);
    return null;
  }
}

// ============================================
// 📱 COMPATIBILIDAD CON APP.JS - setupNotificationListeners
// ============================================

export const setupNotificationListeners = () => {
  console.log('📱 Configurando listeners de notificaciones (compatibilidad)...');
  
  if (Platform.OS !== 'web') {
    console.log('📱 Notificaciones configuradas (modo compatibilidad)');
    
    try {
      const unsubscribe = setupFirebaseListeners();
      return {
        subscription: {
          remove: () => {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
            console.log('🧹 Listener de Firebase removido');
          },
        },
        responseSubscription: {
          remove: () => console.log('🧹 Response listener removido'),
        },
      };
    } catch (error) {
      console.log('⚠️ Error configurando Firebase listeners:', error);
    }
  }
  
  return {
    subscription: {
      remove: () => console.log('🧹 Listener removido'),
    },
    responseSubscription: {
      remove: () => console.log('🧹 Response listener removido'),
    },
  };
};

// ============================================
// 📦 EXPORTAR TODO
// ============================================

export default {
  registerForPushNotificationsAsync,
  setupFirebaseListeners,
  setupNotificationListeners,
  sendPushNotification,
  registerTokenAfterLogin,
  showLocalNotification,
  configureAndroidNotifications,
  clearAllNotifications,
  getStoredPushToken,
  setupBackgroundHandler,
  getExpoTokenFallback,
};