import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { 
  contarPendientes, 
  sincronizarClientes,
  getClientesCache 
} from '../services/database';
import { verificarEstadoSincronizacion } from '../services/syncService';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

const MenuPrincipal = ({ navigation }) => {
  const { user, logout, unreadCount } = useAuth();
  const { theme, themeMode, setTheme } = useTheme();
  const { colors } = theme;
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

  // ============================================
  // 🎨 FUNCIÓN PARA CAMBIAR TEMA (DIRECTO)
  // ============================================
  const toggleTheme = () => {
    if (themeMode === 'light') {
      setTheme('dark');
    } else if (themeMode === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    if (themeMode === 'dark') return 'moon';
    if (themeMode === 'light') return 'sunny';
    return 'phone-portrait';
  };

  const getThemeLabel = () => {
    if (themeMode === 'dark') return 'Oscuro';
    if (themeMode === 'light') return 'Claro';
    return 'Sistema';
  };

  // ============================================
  // 📋 CONFIGURACIÓN DE ÍTEMS DEL MENÚ
  // ============================================
  const menuItems = [
    { 
      id: 'RegistroVisita', 
      label: '📋 Registrar Visita',
      show: true,
      badge: pendientes.visitas,
      style: 'default'
    },
    { 
      id: 'GestionHorarios', 
      label: isAdminOrJefe ? '📋 Gestión de Horarios' : '📋 Mi Horario',
      show: true,
      badge: pendientes.horarios,
      style: isAdminOrJefe ? 'admin' : 'horario'
    },
    { 
      id: 'TransferenciasMenu', 
      label: '💰 Transferencias',
      show: true,
      badge: pendientes.transferencias,
      style: 'transferencia'
    },
    { 
      id: 'ServiciosMenu', 
      label: '🛠️ Servicios',
      show: true,
      badge: pendientes.servicios,
      style: 'servicio'
    },
    { 
      id: 'Dashboard', 
      label: '📊 Dashboard',
      show: isAdminOrJefe,
      style: 'dashboard'
    },
    { 
      id: 'Reportes', 
      label: '📊 Reportes',
      show: isAdminOrJefe,
      style: 'reporte'
    },
    { 
      id: 'CajasMenu', 
      label: '💰 Cajas',
      show: isAdminOrJefe,
      badge: pendientes.cajas,
      style: 'caja'
    },
    { 
      id: 'BodegaMenu', 
      label: '🏪 Bodegas',
      show: isAdminOrJefe,
      badge: pendientes.bodegas,
      style: 'bodega'
    },
    { 
      id: 'MapasMenu', 
      label: '🗺️ Mapas',
      show: isAdminOrJefe,
      style: 'mapa'
    },
    { 
      id: 'UsuarioNuevoScreen', 
      label: '👤 Usuario Nuevo',
      show: isAdminOrJefe,
      style: 'usuario'
    },
    { 
      id: 'CambiarContraseña', 
      label: '🔒 Cambiar Contraseña',
      show: true,
      style: 'password'
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  const getItemStyle = (style) => {
    const stylesMap = {
      default: {
        bg: colors.card,
        border: colors.border,
        text: colors.text,
      },
      admin: {
        bg: colors.primary,
        border: '#5A4BD1',
        text: '#FFFFFF',
      },
      horario: {
        bg: '#E8F0FE',
        border: '#0984E3',
        text: '#0984E3',
      },
      transferencia: {
        bg: '#E8F0FE',
        border: '#0984E3',
        text: '#0984E3',
      },
      servicio: {
        bg: '#E8F8F5',
        border: '#00B894',
        text: '#00B894',
      },
      dashboard: {
        bg: colors.primary,
        border: '#5A4BD1',
        text: '#FFFFFF',
      },
      reporte: {
        bg: '#F3E5F5',
        border: '#9C27B0',
        text: '#9C27B0',
      },
      caja: {
        bg: '#FFF3E0',
        border: '#FDCB6E',
        text: '#F39C12',
      },
      bodega: {
        bg: '#E8F0FE',
        border: '#0984E3',
        text: '#0984E3',
      },
      mapa: {
        bg: '#E8F0FE',
        border: '#0984E3',
        text: '#0984E3',
      },
      usuario: {
        bg: '#F0E6FF',
        border: '#6C5CE7',
        text: '#6C5CE7',
      },
      password: {
        bg: '#E8F0FE',
        border: '#0984E3',
        text: '#0984E3',
      },
    };
    return stylesMap[style] || stylesMap.default;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {/* Fila superior: Tema | Notificaciones */}
        <View style={styles.headerTopRow}>
          {/* Botón Tema - Directo en el header */}
          <TouchableOpacity 
            style={styles.themeButton}
            onPress={toggleTheme}
          >
            <Ionicons name={getThemeIcon()} size={16} color="#FFFFFF" />
            <Text style={styles.themeButtonText}>{getThemeLabel()}</Text>
          </TouchableOpacity>
          
          {/* Notificaciones */}
          <TouchableOpacity
            style={styles.notificationIcon}
            onPress={() => navigation.navigate('Notificaciones')}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* RA²P - Más pequeño */}
        <Text style={styles.appName}>RA²P</Text>
        
        {/* Usuario */}
        <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
        <Text style={styles.userRole}>{user?.rol || ''}</Text>
        
        {/* Estado */}
        <View style={styles.syncStatus}>
          <View style={[styles.statusBadge, { backgroundColor: conectado ? 'rgba(46,204,113,0.3)' : 'rgba(255,107,107,0.3)' }]}>
            <Text style={[styles.statusText, { color: conectado ? '#2ECC71' : '#FF6B6B' }]}>
              {conectado ? '● Conectado' : '● Sin conexión'}
            </Text>
          </View>
          {clientesCargados && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(108,92,231,0.3)' }]}>
              <Text style={[styles.statusText, { color: '#6C5CE7' }]}>📋 Clientes listos</Text>
            </View>
          )}
          {pendientes.total > 0 && (
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,107,107,0.3)' }]}>
              <Text style={[styles.statusText, { color: '#FF6B6B' }]}>
                📤 {pendientes.total} pendiente{pendientes.total > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* MENÚ */}
      <ScrollView
        style={styles.menuScrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.menuContentContainer, { backgroundColor: colors.background }]}
      >
        {visibleItems.map((item) => {
          const style = getItemStyle(item.style);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                { 
                  backgroundColor: style.bg,
                  borderColor: style.border,
                  borderWidth: 1,
                }
              ]}
              onPress={() => navigation.navigate(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <Text style={[styles.menuItemText, { color: style.text }]}>
                  {item.label}
                </Text>
                {item.badge > 0 && (
                  <View style={[styles.badgeSmall, { backgroundColor: style.text }]}>
                    <Text style={[styles.badgeSmallText, { color: style.bg }]}>
                      {item.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons 
                name="chevron-forward-outline" 
                size={20} 
                color={style.text} 
                style={{ opacity: 0.6 }}
              />
            </TouchableOpacity>
          );
        })}

        {/* Cerrar Sesión */}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutButton]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.menuItemLeft}>
            <Text style={[styles.menuItemText, styles.logoutText]}>🚪 Cerrar Sesión</Text>
          </View>
          <Ionicons 
            name="log-out-outline" 
            size={20} 
            color="#FFFFFF" 
            style={{ opacity: 0.6 }}
          />
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 RA²P</Text>
          <Text style={styles.footerSubText}>Desarrollado por Alejandro Abril</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  themeButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  notificationIcon: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 4,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  userRole: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '400',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  syncStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  menuScrollView: {
    flex: 1,
  },
  menuContentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    marginTop: 6,
    borderWidth: 0,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '400',
    letterSpacing: 1,
  },
  footerSubText: {
    fontSize: 10,
    color: '#B2BEC3',
    marginTop: 2,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});

export default MenuPrincipal;