// src/services/dashboardService.js
import api from './api';

// 📊 Datos de prueba (cuando el backend falla)
const getMockData = () => {
  return {
    resumen: {
      usuarios: {
        total: 5,
        activos: 5,
        inactivos: 0,
      },
      visitas: {
        hoy: 0,
        semana: 1,
        mes: 13,
        tendencia: {
          direccion: 'bajando',
          porcentaje: 100,
        },
      },
      asistencias: {
        hoy: 0,
        semana: 0,
        mes: 2,
        tendencia: {
          direccion: 'estable',
          porcentaje: 0,
        },
      },
      ausencias: {
        pendientes: 0,
        aprobadas: 0,
        rechazadas: 0,
      },
      notificaciones: {
        noLeidas: 22,
        total: 22,
      },
    },
    actualizado: new Date().toISOString(),
  };
};

// ✅ Servicio del Dashboard
const dashboardService = {
  // Obtener estadísticas del dashboard
  getStats: async () => {
    try {
      console.log('📊 Intentando obtener datos del backend...');
      
      // Intentar obtener datos del backend
      const response = await api.get('/dashboard/stats');
      console.log('📊 Respuesta del backend:', response.status);
      
      // Verificar si los datos son válidos
      if (response.data && response.data.data && response.data.data.resumen) {
        console.log('✅ Datos del backend válidos');
        return response;
      }
      
      // Si no hay datos válidos, usar datos de prueba
      console.log('📊 Usando datos de prueba (backend sin datos)');
      return {
        data: getMockData(),
        status: 200,
      };
      
    } catch (error) {
      console.log('❌ Error en backend:', error.message);
      console.log('📊 Usando datos de prueba (error en backend)');
      
      // Si falla, devolver datos de prueba
      return {
        data: getMockData(),
        status: 200,
      };
    }
  },
};

export default dashboardService;