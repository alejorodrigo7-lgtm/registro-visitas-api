import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ URL del backend (la que funcionaba antes)
const API_URL = 'https://registro-visitas-api-v9tn.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('❌ Error en interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    console.error(`❌ API Error [${status}] ${url}:`, error.response?.data || error.message);
    
    if (status === 401) {
      console.warn('⚠️ Token expirado, limpiando sesion...');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// NOTIFICACIONES - SERVICIOS
// ============================================
export const notificationService = {
  // Obtener notificaciones del usuario
  getNotifications: (params = {}) => {
    const { limit = 100, offset = 0 } = params;
    let url = `/notificaciones?limit=${limit}&skip=${offset}`;
    return api.get(url);
  },

  // Contar no leídas
  getUnreadCount: () => api.get('/notificaciones/no-leidas/count'),

  // Marcar como leída
  markAsRead: (id) => api.put(`/notificaciones/${id}/leer`),

  // Marcar todas como leídas
  markAllAsRead: () => api.put('/notificaciones/leer-todas'),

  // Eliminar notificación
  deleteNotification: (id) => api.delete(`/notificaciones/${id}`),
};

// ============================================
// 🆕 SERVICIOS DE GESTIÓN
// ============================================
export const gestionService = {
  // Listar técnicos activos (Admin/Jefe)
  getTecnicos: () => api.get('/gestion/tecnicos'),

  // Crear servicio de gestión (TODOS los roles)
  crearServicioGestion: (data) => api.post('/gestion/servicios', data),

  // Listar servicios pendientes de revisión (Admin/Jefe)
  getPendientes: () => api.get('/gestion/servicios/pendientes'),

  // Listar todos los servicios de gestión (Admin/Jefe)
  getTodos: () => api.get('/gestion/servicios'),

  // Marcar como RESUELTO (Admin/Jefe)
  marcarResuelto: (id, observacion) =>
    api.put(`/gestion/servicios/${id}/resuelto`, { observacion }),

  // Asignar VISITA PRESENCIAL (Admin/Jefe)
  asignarVisita: (id, segundaObservacion, tecnicoId) =>
    api.put(`/gestion/servicios/${id}/visita`, { segundaObservacion, tecnicoId }),
};

export default api;