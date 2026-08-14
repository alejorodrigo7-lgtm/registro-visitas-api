// src/screens/DesconexionesMenu.js
import React, { useState, useEffect } from 'react';
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
import api from '../services/api';

const DesconexionesMenu = ({ navigation }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const [pendientes, setPendientes] = useState(0);

  const isAdmin = user?.rol === 'Admin';
  const isJefe = user?.rol === 'Jefe';
  const isCoordinador = user?.rol === 'Coordinador';
  const isTecnico = user?.rol === 'Tecnico';
  const isAdminOrJefe = isAdmin || isJefe;

  // Cargar contador de pendientes
  useEffect(() => {
    const cargarPendientes = async () => {
      try {
        const response = await api.get('/desconexiones/pendientes');
        if (response.data.success) {
          setPendientes(response.data.count || 0);
        }
      } catch (error) {
        console.error('Error cargando pendientes:', error);
      }
    };
    cargarPendientes();
  }, []);

  const menuItems = [
    // 1️⃣ REGISTRAR DESCONEXIÓN - Todos
    {
      id: 'RegistrarDesconexion',
      label: '1️⃣ Registrar Desconexión',
      subtitle: 'Registrar corte de servicio',
      icon: 'power-outline',
      color: '#FF6B6B',
      show: true,
      badge: 0,
    },
    // 2️⃣ REGISTRAR RECONEXIÓN - Todos
    {
      id: 'RegistrarReconexion',
      label: '2️⃣ Registrar Reconexión',
      subtitle: 'Registrar reactivación de servicio',
      icon: 'refresh-outline',
      color: '#4ECDC4',
      show: true,
      badge: 0,
    },
    // 3️⃣ EJECUCIÓN - SOLO Admin y Jefe
    {
      id: 'Ejecucion',
      label: '3️⃣ Ejecución',
      subtitle: 'Ejecutar o rechazar solicitudes',
      icon: 'checkmark-done-outline',
      color: '#FFD93D',
      show: isAdminOrJefe, // ✅ Solo Admin y Jefe
      badge: pendientes,
    },
    // 4️⃣ BUSCAR DES/REC - Todos
    {
      id: 'BuscarDesRec',
      label: '4️⃣ Buscar Des/Rec',
      subtitle: 'Historial con filtros',
      icon: 'search-outline',
      color: '#6C5CE7',
      show: true,
      badge: 0,
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>🔌 Desconexiones/Reconexiones</Text>
          <Text style={styles.subtitle}>Gestión de servicios de desconexión y reconexión</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { backgroundColor: colors.card, borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
    borderLeftWidth: 4,
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
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DesconexionesMenu;