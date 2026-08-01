import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('@user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // ✅ Cargar contador de notificaciones no leídas
          await loadUnreadCount();
          
          // ✅ Registrar token push después de cargar usuario
          console.log('📱 Cargando usuario guardado, registrando token push...');
          await registerForPushNotificationsAsync();
        }
      } catch (error) {
        console.error('Error cargando usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Cargar contador de no leídas
  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/notificaciones/no-leidas/count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error cargando contador de notificaciones:', error);
    }
  };

  const login = async (email, password, rol) => {
    try {
      console.log(`📡 Intentando login: ${email}, rol: ${rol}`);
      
      const response = await api.post('/auth/login', { 
        email, 
        password,
        rol
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('@user', JSON.stringify(user));
        
        setToken(token);
        setUser(user);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // ✅ Cargar contador de notificaciones no leídas
        await loadUnreadCount();
        
        // ✅ REGISTRAR TOKEN PUSH DESPUÉS DEL LOGIN
        console.log(`📱 Registrando token push para ${user.rol}: ${user.email}...`);
        await registerForPushNotificationsAsync();
        
        return { success: true, user };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Error en login:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('@user');
      setToken(null);
      setUser(null);
      setUnreadCount(0);
      delete api.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  const getToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      return storedToken;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  };

  const getUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  };

  // ✅ Función para refrescar el contador de notificaciones
  const refreshUnreadCount = async () => {
    await loadUnreadCount();
  };

  // ✅ Verificar si es Admin o Jefe
  const isAdminOrJefe = () => {
    return user && ['Admin', 'Jefe'].includes(user.rol);
  };

  // ✅ Verificar si es Admin
  const isAdmin = () => {
    return user && user.rol === 'Admin';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      getToken, 
      getUser,
      unreadCount,
      refreshUnreadCount,
      isAdminOrJefe,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
};

export const getUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('@user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
};