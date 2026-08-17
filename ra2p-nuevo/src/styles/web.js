// src/styles/web.js
// Estilos globales para web

import { StyleSheet, Platform } from 'react-native';

export const webStyles = StyleSheet.create({
  // Contenedor principal para scroll en web
  webContainer: {
    flex: 1,
    height: Platform.OS === 'web' ? '100vh' : '100%',
    overflowY: Platform.OS === 'web' ? 'auto' : 'visible',
    WebkitOverflowScrolling: 'touch',
  },
  // Contenido con scroll
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    minHeight: Platform.OS === 'web' ? '100vh' : '100%',
  },
  // Para pantallas que necesitan scroll
  scrollView: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    height: Platform.OS === 'web' ? 'calc(100vh - 60px)' : '100%',
  },
});

// Componente para envolver pantallas con scroll
export const withWebScroll = (Component) => {
  if (Platform.OS !== 'web') return Component;
  
  return (props) => (
    <div style={{ 
      height: '100vh', 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch',
      padding: '16px',
      backgroundColor: '#f5f5f5',
    }}>
      <Component {...props} />
    </div>
  );
};

export default webStyles;