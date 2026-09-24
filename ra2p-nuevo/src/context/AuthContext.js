import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // ============================================
  // LOGIN
  // ============================================
  const login = async (email, password, selectedRole) => {
    try {
      console.log('📱 Login intentando con:', email);
      
      // ✅ RUTA CORRECTA: /auth/login
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      console.log('✅ Login exitoso');

      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;
        
        // Guardar en AsyncStorage
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        return { success: true, user: userData };
      } else {
        return { success: false, error: 'Credenciales incorrectas' };
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  };

  // ============================================
  // ============================================
  // REFRESCAR CONTADOR DE NOTIFICACIONES NO LEIDAS
  // ============================================
  const refreshUnreadCount = async () => {
    try {
      const response = await api.get('/notificaciones/no-leidas/count');
      if (response.data.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error obteniendo contador:', error.message);
    }
  };

  // LOGOUT
  // ============================================
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  };

  // ============================================
  // CARGAR USUARIO GUARDADO
  // ============================================
  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('❌ Error cargando usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Refrescar contador cuando el usuario se loguea
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        unreadCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export default AuthContext;