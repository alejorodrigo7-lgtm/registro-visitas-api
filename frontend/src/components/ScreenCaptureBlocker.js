import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// Importar dinámicamente para evitar errores en Expo Go
let ScreenCapture;
try {
  ScreenCapture = require('expo-screen-capture');
} catch (error) {
  console.log('📸 expo-screen-capture no disponible');
  ScreenCapture = null;
}

const ScreenCaptureBlocker = ({ children }) => {
  useEffect(() => {
    // Solo ejecutar en dispositivo real (no en Expo Go)
    if (!ScreenCapture) {
      console.log('📸 Bloqueo de capturas no disponible en este entorno');
      return;
    }

    let isMounted = true;

    const preventScreenCapture = async () => {
      try {
        if (isMounted) {
          await ScreenCapture.preventScreenCaptureAsync();
          console.log('📸 Capturas de pantalla bloqueadas');
        }
      } catch (error) {
        console.log('⚠️ Error bloqueando capturas:', error);
      }
    };

    // Bloquear capturas
    preventScreenCapture();

    return () => {
      isMounted = false;
      // Liberar el bloqueo al desmontar
      try {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        console.log('📸 Capturas de pantalla permitidas nuevamente');
      } catch (error) {
        // Ignorar
      }
    };
  }, []);

  return children;
};

export default ScreenCaptureBlocker;