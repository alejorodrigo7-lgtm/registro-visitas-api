// ra2p-nuevo/src/screens/VentasMenu.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const VentasMenu = ({ navigation }) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    getUserRole();
  }, []);

  const getUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || user?.rol || '');
    } catch (error) {
      console.error('Error al obtener rol:', error);
    }
  };

  const isAdminOrJefe = userRole === 'Admin' || userRole === 'Jefe' || user?.rol === 'Admin' || user?.rol === 'Jefe';

  const menuItems = [
    {
      id: 'VentaNueva',
      label: 'Venta Nueva',
      icon: 'add-circle-outline',
      description: 'Registrar nueva venta',
      show: true,
      color: '#2196F3',
    },
    {
      id: 'IngresoVenta',
      label: 'Ingreso de Venta',
      icon: 'checkmark-circle-outline',
      description: 'Confirmar ingreso de ventas',
      show: isAdminOrJefe,
      color: '#4CAF50',
    },
    {
      id: 'ReporteVenta',
      label: 'Reporte de Venta',
      icon: 'document-text-outline',
      description: 'Generar reporte de venta',
      show: true,
      color: '#FF9800',
    },
    {
      id: 'PagoVenta',
      label: 'Pago de Venta',
      icon: 'cash-outline',
      description: 'Registrar pagos de ventas',
      show: isAdminOrJefe,
      color: '#9C27B0',
    },
    {
      id: 'BuscarVentasPagadas',
      label: 'Buscar Ventas Pagadas',
      icon: 'search-outline',
      description: 'Historial de ventas pagadas',
      show: true,
      color: '#607D8B',
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D4A574" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 Ventas</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuItem, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color="#666" />
          </TouchableOpacity>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Módulo de Ventas v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,165,116,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
  textContainer: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#444',
    letterSpacing: 1,
  },
});

export default VentasMenu;