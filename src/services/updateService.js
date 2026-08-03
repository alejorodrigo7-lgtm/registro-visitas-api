// src/services/updateService.js
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

// ✅ Verificar si hay actualizaciones disponibles
export const checkForUpdates = async () => {
  try {
    console.log('🔍 Verificando actualizaciones...');
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('✅ Actualización disponible!');
      return true;
    } else {
      console.log('✅ No hay actualizaciones disponibles');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando actualizaciones:', error);
    return false;
  }
};

// ✅ Mostrar alerta de actualización al usuario
export const showUpdateAlert = async () => {
  try {
    const hasUpdate = await checkForUpdates();
    
    if (hasUpdate) {
      Alert.alert(
        '📱 Actualización Disponible',
        'Hay una nueva versión de la aplicación disponible. ¿Deseas actualizar ahora?',
        [
          {
            text: 'Más tarde',
            style: 'cancel',
            onPress: () => console.log('⏳ Actualización pospuesta')
          },
          {
            text: 'Actualizar',
            onPress: async () => {
              await performUpdate();
            }
          }
        ],
        { cancelable: false }
      );
    }
  } catch (error) {
    console.error('❌ Error en showUpdateAlert:', error);
  }
};

// ✅ Ejecutar la actualización
export const performUpdate = async () => {
  try {
    console.log('🔄 Descargando actualización...');
    
    Alert.alert(
      '⏳ Actualizando...',
      'Descargando la nueva versión. Por favor espera.'
    );
    
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      
      Alert.alert(
        '✅ Actualización Completa',
        'La aplicación se actualizará al reiniciar. ¿Deseas reiniciar ahora?',
        [
          {
            text: 'Reiniciar después',
            style: 'cancel'
          },
          {
            text: 'Reiniciar ahora',
            onPress: async () => {
              await Updates.reloadAsync();
            }
          }
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error en performUpdate:', error);
    Alert.alert(
      '❌ Error',
      'No se pudo completar la actualización. Intenta más tarde.'
    );
  }
};

// ✅ Verificar al iniciar la app
export const checkUpdateOnStart = async () => {
  try {
    // Esperar 3 segundos para que la app cargue
    setTimeout(async () => {
      await showUpdateAlert();
    }, 3000);
  } catch (error) {
    console.error('❌ Error en checkUpdateOnStart:', error);
  }
};