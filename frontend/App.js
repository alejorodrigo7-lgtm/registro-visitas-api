import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { setupNotificationListeners } from './src/services/notificationService';

// Pantallas principales
import RoleSelection from './src/screens/RoleSelection';
import Login from './src/screens/Login';
import MenuPrincipal from './src/screens/MenuPrincipal';
import RegistroVisita from './src/screens/RegistroVisita';
import GestionUsuarios from './src/screens/GestionUsuarios';
import GestionHorarios from './src/screens/GestionHorarios';
import Alertas from './src/screens/Alertas';

// Transferencias
import TransferenciasMenu from './src/screens/TransferenciasMenu';
import SubirTransferencia from './src/screens/SubirTransferencia';
import ConfirmacionTransferencias from './src/screens/ConfirmacionTransferencias';
import IngresoTransferencias from './src/screens/IngresoTransferencias';
import RevisionTransferencias from './src/screens/RevisionTransferencias';

// Servicios
import ServiciosMenu from './src/screens/ServiciosMenu';
import TomarServicio from './src/screens/TomarServicio';
import EjecucionServicio from './src/screens/EjecucionServicio';
import RetroalimentacionServicio from './src/screens/RetroalimentacionServicio';
import RevisionServicios from './src/screens/RevisionServicios';

// Cajas
import CajasMenu from './src/screens/CajasMenu';
import IngresoCaja from './src/screens/IngresoCaja';
import SaldosDisponibles from './src/screens/SaldosDisponibles';
import DetalleSaldo from './src/screens/DetalleSaldo';
import EdicionCajas from './src/screens/EdicionCajas';
import DepositosMenu from './src/screens/DepositosMenu';
import SubirDeposito from './src/screens/SubirDeposito';
import RevisarDepositos from './src/screens/RevisarDepositos';

// Reportes
import Reportes from './src/screens/Reportes';

// Bodegas
import BodegaMenu from './src/screens/BodegaMenu';
import CrearBodega from './src/screens/CrearBodega';
import AsignarMaterial from './src/screens/AsignarMaterial';
import RevisionBodegas from './src/screens/RevisionBodegas';

import MapasMenu from './src/screens/MapasMenu';
import MapaAnalisis from './src/screens/MapaAnalisis';
import MapaReal from './src/screens/MapaReal';
import MapaKMZ from './src/screens/MapaKMZ';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    const { subscription, responseSubscription } = setupNotificationListeners();
    return () => {
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="RoleSelection"
          screenOptions={{
            headerStyle: { backgroundColor: '#6C5CE7' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {/* Pantallas principales */}
          <Stack.Screen name="RoleSelection" component={RoleSelection} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="MenuPrincipal" component={MenuPrincipal} options={{ title: 'Menú Principal', headerLeft: null }} />
          <Stack.Screen name="RegistroVisita" component={RegistroVisita} options={{ title: 'Registrar Visita' }} />
          <Stack.Screen name="GestionUsuarios" component={GestionUsuarios} options={{ title: 'Gestión de Usuarios' }} />
          <Stack.Screen name="GestionHorarios" component={GestionHorarios} options={{ title: 'Horarios' }} />
          <Stack.Screen name="Alertas" component={Alertas} options={{ title: 'Alertas' }} />

          {/* Transferencias */}
          <Stack.Screen name="TransferenciasMenu" component={TransferenciasMenu} options={{ title: 'Transferencias' }} />
          <Stack.Screen name="SubirTransferencia" component={SubirTransferencia} options={{ title: 'Subir Transferencia' }} />
          <Stack.Screen name="ConfirmacionTransferencias" component={ConfirmacionTransferencias} options={{ title: 'Confirmación' }} />
          <Stack.Screen name="IngresoTransferencias" component={IngresoTransferencias} options={{ title: 'Ingreso Transferencias' }} />
          <Stack.Screen name="RevisionTransferencias" component={RevisionTransferencias} options={{ title: 'Revisar Transferencias' }} />

          {/* Servicios */}
          <Stack.Screen name="ServiciosMenu" component={ServiciosMenu} options={{ title: 'Servicios' }} />
          <Stack.Screen name="TomarServicio" component={TomarServicio} options={{ title: 'Tomar Servicio' }} />
          <Stack.Screen name="EjecucionServicio" component={EjecucionServicio} options={{ title: 'Ejecución' }} />
          <Stack.Screen name="RetroalimentacionServicio" component={RetroalimentacionServicio} options={{ title: 'Retroalimentación' }} />
          <Stack.Screen name="RevisionServicios" component={RevisionServicios} options={{ title: 'Revisar Servicios' }} />

          {/* Cajas */}
          <Stack.Screen name="CajasMenu" component={CajasMenu} options={{ title: 'Cajas' }} />
          <Stack.Screen name="IngresoCaja" component={IngresoCaja} options={{ title: 'Ingreso de Caja' }} />
          <Stack.Screen name="SaldosDisponibles" component={SaldosDisponibles} options={{ title: 'Saldos' }} />
          <Stack.Screen name="DetalleSaldo" component={DetalleSaldo} options={{ title: 'Detalle Saldo' }} />
          <Stack.Screen name="EdicionCajas" component={EdicionCajas} options={{ title: 'Edición Cajas' }} />
          <Stack.Screen name="DepositosMenu" component={DepositosMenu} options={{ title: 'Depósitos' }} />
          <Stack.Screen name="SubirDeposito" component={SubirDeposito} options={{ title: 'Subir Depósito' }} />
          <Stack.Screen name="RevisarDepositos" component={RevisarDepositos} options={{ title: 'Revisar Depósitos' }} />

          {/* Reportes */}
          <Stack.Screen name="Reportes" component={Reportes} options={{ title: 'Reportes' }} />

          {/* Bodegas */}
          <Stack.Screen name="BodegaMenu" component={BodegaMenu} options={{ title: 'Bodegas' }} />
          <Stack.Screen name="CrearBodega" component={CrearBodega} options={{ title: 'Crear Bodega' }} />
          <Stack.Screen name="AsignarMaterial" component={AsignarMaterial} options={{ title: 'Asignar Material' }} />
          <Stack.Screen name="RevisionBodegas" component={RevisionBodegas} options={{ title: 'Revisar Bodegas' }} />
          // Agregar al Stack.Navigator:
          <Stack.Screen name="MapasMenu" component={MapasMenu} options={{ title: 'Mapas' }} />
          <Stack.Screen name="MapaAnalisis" component={MapaAnalisis} options={{ title: 'Mapa Análisis' }} />
          <Stack.Screen name="MapaReal" component={MapaReal} options={{ title: 'Mapa Real' }} />
          <Stack.Screen name="MapaKMZ" component={MapaKMZ} options={{ title: 'KMZ' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}