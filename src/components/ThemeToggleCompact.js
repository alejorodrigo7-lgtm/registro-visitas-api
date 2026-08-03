// src/components/ThemeToggleCompact.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ThemeToggleCompact = () => {
  const { isDark, themeMode, setTheme, theme } = useTheme();
  const { colors } = theme;

  const getIcon = () => {
    if (themeMode === 'dark') return 'moon';
    if (themeMode === 'light') return 'sunny';
    return 'phone-portrait';
  };

  const getLabel = () => {
    if (themeMode === 'dark') return 'Oscuro';
    if (themeMode === 'light') return 'Claro';
    return 'Sistema';
  };

  const toggleTheme = () => {
    if (themeMode === 'light') {
      setTheme('dark');
    } else if (themeMode === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons name={getIcon()} size={18} color="#FFFFFF" />
      <Text style={styles.text}>{getLabel()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
});

export default ThemeToggleCompact;