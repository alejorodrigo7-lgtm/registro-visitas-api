// src/services/ubicacionService.js
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const TASK_NAME = 'UBICACION_EN_SEGUNDO_PLANO';
const STORAGE_KEY = '@ubicacion_activa';

// ✅ Registrar tarea en segundo plano
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Error en tarea de ubicación:', error);
    return;
  }
  
  if (data.locations && data.locations.length > 0) {
    const { coords } = data.locations[0];
    const { latitude, longitude } = coords;
    
    console.log(`📍 Ubicación en segundo plano: ${latitude}, ${longitude}`);
    
    try {
      // ✅ Guardar ubicación en el backend
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await api.post('/mapas/ubicaciones', {
          latitud: latitude,
          longitud: longitude,
          tipo: 'background',
          datos: { 
            automatico: true,
            timestamp: new Date().toISOString()
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Ubicación guardada en segundo plano');
      }
    } catch (error) {
      console.error('❌ Error guardando ubicación en segundo plano:', error);
    }
  }
});

// ✅ Iniciar seguimiento de ubicación en segundo plano
export const iniciarSeguimientoUbicacion = async () => {
  try {
    console.log('📍 Iniciando seguimiento de ubicación en segundo plano...');
    
    // Solicitar permisos
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('❌ Permiso de ubicación denegado');
      return false;
    }
    
    // Permiso para segundo plano (Android)
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('⚠️ Sin permiso de ubicación en segundo plano');
      // Continuar igual, solo no funcionará en segundo plano
    }
    
    // Verificar si ya está activo
    const isActive = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (isActive) {
      console.log('⚠️ El seguimiento ya está activo');
      return true;
    }
    
    // ✅ Iniciar seguimiento con configuración optimizada
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 60000,           // 1 minuto (ajustable)
      distanceInterval: 50,           // 50 metros
      deferUpdates: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: '📍 RA²P - Ubicación activa',
        notificationBody: 'Compartiendo ubicación en tiempo real',
        notificationColor: '#6C5CE7',
      },
    });
    
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    console.log('✅ Seguimiento de ubicación iniciado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error iniciando seguimiento:', error);
    return false;
  }
};

// ✅ Detener seguimiento de ubicación
export const detenerSeguimientoUbicacion = async () => {
  try {
    const isActive = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (isActive) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('✅ Seguimiento de ubicación detenido');
    return true;
  } catch (error) {
    console.error('❌ Error deteniendo seguimiento:', error);
    return false;
  }
};

// ✅ Verificar estado del seguimiento
export const isSeguimientoActivo = async () => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  } catch {
    return false;
  }
};

// ✅ Obtener estado para mostrar en la UI
export const getUbicacionStatus = async () => {
  const isActive = await isSeguimientoActivo();
  return {
    activo: isActive,
    mensaje: isActive ? '🟢 Ubicación activa' : '🔴 Ubicación inactiva',
  };
};

// ✅ Obtener ubicación actual (una sola vez)
export const obtenerUbicacionActual = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitud: location.coords.latitude,
      longitud: location.coords.longitude,
    };
  } catch (error) {
    console.error('❌ Error obteniendo ubicación:', error);
    return null;
  }
};