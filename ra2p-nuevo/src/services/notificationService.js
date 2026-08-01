import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import api from './api';

// ============================================
// 📱 CONFIGURACIÓN DE NOTIFICACIONES
// ============================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============================================
// 📱 REGISTRAR DISPOSITIVO PARA NOTIFICACIONES PUSH
// ============================================

export async function registerForPushNotificationsAsync() {
  let token;

  console.log('📱 1. Iniciando registro de notificaciones...');

  if (!Device.isDevice) {
    console.log('❌ Debes usar un dispositivo físico para notificaciones push');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ No se obtuvieron permisos para notificaciones');
    Alert.alert('Permiso denegado', 'No podrás recibir notificaciones push');
    return;
  }

  console.log('✅ 2. Permiso de notificaciones concedido');

  try {
    token = await Notifications.getExpoPushTokenAsync({
      projectId: 'c738e27f-e3ba-489f-8357-1a980a5d45d1',
    });
    console.log('✅ 3. Token push obtenido:', token.data);
  } catch (error) {
    console.error('❌ Error al obtener token push:', error);
    return;
  }

  if (token) {
    try {
      const userJson = await AsyncStorage.getItem('@user');
      console.log('📱 userJson:', userJson ? '✅ Existe' : '❌ No existe');
      
      if (userJson) {
        const userData = JSON.parse(userJson);
        const userId = userData.id || userData._id;
        
        if (!userId) {
          console.error('❌ No se encontró ID de usuario');
          return;
        }
        
        console.log(`📡 4. Registrando token para usuario: ${userData.email} (${userData.rol})`);
        
        const response = await api.post('/auth/registrar-push-token', {
          userId: userId,
          token: token.data,
        });
        
        console.log(`✅ 5. Token push registrado para ${userData.rol}: ${userData.email}`);
        return response.data;
      } else {
        console.log('⚠️ No hay usuario logueado para registrar token');
      }
    } catch (error) {
      console.error('❌ Error al registrar token en backend:', error);
      if (error.response) {
        console.error('📡 Status:', error.response.status);
        console.error('📡 Data:', error.response.data);
      }
    }
  }

  return token;
}

// ============================================
// 📱 ESCUCHAR NOTIFICACIONES
// ============================================

export function setupNotificationListeners() {
  console.log('📱 Configurando listeners de notificaciones...');

  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notificación recibida en foreground:', notification);
    
    const title = notification.request.content.title || 'Nueva notificación';
    const body = notification.request.content.body || '';
    
    Alert.alert(title, body);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('📱 Usuario tocó la notificación:', response);
    
    const data = response.notification.request.content.data;
    const title = response.notification.request.content.title || 'Notificación';
    const body = response.notification.request.content.body || '';
    
    Alert.alert(`📱 ${title}`, body);
  });

  console.log('✅ Listeners de notificaciones configurados');

  return { subscription, responseSubscription };
}

// ============================================
// 📤 ENVIAR NOTIFICACIÓN PUSH (DESDE EL FRONTEND)
// ============================================

export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📤 Respuesta de push:', result);
    return result;
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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permiso de notificaciones denegado');
        return false;
      }
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'c738e27f-e3ba-489f-8357-1a980a5d45d1',
    });

    if (!token) {
      console.log('❌ No se pudo obtener token push');
      return false;
    }

    console.log('📱 Token push obtenido:', token.data);

    const response = await api.post('/auth/registrar-push-token', {
      userId: userId,
      token: token.data,
    });

    console.log('✅ Token push registrado en backend');
    return true;

  } catch (error) {
    console.error('❌ Error registrando token después de login:', error);
    return false;
  }
}

// ============================================
// 📱 MOSTRAR NOTIFICACIÓN LOCAL (PARA PRUEBAS)
// ============================================

export async function showLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Notificación',
        body: body || 'Mensaje de prueba',
        data: data,
        sound: true,
      },
      trigger: null,
    });
    console.log('✅ Notificación local enviada');
    return true;
  } catch (error) {
    console.error('❌ Error al mostrar notificación local:', error);
    return false;
  }
}

// ============================================
// 📱 CONFIGURAR NOTIFICACIONES PARA ANDROID
// ============================================

export async function configureAndroidNotifications() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C5CE7',
        sound: true,
        enableVibrate: true,
        bypassDnd: false,
        lockScreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
      console.log('✅ Canal de notificaciones Android configurado');
    } catch (error) {
      console.error('❌ Error configurando canal Android:', error);
    }
  }
}

// ============================================
// 📱 LIMPIAR NOTIFICACIONES
// ============================================

export async function clearAllNotifications() {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log('✅ Notificaciones limpiadas');
  } catch (error) {
    console.error('❌ Error limpiando notificaciones:', error);
  }
}

// ============================================
// 📱 OBTENER TOKEN GUARDADO
// ============================================

export async function getStoredPushToken() {
  try {
    const token = await AsyncStorage.getItem('expoPushToken');
    return token;
  } catch (error) {
    console.error('❌ Error obteniendo token guardado:', error);
    return null;
  }
}