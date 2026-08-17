// src/utils/webMock.js
// Configuración de mocks para web

import { Platform } from 'react-native';

// Solo aplicar en web
if (Platform.OS === 'web') {
  // Mock de expo-sqlite
  const mockSQLite = require('./expo-sqlite.mock').default;
  
  // Sobrescribir el módulo expo-sqlite
  jest.mock('expo-sqlite', () => mockSQLite);
  
  console.log('🌐 Mocks configurados para web');
}

export default {};