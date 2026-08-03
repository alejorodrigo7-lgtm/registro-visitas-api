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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================
// 📱 TABS PRINCIPALES
// ============================================
const MainTabs = () => {
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
      <Tab.Screen name="Inicio" component={MenuPrincipal} />
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
      
    </Stack.Navigator>
  );
};

export default AppNavigator;