import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, themeMode, setTheme, theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>🌙 Tema</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            themeMode === 'light' && [styles.activeButton, { borderColor: colors.primary }],
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          onPress={() => setTheme('light')}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>☀️ Claro</Text>
          {themeMode === 'light' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            themeMode === 'dark' && [styles.activeButton, { borderColor: colors.primary }],
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          onPress={() => setTheme('dark')}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>🌙 Oscuro</Text>
          {themeMode === 'dark' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            themeMode === 'system' && [styles.activeButton, { borderColor: colors.primary }],
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
          onPress={() => setTheme('system')}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>🔄 Sistema</Text>
          {themeMode === 'system' && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  activeButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ThemeToggle;