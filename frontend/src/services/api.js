import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ✅ USAR RENDER (SERVIDOR EN LA NUBE)
const API_URL = 'https://registro-visitas-api-v9tn.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor para agregar el token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error en interceptor:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ============================================
// 📊 SERVICIOS DEL DASHBOARD (SOLO ADMIN/JEFE)
// ============================================
export const dashboardService = {
  // Obtener estadísticas principales del dashboard
  getStats: () => api.get('/dashboard'),
  
  // Estadísticas por técnico
  getTecnicoStats: (tecnicoId) => {
    const url = tecnicoId ? `/dashboard/tecnico?tecnicoId=${tecnicoId}` : '/dashboard/tecnico';
    return api.get(url);
  },
  
  // Estadísticas de visitas por fecha
  getVisitasStats: (fechaInicio, fechaFin) => {
    return api.get(`/dashboard/visitas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
  },
  
  // Estadísticas de asistencia por fecha
  getAsistenciaStats: (fechaInicio, fechaFin) => {
    return api.get(`/dashboard/asistencia?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
  },
};

// ============================================
// 🔔 SERVICIOS DE NOTIFICACIONES
// ============================================
export const notificationService = {
  // Obtener notificaciones del usuario
  getNotifications: (params = {}) => {
    const { limit = 50, offset = 0, leida } = params;
    let url = `/notificaciones?limit=${limit}&offset=${offset}`;
    if (leida !== undefined) {
      url += `&leida=${leida}`;
    }
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
  
  // Eliminar todas leídas
  deleteRead: () => api.delete('/notificaciones/leidas'),
};

// ============================================
// 👤 SERVICIOS DE AUTENTICACIÓN
// ============================================
export const authService = {
  login: (email, password, rol) => api.post('/auth/login', { email, password, rol }),
  register: (userData) => api.post('/auth/register', userData),
  getUsuarios: () => api.get('/auth/usuarios'),
  getUsuario: (id) => api.get(`/auth/usuario/${id}`),
  updateUsuario: (id, data) => api.put(`/auth/usuario/${id}`, data),
  deleteUsuario: (id) => api.delete(`/auth/usuario/${id}`),
  toggleUsuario: (id, activo) => api.put(`/auth/usuario/${id}/toggle`, { activo }),
  changePassword: (id, currentPassword, newPassword) => 
    api.put(`/auth/usuario/${id}/password`, { currentPassword, newPassword }),
  registerPushToken: (userId, token) => api.post('/auth/push-token', { userId, token }),
};

export default api;