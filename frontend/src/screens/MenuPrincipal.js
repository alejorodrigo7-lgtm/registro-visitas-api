import React, { useEffect, useState } from 'react';
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
import { 
  contarPendientes, 
  sincronizarClientes,
  getClientesCache 
} from '../services/database';
import { verificarEstadoSincronizacion } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';

const MenuPrincipal = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [pendientes, setPendientes] = useState({ total: 0 });
  const [conectado, setConectado] = useState(true);
  const [clientesCargados, setClientesCargados] = useState(false);

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

  // ============================================
  // 📋 CARGAR CLIENTES EN CACHÉ AL INICIAR
  // ============================================
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const netInfo = await NetInfo.fetch();
        setConectado(netInfo.isConnected);
        
        if (netInfo.isConnected) {
          console.log('🔄 Sincronizando clientes en caché...');
          const result = await sincronizarClientes();
          if (result.success) {
            console.log(`✅ ${result.count} clientes sincronizados en caché`);
          }
        } else {
          const clientes = await getClientesCache();
          console.log(`📋 ${clientes.length} clientes en caché local`);
        }
        setClientesCargados(true);
      } catch (error) {
        console.error('❌ Error cargando clientes:', error);
      }
    };
    
    cargarClientes();
  }, []);

  // ============================================
  // 📊 ACTUALIZAR PENDIENTES
  // ============================================
  useEffect(() => {
    const actualizarPendientes = async () => {
      try {
        const estado = await verificarEstadoSincronizacion();
        setConectado(estado.conectado);
        setPendientes(estado.detalles || { total: 0 });
      } catch (error) {
        console.log('⚠️ Error al obtener pendientes:', error);
      }
    };
    
    actualizarPendientes();
    
    const interval = setInterval(actualizarPendientes, 30000);
    return () => clearInterval(interval);
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
        <Text style={styles.appName}>RA²P</Text>
        <Text style={styles.welcomeText}>Bienvenido,</Text>
        <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
        <Text style={styles.userRole}>{user?.rol || ''}</Text>
        
        {/* Estado de sincronización */}
        <View style={styles.syncStatus}>
          <Text style={styles.syncStatusText}>
            {conectado ? '🟢 Conectado' : '🔴 Sin conexión'}
          </Text>
          {pendientes.total > 0 && (
            <View style={styles.pendientesBadge}>
              <Text style={styles.pendientesBadgeText}>
                📤 {pendientes.total} pendiente{pendientes.total > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {clientesCargados && (
            <Text style={styles.syncStatusText}>
              📋 Clientes listos
            </Text>
          )}
        </View>

        {/* Autoría */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 RA²P - Todos los derechos reservados</Text>
          <Text style={styles.footerSubText}>Desarrollado por: Rodrigo Alejo</Text>
        </View>
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
          {pendientes.visitas > 0 && (
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>{pendientes.visitas}</Text>
            </View>
          )}
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
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('GestionHorarios')}
          >
            <Text style={[styles.menuItemText, styles.adminMenuItemText]}>
              📋 Gestión de Horarios
            </Text>
            {pendientes.horarios > 0 && (
              <View style={[styles.badgeSmall, styles.badgeWhite]}>
                <Text style={[styles.badgeSmallText, styles.badgeWhiteText]}>{pendientes.horarios}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : isTecnicoOrCoordinador ? (
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
          {pendientes.transferencias > 0 && (
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>{pendientes.transferencias}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Servicios - Todos */}
        <TouchableOpacity
          style={[styles.menuItem, styles.servicioMenuItem]}
          onPress={() => navigation.navigate('ServiciosMenu')}
        >
          <Text style={[styles.menuItemText, styles.servicioMenuItemText]}>
            🛠️ Servicios
          </Text>
          {pendientes.servicios > 0 && (
            <View style={styles.badgeSmall}>
              <Text style={styles.badgeSmallText}>{pendientes.servicios}</Text>
            </View>
          )}
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
            {pendientes.cajas > 0 && (
              <View style={styles.badgeSmall}>
                <Text style={styles.badgeSmallText}>{pendientes.cajas}</Text>
              </View>
            )}
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

        {/* Mapas - Solo Admin y Jefe */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.mapaMenuItem]}
            onPress={() => navigation.navigate('MapasMenu')}
          >
            <Text style={[styles.menuItemText, styles.mapaMenuItemText]}>
              🗺️ Mapas
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
            {pendientes.bodegas > 0 && (
              <View style={styles.badgeSmall}>
                <Text style={styles.badgeSmallText}>{pendientes.bodegas}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Cerrar Sesión - Siempre al final */}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.menuItemText, styles.logoutText]}>🚪 Cerrar Sesión</Text>
        </TouchableOpacity>

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
    paddingBottom: 15,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
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
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  syncStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendientesBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendientesBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    textAlign: 'center',
  },
  footerSubText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  menuScrollView: {
    flex: 1,
  },
  menuContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  mapaMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  mapaMenuItemText: {
    color: '#0984E3',
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
  badgeSmall: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeWhite: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  badgeWhiteText: {
    color: '#FFFFFF',
  },
});

export default MenuPrincipal;