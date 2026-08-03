// src/screens/DesconexionesMenu.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DesconexionesMenu = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  const isAdmin = user?.rol === 'Admin';
  const isJefe = user?.rol === 'Jefe';
  const isCoordinador = user?.rol === 'Coordinador';
  const isTecnico = user?.rol === 'Tecnico';

  const menuItems = [
    // 1️⃣ REGISTRAR DESCONEXIÓN - Coordinador y Técnico
    {
      id: 'RegistrarDesconexion',
      label: '1️⃣ Registrar Desconexión',
      icon: 'power-outline',
      show: isCoordinador || isTecnico,
    },
    // 2️⃣ REGISTRAR RECONEXIÓN - Coordinador y Técnico
    {
      id: 'RegistrarReconexion',
      label: '2️⃣ Registrar Reconexión',
      icon: 'reload-outline',
      show: isCoordinador || isTecnico,
    },
    // 3️⃣ EJECUCIÓN - Coordinador y Técnico
    {
      id: 'EjecucionDesconexiones',
      label: '3️⃣ Ejecución',
      icon: 'play-outline',
      show: isCoordinador || isTecnico,
    },
    // 4️⃣ BUSCAR DES/REC - Todos
    {
      id: 'BuscarDesconexiones',
      label: '4️⃣ Buscar Des/Rec',
      icon: 'search-outline',
      show: isAdmin || isJefe || isCoordinador || isTecnico,
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.title}>🔌 Desconexiones/Reconexiones</Text>
        <Text style={styles.subtitle}>Gestión de servicios de desconexión y reconexión</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                {item.label}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DesconexionesMenu;