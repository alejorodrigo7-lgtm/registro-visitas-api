import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Pantallas existentes
import LoginScreen from '../screens/Login';
import RoleSelection from '../screens/RoleSelection';
import MenuPrincipal from '../screens/MenuPrincipal';
import RegistroVisita from '../screens/RegistroVisita';
import AsistenciaScreen from '../screens/AsistenciaScreen';
import PedirAusenciaScreen from '../screens/PedirAusenciaScreen';
import GestionAusencias from '../screens/GestionAusencias';
import GestionUsuarios from '../screens/GestionUsuarios';
import Reportes from '../screens/Reportes';
import CambiarContraseña from '../screens/CambiarContraseña';
import TransferenciasMenu from '../screens/TransferenciasMenu';
import ServiciosMenu from '../screens/ServiciosMenu';
import CajasMenu from '../screens/CajasMenu';
import BodegaMenu from '../screens/BodegaMenu';
import MapasMenu from '../screens/MapasMenu';
import GestionHorarios from '../screens/GestionHorarios';
import UsuarioNuevoScreen from '../screens/UsuarioNuevoScreen';
import Alertas from '../screens/Alertas';

// ✅ NUEVAS PANTALLAS
import NotificacionesScreen from '../screens/NotificacionesScreen';
import DashboardScreen from '../screens/DashboardScreen';

// ✅ AGREGAR EJECUCION SERVICIO
import EjecucionServicio from '../screens/EjecucionServicio';

// ============================================
// 📱 IMPORTAR PANTALLAS DEL MÓDULO VENTAS
// ============================================
import VentasMenu from '../screens/VentasMenu';
import VentaNueva from '../screens/VentaNueva';
import IngresoVenta from '../screens/IngresoVenta';
import ReporteVenta from '../screens/ReporteVenta';
import PagoVenta from '../screens/PagoVenta';
import BuscarVentasPagadas from '../screens/BuscarVentasPagadas';

// ============================================
// 📱 IMPORTAR PANTALLAS DE RECUPERACIÓN DE EQUIPOS
// ============================================
import RecuperacionMenu from '../screens/RecuperacionMenu';
import SubirOrden from '../screens/SubirOrden';
import EjecutarOrden from '../screens/EjecutarOrden';
import PendientesRetirar from '../screens/PendientesRetirar';
import Retirados from '../screens/Retirados';
import RevisarOrdenes from '../screens/RevisarOrdenes';

// ============================================
// 📱 IMPORTAR PANTALLAS DE DESCONEXIONES
// ============================================
import DesconexionesMenu from '../screens/DesconexionesMenu';
import RegistrarDesconexion from '../screens/RegistrarDesconexion';
import RegistrarReconexion from '../screens/RegistrarReconexion';
import Ejecucion from '../screens/Ejecucion';
import BuscarDesRec from '../screens/BuscarDesRec';

// ============================================
// 📱 IMPORTAR PANTALLAS DE SOLICITAR RECIBO
// ============================================
import SolicitarReciboMenu from '../screens/SolicitarReciboMenu';
import SolicitarRecibo from '../screens/SolicitarRecibo';
import SubirRecibo from '../screens/SubirRecibo';
import DescargarRecibo from '../screens/DescargarRecibo';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// 📱 TABS PRINCIPALES - CON NAVEGACIÓN CORRECTA
// ============================================
const MainTabs = ({ navigation }) => {
  console.log('🔍 [MAINTABS] MainTabs recibió navigation:', navigation ? 'SI' : 'NO');
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Notificaciones') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {/* ✅ CORRECTO: Pasar navigation del Stack a MenuPrincipal */}
      <Tab.Screen name="Inicio">
        {() => {
          console.log('🔍 [MAINTABS] Renderizando MenuPrincipal con navigation del Stack');
          return <MenuPrincipal navigation={navigation} />;
        }}
      </Tab.Screen>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Notificaciones" component={NotificacionesScreen} />
      <Tab.Screen name="Perfil" component={RoleSelection} />
    </Tab.Navigator>
  );
};

// ============================================
// 📱 NAVEGADOR PRINCIPAL
// ============================================
const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelection} />
      <Stack.Screen name="Main" component={MainTabs} />
      
      {/* Pantallas adicionales */}
      <Stack.Screen 
        name="RegistroVisita" 
        component={RegistroVisita}
        options={{ headerShown: true, title: 'Registrar Visita' }}
      />
      <Stack.Screen 
        name="Asistencia" 
        component={AsistenciaScreen}
        options={{ headerShown: true, title: 'Asistencia' }}
      />
      <Stack.Screen 
        name="PedirAusencia" 
        component={PedirAusenciaScreen}
        options={{ headerShown: true, title: 'Pedir Ausencia' }}
      />
      <Stack.Screen 
        name="GestionAusencias" 
        component={GestionAusencias}
        options={{ headerShown: true, title: 'Gestionar Ausencias' }}
      />
      <Stack.Screen 
        name="GestionUsuarios" 
        component={GestionUsuarios}
        options={{ headerShown: true, title: 'Gestionar Usuarios' }}
      />
      <Stack.Screen 
        name="Reportes" 
        component={Reportes}
        options={{ headerShown: true, title: 'Reportes' }}
      />
      <Stack.Screen 
        name="CambiarContraseña" 
        component={CambiarContraseña}
        options={{ headerShown: true, title: 'Cambiar Contraseña' }}
      />
      <Stack.Screen 
        name="TransferenciasMenu" 
        component={TransferenciasMenu}
        options={{ headerShown: true, title: 'Transferencias' }}
      />
      <Stack.Screen 
        name="ServiciosMenu" 
        component={ServiciosMenu}
        options={{ headerShown: true, title: 'Servicios' }}
      />
      <Stack.Screen 
        name="CajasMenu" 
        component={CajasMenu}
        options={{ headerShown: true, title: 'Cajas' }}
      />
      <Stack.Screen 
        name="BodegaMenu" 
        component={BodegaMenu}
        options={{ headerShown: true, title: 'Bodegas' }}
      />
      <Stack.Screen 
        name="MapasMenu" 
        component={MapasMenu}
        options={{ headerShown: true, title: 'Mapas' }}
      />
      <Stack.Screen 
        name="GestionHorarios" 
        component={GestionHorarios}
        options={{ headerShown: true, title: 'Horarios' }}
      />
      <Stack.Screen 
        name="UsuarioNuevoScreen" 
        component={UsuarioNuevoScreen}
        options={{ headerShown: true, title: 'Usuario Nuevo' }}
      />
      <Stack.Screen 
        name="Alertas" 
        component={Alertas}
        options={{ headerShown: true, title: 'Alertas' }}
      />
      <Stack.Screen 
        name="Notificaciones" 
        component={NotificacionesScreen}
        options={{ headerShown: true, title: 'Notificaciones' }}
      />
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ headerShown: true, title: 'Dashboard' }}
      />
      
      {/* ✅ AGREGAR EJECUCION SERVICIO */}
      <Stack.Screen 
        name="EjecucionServicio" 
        component={EjecucionServicio}
        options={{ headerShown: true, title: '⚙️ Ejecutar Servicio' }}
      />

      {/* ============================================
          📱 MÓDULO DESCONEXIONES
          ============================================ */}
      <Stack.Screen 
        name="DesconexionesMenu" 
        component={DesconexionesMenu}
        options={{ headerShown: true, title: '🔌 Desconexiones' }}
      />
      <Stack.Screen 
        name="RegistrarDesconexion" 
        component={RegistrarDesconexion}
        options={{ headerShown: true, title: 'Registrar Desconexión' }}
      />
      <Stack.Screen 
        name="RegistrarReconexion" 
        component={RegistrarReconexion}
        options={{ headerShown: true, title: 'Registrar Reconexión' }}
      />
      <Stack.Screen 
        name="Ejecucion" 
        component={Ejecucion}
        options={{ headerShown: true, title: 'Ejecutar Solicitudes' }}
      />
      <Stack.Screen 
        name="BuscarDesRec" 
        component={BuscarDesRec}
        options={{ headerShown: true, title: 'Buscar Des/Rec' }}
      />

      {/* ============================================
          📱 MÓDULO SOLICITAR RECIBO
          ============================================ */}
      <Stack.Screen 
        name="SolicitarReciboMenu" 
        component={SolicitarReciboMenu}
        options={{ headerShown: true, title: '📄 Solicitar Recibo' }}
      />
      <Stack.Screen 
        name="SolicitarRecibo" 
        component={SolicitarRecibo}
        options={{ headerShown: true, title: 'Solicitar Recibo' }}
      />
      <Stack.Screen 
        name="SubirRecibo" 
        component={SubirRecibo}
        options={{ headerShown: true, title: 'Subir Recibo' }}
      />
      <Stack.Screen 
        name="DescargarRecibo" 
        component={DescargarRecibo}
        options={{ headerShown: true, title: 'Descargar Recibo' }}
      />

      {/* ============================================
          📱 MÓDULO RECUPERACIÓN DE EQUIPOS
          ============================================ */}
      <Stack.Screen 
        name="RecuperacionMenu" 
        component={RecuperacionMenu}
        options={{ headerShown: true, title: '📦 Recuperación de Equipos' }}
      />
      <Stack.Screen 
        name="SubirOrden" 
        component={SubirOrden}
        options={{ headerShown: true, title: 'Subir Orden' }}
      />
      <Stack.Screen 
        name="EjecutarOrden" 
        component={EjecutarOrden}
        options={{ headerShown: true, title: 'Ejecutar Visita' }}
      />
      <Stack.Screen 
        name="PendientesRetirar" 
        component={PendientesRetirar}
        options={{ headerShown: true, title: 'Pendientes por Retirar' }}
      />
      <Stack.Screen 
        name="Retirados" 
        component={Retirados}
        options={{ headerShown: true, title: 'Equipos Retirados' }}
      />
      <Stack.Screen 
        name="RevisarOrdenes" 
        component={RevisarOrdenes}
        options={{ headerShown: true, title: 'Revisar Órdenes' }}
      />

      {/* ============================================
          📱 MÓDULO VENTAS
          ============================================ */}
      <Stack.Screen 
        name="VentasMenu" 
        component={VentasMenu}
        options={{ headerShown: true, title: '💰 Ventas' }}
      />
      <Stack.Screen 
        name="VentaNueva" 
        component={VentaNueva}
        options={{ headerShown: true, title: '📝 Venta Nueva' }}
      />
      <Stack.Screen 
        name="IngresoVenta" 
        component={IngresoVenta}
        options={{ headerShown: true, title: '✅ Ingreso de Venta' }}
      />
      <Stack.Screen 
        name="ReporteVenta" 
        component={ReporteVenta}
        options={{ headerShown: true, title: '📊 Reporte de Venta' }}
      />
      <Stack.Screen 
        name="PagoVenta" 
        component={PagoVenta}
        options={{ headerShown: true, title: '💳 Pago de Venta' }}
      />
      <Stack.Screen 
        name="BuscarVentasPagadas" 
        component={BuscarVentasPagadas}
        options={{ headerShown: true, title: '🔍 Ventas Pagadas' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;