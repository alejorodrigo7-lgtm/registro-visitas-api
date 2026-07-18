import React, { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert } from 'react-native';

const ScreenCaptureBlocker = ({ children }) => {
  useEffect(() => {
    let isMounted = true;

    const preventScreenCapture = async () => {
      try {
        // Bloquear capturas de pantalla
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('📸 Capturas de pantalla bloqueadas');
      } catch (error) {
        console.log('⚠️ Error bloqueando capturas:', error);
      }
    };

    // Detectar intentos de captura
    const subscription = ScreenCapture.addListener(
      ScreenCapture.ScreenCaptureEvent,
      (event) => {
        if (isMounted) {
          Alert.alert(
            '⚠️ Captura de Pantalla Detectada',
            'No está permitido tomar capturas de pantalla en esta aplicación por razones de seguridad.',
            [{ text: 'Entendido', style: 'default' }]
          );
          // Volver a bloquear después de la detección
          setTimeout(preventScreenCapture, 500);
        }
      }
    );

    // Activar bloqueo al montar
    preventScreenCapture();

    return () => {
      isMounted = false;
      subscription?.remove();
      // Liberar el bloqueo al desmontar
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  return children;
};

export default ScreenCaptureBlocker;