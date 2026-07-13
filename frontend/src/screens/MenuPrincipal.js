import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { registerForPushNotificationsAsync } from '../services/notificationService';

const MenuPrincipal = ({ navigation }) => {
  const { user, logout } = useAuth();

  useEffect(() => {
    const registerPush = async () => {
      try {
        await registerForPushNotificationsAsync();
      } catch (error) {
        console.log('⚠️ Error registrando push:', error);
      }
    };
    registerPush();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('RoleSelection');
          },
        },
      ]
    );
  };

  const isAdmin = user?.rol === 'Admin';
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);
  const isTecnicoOrCoordinador = ['Tecnico', 'Coordinador'].includes(user?.rol);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bienvenido,</Text>
        <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
        <Text style={styles.userRole}>{user?.rol || ''}</Text>
      </View>

      <ScrollView
        style={styles.menuScrollView}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.menuContentContainer}
      >
        {/* Registrar Visita - Todos */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('RegistroVisita')}
        >
          <Text style={styles.menuItemText}>📋 Registrar Visita</Text>
        </TouchableOpacity>

        {/* Alertas - Todos */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Alertas')}
        >
          <Text style={styles.menuItemText}>🔔 Alertas</Text>
        </TouchableOpacity>

        {/* Horarios - Todos los usuarios */}
        {isAdminOrJefe ? (
          // Admin y Jefe: Gestión completa
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('GestionHorarios')}
          >
            <Text style={[styles.menuItemText, styles.adminMenuItemText]}>
              📋 Gestión de Horarios
            </Text>
          </TouchableOpacity>
        ) : isTecnicoOrCoordinador ? (
          // Técnico y Coordinador: Solo Mi Horario
          <TouchableOpacity
            style={[styles.menuItem, styles.horarioMenuItem]}
            onPress={() => navigation.navigate('GestionHorarios')}
          >
            <Text style={[styles.menuItemText, styles.horarioMenuItemText]}>
              📋 Mi Horario
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Gestión de Usuarios - Solo Admin */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('GestionUsuarios')}
          >
            <Text style={[styles.menuItemText, styles.adminMenuItemText]}>
              👥 Gestión de Usuarios
            </Text>
          </TouchableOpacity>
        )}

        {/* Transferencias - Todos */}
        <TouchableOpacity
          style={[styles.menuItem, styles.transferenciaMenuItem]}
          onPress={() => navigation.navigate('TransferenciasMenu')}
        >
          <Text style={[styles.menuItemText, styles.transferenciaMenuItemText]}>
            💰 Transferencias
          </Text>
        </TouchableOpacity>

        {/* Servicios - Todos */}
        <TouchableOpacity
          style={[styles.menuItem, styles.servicioMenuItem]}
          onPress={() => navigation.navigate('ServiciosMenu')}
        >
          <Text style={[styles.menuItemText, styles.servicioMenuItemText]}>
            🛠️ Servicios
          </Text>
        </TouchableOpacity>

        {/* Cajas - Solo Jefe y Admin */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.cajaMenuItem]}
            onPress={() => navigation.navigate('CajasMenu')}
          >
            <Text style={[styles.menuItemText, styles.cajaMenuItemText]}>
              💰 Cajas
            </Text>
          </TouchableOpacity>
        )}

        {/* Reportes - Solo Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.reporteMenuItem]}
            onPress={() => navigation.navigate('Reportes')}
          >
            <Text style={[styles.menuItemText, styles.reporteMenuItemText]}>
              📊 Reportes
            </Text>
          </TouchableOpacity>
        )}

        {/* Bodegas - Solo Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.bodegaMenuItem]}
            onPress={() => navigation.navigate('BodegaMenu')}
          >
            <Text style={[styles.menuItemText, styles.bodegaMenuItemText]}>
              🏪 Bodegas
            </Text>
          </TouchableOpacity>
        )}

        {/* Cerrar Sesión - Siempre al final */}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.menuItemText, styles.logoutText]}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Espacio extra al final para mejor scroll */}
        <View style={styles.footerSpacer} />
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
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  userRole: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.9,
  },
  menuScrollView: {
    flex: 1,
  },
  menuContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
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
  menuItemText: {
    fontSize: 18,
    color: '#2D3436',
  },
  adminMenuItem: {
    backgroundColor: '#6C5CE7',
    borderWidth: 2,
    borderColor: '#5A4BD1',
  },
  adminMenuItemText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  horarioMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  horarioMenuItemText: {
    color: '#0984E3',
    fontWeight: '500',
  },
  transferenciaMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  transferenciaMenuItemText: {
    color: '#0984E3',
    fontWeight: '500',
  },
  servicioMenuItem: {
    backgroundColor: '#E8F8F5',
    borderWidth: 1,
    borderColor: '#00B894',
  },
  servicioMenuItemText: {
    color: '#00B894',
    fontWeight: '500',
  },
  cajaMenuItem: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  cajaMenuItemText: {
    color: '#F39C12',
    fontWeight: '500',
  },
  reporteMenuItem: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  reporteMenuItemText: {
    color: '#9C27B0',
    fontWeight: '500',
  },
  bodegaMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  bodegaMenuItemText: {
    color: '#0984E3',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 10,
  },
  logoutText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footerSpacer: {
    height: 20,
  },
});

export default MenuPrincipal;