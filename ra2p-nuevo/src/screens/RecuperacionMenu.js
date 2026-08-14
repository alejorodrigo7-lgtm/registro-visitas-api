import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const RecuperacionMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);
  const isCoordinador = user?.rol === 'Coordinador';

  const menuItems = [
    {
      id: 'SubirOrden',
      label: '📤 Subir Orden',
      icon: 'cloud-upload-outline',
      visible: isAdminOrJefe,
      screen: 'SubirOrden'
    },
    {
      id: 'EjecutarOrden',
      label: '⚙️ Ejecutar Orden',
      icon: 'construct-outline',
      visible: isCoordinador || isAdminOrJefe,
      screen: 'EjecutarOrden'
    },
    {
      id: 'PendientesRetirar',
      label: '⏳ Pendientes por Retirar',
      icon: 'time-outline',
      visible: true,
      screen: 'PendientesRetirar'
    },
    {
      id: 'Retirados',
      label: '✅ Retirados',
      icon: 'checkmark-done-outline',
      visible: true,
      screen: 'Retirados'
    },
    {
      id: 'RevisarOrdenes',
      label: '📋 Revisar Órdenes',
      icon: 'clipboard-outline',
      visible: true,
      screen: 'RevisarOrdenes'
    }
  ];

  const visibleItems = menuItems.filter(item => item.visible);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperación de Equipos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.menuContainer}>
        {visibleItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={28} color="#6C5CE7" />
            <Text style={styles.menuItemText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  menuContainer: { padding: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#2D3436', marginLeft: 12 },
});

export default RecuperacionMenu;