import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// 🎨 TEMA OSCURO / CLARO
// ============================================

export const ThemeContext = createContext();

// Colores del tema claro
export const lightTheme = {
  colors: {
    primary: '#6C5CE7',
    primaryDark: '#5A4BD1',
    secondary: '#2D3436',
    background: '#F5F6FA',
    card: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    border: '#DFE6E9',
    danger: '#E74C3C',
    success: '#2ECC71',
    warning: '#F39C12',
    info: '#3498DB',
    header: '#6C5CE7',
    headerText: '#FFFFFF',
    shadow: '#000000',
    icon: '#2D3436',
    input: '#FFFFFF',
    inputBorder: '#DFE6E9',
    inputText: '#2D3436',
  },
  statusBar: 'dark',
  isDark: false,
};

// Colores del tema oscuro
export const darkTheme = {
  colors: {
    primary: '#8C7AE6',
    primaryDark: '#6C5CE7',
    secondary: '#FFFFFF',
    background: '#1A1A2E',
    card: '#16213E',
    text: '#FFFFFF',
    textSecondary: '#B2BEC3',
    border: '#2D3436',
    danger: '#E74C3C',
    success: '#2ECC71',
    warning: '#F39C12',
    info: '#3498DB',
    header: '#0F0F1A',
    headerText: '#FFFFFF',
    shadow: '#000000',
    icon: '#FFFFFF',
    input: '#1A1A2E',
    inputBorder: '#2D3436',
    inputText: '#FFFFFF',
  },
  statusBar: 'light',
  isDark: true,
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme) {
          setThemeMode(savedTheme);
          if (savedTheme === 'system') {
            setIsDark(systemColorScheme === 'dark');
          } else {
            setIsDark(savedTheme === 'dark');
          }
        }
      } catch (error) {
        console.error('Error cargando tema:', error);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const setTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('@theme_mode', mode);
      if (mode === 'system') {
        setIsDark(systemColorScheme === 'dark');
      } else {
        setIsDark(mode === 'dark');
      }
    } catch (error) {
      console.error('Error guardando tema:', error);
    }
  };

  const getTheme = () => {
    return isDark ? darkTheme : lightTheme;
  };

  const getThemeName = () => {
    if (themeMode === 'system') return 'Sistema';
    return themeMode === 'dark' ? 'Oscuro' : 'Claro';
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: getTheme(),
        isDark,
        themeMode,
        setTheme,
        getTheme,
        getThemeName,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};