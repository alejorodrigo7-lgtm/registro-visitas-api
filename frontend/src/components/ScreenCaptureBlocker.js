import React, { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Platform } from 'react-native';

const ScreenCaptureBlocker = ({ children }) => {
  useEffect(() => {
    // Solo ejecutar en dispositivo real (no en Expo Go)
    const isExpoGo = !__DEV__ || !Platform.OS;
    
    if (isExpoGo) {
      console.log('📸 Expo Go detectado - bloqueo de capturas no disponible');
      return;
    }

    let isMounted = true;

    const preventScreenCapture = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('📸 Capturas de pantalla bloqueadas');
      } catch (error) {
        console.log('⚠️ Error bloqueando capturas:', error);
      }
    };

    // Activar bloqueo al montar
    preventScreenCapture();

    // Detectar intentos de captura (solo en dispositivos reales)
    let subscription = null;
    try {
      if (typeof ScreenCapture.addScreenCaptureListener === 'function') {
        subscription = ScreenCapture.addScreenCaptureListener(() => {
          if (isMounted) {
            Alert.alert(
              '⚠️ Captura de Pantalla Detectada',
              'No está permitido tomar capturas de pantalla en esta aplicación por razones de seguridad.',
              [{ text: 'Entendido', style: 'default' }]
            );
            setTimeout(preventScreenCapture, 500);
          }
        });
        console.log('📸 Listener de capturas configurado');
      }
    } catch (error) {
      console.log('⚠️ Error configurando listener:', error);
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  return children;
};

export default ScreenCaptureBlocker;