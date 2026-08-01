import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
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