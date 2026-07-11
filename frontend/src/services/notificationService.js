import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import api from './api';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registrar dispositivo para notificaciones push
export async function registerForPushNotificationsAsync() {
  let token;

  // Verificar que es un dispositivo físico (no emulador)
  if (!Device.isDevice) {
    console.log('❌ Debes usar un dispositivo físico para notificaciones push');
    return;
  }

  // Solicitar permisos
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

  // Obtener el token de Expo
  try {
    token = await Notifications.getExpoPushTokenAsync({
      projectId: 'c738e27f-e3ba-489f-8357-1a980a5d45d1',
    });
    console.log('✅ Token push obtenido:', token.data);
  } catch (error) {
    console.error('❌ Error al obtener token push:', error);
    return;
  }

  // Guardar el token en el backend
  if (token) {
    try {
      const user = await AsyncStorage.getItem('@user');
      if (user) {
        const userData = JSON.parse(user);
        console.log('📡 Registrando token para usuario:', userData.id);
        
        // Verificar que el token existe en el header
        console.log('🔑 Token JWT:', api.defaults.headers.common['Authorization'] ? '✅ Disponible' : '❌ No disponible');
        
        const response = await api.post('/auth/registrar-push-token', {
          userId: userData.id,
          token: token.data,
        });
        
        console.log('✅ Token push registrado en el backend para:', userData.email);
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

// Recibir notificaciones en foreground
export function setupNotificationListeners() {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notificación recibida en foreground:', notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('📱 Usuario tocó la notificación:', response);
  });

  return { subscription, responseSubscription };
}

// Enviar notificación push (desde el frontend)
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