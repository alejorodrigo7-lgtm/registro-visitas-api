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

const MapasMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Mapas</Text>
        <Text style={styles.subtitle}>Análisis de ubicaciones y rutas</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {/* Mapa Análisis */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('MapaAnalisis')}
        >
          <Text style={styles.menuIcon}>📊</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Mapa Análisis</Text>
            <Text style={styles.menuDescription}>
              Ver puntos visitados por usuario en una fecha específica
            </Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* Mapa Real - Solo Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('MapaReal')}
          >
            <Text style={styles.menuIcon}>📍</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Mapa Real</Text>
              <Text style={styles.menuDescription}>
                Ver ubicación en tiempo real de hasta 5 usuarios
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* KMZ - Solo Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('MapaKMZ')}
          >
            <Text style={styles.menuIcon}>📁</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>KMZ</Text>
              <Text style={styles.menuDescription}>
                Subir y visualizar archivos KMZ/KML
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
});

export default MapasMenu;