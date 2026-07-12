import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('@user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // ✅ Registrar token push después de cargar usuario (para cualquier rol)
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
        
        // ✅ REGISTRAR TOKEN PUSH DESPUÉS DEL LOGIN (PARA CUALQUIER ROL)
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      getToken, 
      getUser 
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