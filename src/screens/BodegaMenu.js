import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const BodegaMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Admin';
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  if (!isAdminOrJefe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>⛔</Text>
          <Text style={styles.deniedTitle}>Acceso Denegado</Text>
          <Text style={styles.deniedText}>
            Solo Administradores y Jefes pueden acceder a esta sección
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Bodegas</Text>
        <Text style={styles.subtitle}>Gestión de inventario</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {/* Crear Bodega - Solo Admin */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('CrearBodega')}
          >
            <Text style={styles.menuIcon}>🏗️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Crear Bodega</Text>
              <Text style={styles.menuDescription}>
                Asignar bodega a un usuario
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Asignar Material - Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('AsignarMaterial')}
          >
            <Text style={styles.menuIcon}>📦</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Asignar Material</Text>
              <Text style={styles.menuDescription}>
                Asignar materiales a bodegas
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Revisar Bodegas - Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('RevisionBodegas')}
          >
            <Text style={styles.menuIcon}>🔍</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Revisar Bodegas</Text>
              <Text style={styles.menuDescription}>
                Ver inventario de bodegas
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 30,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  menuDescription: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    color: '#B2BEC3',
  },
  adminMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deniedIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  deniedText: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
  },
});

export default BodegaMenu;