import React, { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert } from 'react-native';

const ScreenCaptureBlocker = ({ children }) => {
  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const preventScreenCapture = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('📸 Capturas de pantalla bloqueadas');
      } catch (error) {
        console.log('⚠️ Error bloqueando capturas:', error);
      }
    };

    // 🔥 DETECTAR INTENTOS DE CAPTURA
    const setupListener = async () => {
      try {
        // Intentar con el método correcto para la versión instalada
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
          console.log('📸 Listener de capturas configurado (addScreenCaptureListener)');
        } else if (typeof ScreenCapture.addListener === 'function') {
          // Fallback para versiones antiguas
          subscription = ScreenCapture.addListener(
            ScreenCapture.ScreenCaptureEvent,
            () => {
              if (isMounted) {
                Alert.alert(
                  '⚠️ Captura de Pantalla Detectada',
                  'No está permitido tomar capturas de pantalla en esta aplicación por razones de seguridad.',
                  [{ text: 'Entendido', style: 'default' }]
                );
                setTimeout(preventScreenCapture, 500);
              }
            }
          );
          console.log('📸 Listener de capturas configurado (addListener)');
        }
      } catch (error) {
        console.log('⚠️ Error configurando listener:', error);
      }
    };

    // Activar bloqueo al montar
    preventScreenCapture();
    setupListener();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
      // Liberar el bloqueo al desmontar
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  return children;
};

export default ScreenCaptureBlocker;