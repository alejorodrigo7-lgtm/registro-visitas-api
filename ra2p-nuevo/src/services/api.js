import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ URL del backend (la que funcionaba antes)
const API_URL = 'https://registro-visitas-api-v9tn.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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

export default api;