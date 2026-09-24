// src/services/notificationService.js
// ✅ VERSION CON EXPO NOTIFICATIONS (compatible con el backend)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// Configurar como se muestran las notificaciones cuando la app esta abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================
// REGISTRAR DISPOSITIVO PARA NOTIFICACIONES PUSH
// ============================================
export async function registerForPushNotificationsAsync() {
  let token;

  console.log('📱 1. Iniciando registro de notificaciones...');

  if (!Device.isDevice && Platform.OS !== 'web') {
    console.log('⚠️ Debes usar un dispositivo fisico para notificaciones push');
    return;
  }

  try {
    // 1. Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permiso de notificaciones denegado');
      Alert.alert('Permiso denegado', 'No podras recibir notificaciones push');
      return;
    }

    console.log('✅ 2. Permiso de notificaciones concedido');

    // 2. Configurar canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C5CE7',
      });
    }

    // 3. Obtener token de Expo
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'c498ddad-89aa-41ae-9f7d-e0f2e31df324',
    });
    token = tokenData.data;

    console.log('✅ 3. Token Expo obtenido:', token);

    // 4. Guardar token en el backend
    const userJson = await AsyncStorage.getItem('user');
    console.log('📱 userJson:', userJson ? '✅ Existe' : '❌ No existe');

    if (userJson) {
      const userData = JSON.parse(userJson);
      const userId = userData.id || userData._id;

      if (!userId) {
        console.error('❌ No se encontro ID de usuario');
        return token;
      }

      console.log(`📡 4. Registrando token para usuario: ${userData.email}`);

      const api = (await import('./api')).default;
      const response = await api.post('/auth/registrar-push-token', {
        userId: userId,
        token: token,
        platform: Platform.OS,
      });

      console.log(`✅ 5. Token registrado en backend para: ${userData.email}`);
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
// CONFIGURAR LISTENERS DE NOTIFICACIONES
// ============================================
export function setupPushListeners() {
  console.log('📱 Configurando listeners de notificaciones...');

  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📨 Notificacion recibida en primer plano:', notification);
    const title = notification.request.content.title || 'Nueva notificacion';
    const body = notification.request.content.body || '';
    Alert.alert(title, body);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notificacion tocada:', response);
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

// ============================================
// REGISTRAR TOKEN DESPUES DE LOGIN
// ============================================
export async function registerTokenAfterLogin(userId) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('❌ Permiso de notificaciones denegado');
        return false;
      }
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'c498ddad-89aa-41ae-9f7d-e0f2e31df324',
    });
    const token = tokenData.data;

    if (!token) {
      console.log('⚠️ Token vacio');
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
    console.error('❌ Error registrando token despues de login:', error);
    return false;
  }
}

// ============================================
// MOSTRAR NOTIFICACION LOCAL
// ============================================
export async function showLocalNotification(title, body, data = {}) {
  console.log('📱 Notificacion local:', title, body);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
}

// ============================================
// CONFIGURAR CANAL DE NOTIFICACIONES PARA ANDROID
// ============================================
export async function configureAndroidNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
    });
    console.log('✅ Canal de notificaciones Android configurado');
  }
}

// ============================================
// LIMPIAR NOTIFICACIONES
// ============================================
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
  console.log('✅ Notificaciones limpiadas');
}

// ============================================
// OBTENER TOKEN GUARDADO
// ============================================
export async function getStoredPushToken() {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'c498ddad-89aa-41ae-9f7d-e0f2e31df324',
    });
    return tokenData.data;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    return null;
  }
}

// ============================================
// CONFIGURAR LISTENERS (compatibilidad con App.js)
// ============================================
export const setupNotificationListeners = () => {
  console.log('📱 Configurando listeners de notificaciones (compatibilidad)...');

  if (Platform.OS !== 'web') {
    console.log('📱 Notificaciones configuradas (modo compatibilidad)');

    try {
      const unsubscribe = setupPushListeners();
      return {
        subscription: {
          remove: () => {
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
            console.log('🧹 Listener de notificaciones removido');
          },
        },
        responseSubscription: {
          remove: () => console.log('🧹 Response listener removido'),
        },
      };
    } catch (error) {
      console.log('⚠️ Error configurando listeners:', error);
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
// EXPORTAR TODO
// ============================================
export default {
  registerForPushNotificationsAsync,
  setupPushListeners,
  setupNotificationListeners,
  registerTokenAfterLogin,
  showLocalNotification,
  configureAndroidNotifications,
  clearAllNotifications,
  getStoredPushToken,
};
