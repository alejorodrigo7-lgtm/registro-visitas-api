import NetInfo from '@react-native-community/netinfo';
import { sincronizarTodos, contarPendientes } from './database';
import api from './api';
import { Alert } from 'react-native';

let syncInterval = null;

// ============================================
// 🚀 INICIAR SINCRONIZACIÓN AUTOMÁTICA
// ============================================
export const iniciarSincronizacionAutomatica = async (onSyncComplete) => {
  // Detener sincronización anterior
  detenerSincronizacionAutomatica();
  
  // Sincronizar inmediatamente si hay conexión
  const netInfo = await NetInfo.fetch();
  if (netInfo.isConnected) {
    await ejecutarSincronizacion(onSyncComplete);
  }
  
  // Configurar sincronización cada 5 minutos
  syncInterval = setInterval(async () => {
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await ejecutarSincronizacion(onSyncComplete);
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  // Escuchar cambios de conexión
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      await ejecutarSincronizacion(onSyncComplete);
    }
  });
  
  return unsubscribe;
};

// ============================================
// 🔄 EJECUTAR SINCRONIZACIÓN
// ============================================
export const ejecutarSincronizacion = async (onSyncComplete) => {
  try {
    const pendientes = await contarPendientes();
    
    if (pendientes.total === 0) {
      if (onSyncComplete) onSyncComplete({ sincronizados: 0, total: 0 });
      return { success: true, sincronizados: 0, total: 0 };
    }
    
    console.log(`🔄 Sincronizando ${pendientes.total} elementos...`);
    
    const result = await sincronizarTodos(api);
    
    if (result.sincronizados > 0 && onSyncComplete) {
      onSyncComplete(result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ⏹️ DETENER SINCRONIZACIÓN
// ============================================
export const detenerSincronizacionAutomatica = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏹️ Sincronización automática detenida');
  }
};

// ============================================
// 📊 VERIFICAR ESTADO DE SINCRONIZACIÓN
// ============================================
export const verificarEstadoSincronizacion = async () => {
  const netInfo = await NetInfo.fetch();
  const pendientes = await contarPendientes();
  
  return {
    conectado: netInfo.isConnected,
    pendientes: pendientes.total,
    detalles: pendientes,
    sincronizando: syncInterval !== null,
  };
};

export default {
  iniciarSincronizacionAutomatica,
  detenerSincronizacionAutomatica,
  ejecutarSincronizacion,
  verificarEstadoSincronizacion,
};