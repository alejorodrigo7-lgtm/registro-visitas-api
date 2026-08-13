import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
// ✅ AGREGAR: ThemeProvider
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { setupNotificationListeners } from './src/services/notificationService';
import { initDatabase } from './src/services/database';
import { iniciarSincronizacionAutomatica, detenerSincronizacionAutomatica } from './src/services/syncService';
// ✅ AGREGADO: Servicio de ubicación en tiempo real
import { iniciarSeguimientoUbicacion, detenerSeguimientoUbicacion } from './src/services/ubicacionService';
// ✅ AGREGADO: Sistema de actualizaciones OTA
import { checkUpdateOnStart } from './src/services/updateService';
import ScreenCaptureBlocker from './src/components/ScreenCaptureBlocker';

// Pantallas principales
import RoleSelection from './src/screens/RoleSelection';
import Login from './src/screens/Login';
import MenuPrincipal from './src/screens/MenuPrincipal';
import RegistroVisita from './src/screens/RegistroVisita';
import GestionUsuarios from './src/screens/GestionUsuarios';
import GestionHorarios from './src/screens/GestionHorarios';
import Alertas from './src/screens/Alertas';

// ✅ NUEVAS PANTALLAS
import NotificacionesScreen from './src/screens/NotificacionesScreen';
import DashboardScreen from './src/screens/DashboardScreen';

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
// ✅ AGREGAR: BuscarServicio
import BuscarServicio from './src/screens/BuscarServicio';

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

// Mapas
import MapasMenu from './src/screens/MapasMenu';
import MapaAnalisis from './src/screens/MapaAnalisis';
import MapaReal from './src/screens/MapaReal';
import MapaKMZ from './src/screens/MapaKMZ';

// Monserrath
import MonserrathScreen from './src/screens/MonserrathScreen';
import ReporteMonserrath from './src/screens/ReporteMonserrath';

// Asistencia
import AsistenciaScreen from './src/screens/AsistenciaScreen';
import PedirAusenciaScreen from './src/screens/PedirAusenciaScreen';
import GestionAusencias from './src/screens/GestionAusencias';
import ReporteAsistencia from './src/screens/ReporteAsistencia';
import ReporteAusencias from './src/screens/ReporteAusencias';

// ✅ Usuarios - CAMBIADO DE CrearUsuario a CrearCliente
import CrearCliente from './src/screens/CrearCliente';
import CambiarContraseña from './src/screens/CambiarContraseña';

// ============================================
// 🔌 DESCONEXIONES/RECONEXIONES
// ============================================
import DesconexionesMenu from './src/screens/DesconexionesMenu';
import RegistrarDesconexion from './src/screens/RegistrarDesconexion';
import RegistrarReconexion from './src/screens/RegistrarReconexion';
// ✅ CORREGIDO: Ejecucion en lugar de EjecucionDesconexiones
import Ejecucion from './src/screens/Ejecucion';
// ✅ CORREGIDO: BuscarDesRec en lugar de BuscarDesconexiones
import BuscarDesRec from './src/screens/BuscarDesRec';

// ✅ NUEVAS PANTALLAS - SOLICITAR RECIBO
import SolicitarReciboMenu from './src/screens/SolicitarReciboMenu';
import SolicitarRecibo from './src/screens/SolicitarRecibo';
import SubirRecibo from './src/screens/SubirRecibo';
import DescargarRecibo from './src/screens/DescargarRecibo';

const Stack = createStackNavigator();

// ============================================
// 🎨 NAVEGADOR CON TEMA
// ============================================
const ThemedNavigation = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <NavigationContainer
      theme={{
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
        dark: theme.isDark,
      }}
    >
      <Stack.Navigator
        initialRouteName="RoleSelection"
        screenOptions={{
          headerStyle: { backgroundColor: '#6C5CE7' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerTitle: 'RA²P',
        }}
      >
        <Stack.Screen name="RoleSelection" component={RoleSelection} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="MenuPrincipal" component={MenuPrincipal} options={{ title: 'RA²P', headerLeft: null }} />
        
        {/* ✅ NUEVAS PANTALLAS */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: '📊 Dashboard' }} />
        <Stack.Screen name="Notificaciones" component={NotificacionesScreen} options={{ title: '🔔 Notificaciones' }} />
        
        <Stack.Screen name="RegistroVisita" component={RegistroVisita} options={{ title: 'Registrar Visita' }} />
        <Stack.Screen name="GestionUsuarios" component={GestionUsuarios} options={{ title: 'Gestión de Usuarios' }} />
        <Stack.Screen name="GestionHorarios" component={GestionHorarios} options={{ title: 'Horarios' }} />
        <Stack.Screen name="Alertas" component={Alertas} options={{ title: 'Alertas' }} />

        <Stack.Screen name="TransferenciasMenu" component={TransferenciasMenu} options={{ title: 'Transferencias' }} />
        <Stack.Screen name="SubirTransferencia" component={SubirTransferencia} options={{ title: 'Subir Transferencia' }} />
        <Stack.Screen name="ConfirmacionTransferencias" component={ConfirmacionTransferencias} options={{ title: 'Confirmación' }} />
        <Stack.Screen name="IngresoTransferencias" component={IngresoTransferencias} options={{ title: 'Ingreso Transferencias' }} />
        <Stack.Screen name="RevisionTransferencias" component={RevisionTransferencias} options={{ title: 'Revisar Transferencias' }} />

        <Stack.Screen name="ServiciosMenu" component={ServiciosMenu} options={{ title: 'Servicios' }} />
        <Stack.Screen name="TomarServicio" component={TomarServicio} options={{ title: 'Tomar Servicio' }} />
        <Stack.Screen name="EjecucionServicio" component={EjecucionServicio} options={{ title: 'Ejecución' }} />
        <Stack.Screen name="RetroalimentacionServicio" component={RetroalimentacionServicio} options={{ title: 'Retroalimentación' }} />
        <Stack.Screen name="RevisionServicios" component={RevisionServicios} options={{ title: 'Revisar Servicios' }} />
        {/* ✅ BuscarServicio */}
        <Stack.Screen name="BuscarServicio" component={BuscarServicio} options={{ title: '🔍 Buscar Servicio' }} />

        <Stack.Screen name="CajasMenu" component={CajasMenu} options={{ title: 'Cajas' }} />
        <Stack.Screen name="IngresoCaja" component={IngresoCaja} options={{ title: 'Ingreso de Caja' }} />
        <Stack.Screen name="SaldosDisponibles" component={SaldosDisponibles} options={{ title: 'Saldos' }} />
        <Stack.Screen name="DetalleSaldo" component={DetalleSaldo} options={{ title: 'Detalle Saldo' }} />
        <Stack.Screen name="EdicionCajas" component={EdicionCajas} options={{ title: 'Edición Cajas' }} />
        <Stack.Screen name="DepositosMenu" component={DepositosMenu} options={{ title: 'Depósitos' }} />
        <Stack.Screen name="SubirDeposito" component={SubirDeposito} options={{ title: 'Subir Depósito' }} />
        <Stack.Screen name="RevisarDepositos" component={RevisarDepositos} options={{ title: 'Revisar Depósitos' }} />

        <Stack.Screen name="Reportes" component={Reportes} options={{ title: 'Reportes' }} />

        <Stack.Screen name="BodegaMenu" component={BodegaMenu} options={{ title: 'Bodegas' }} />
        <Stack.Screen name="CrearBodega" component={CrearBodega} options={{ title: 'Crear Bodega' }} />
        <Stack.Screen name="AsignarMaterial" component={AsignarMaterial} options={{ title: 'Asignar Material' }} />
        <Stack.Screen name="RevisionBodegas" component={RevisionBodegas} options={{ title: 'Revisar Bodegas' }} />

        <Stack.Screen name="MapasMenu" component={MapasMenu} options={{ title: 'Mapas' }} />
        <Stack.Screen name="MapaAnalisis" component={MapaAnalisis} options={{ title: 'Mapa Análisis' }} />
        <Stack.Screen name="MapaReal" component={MapaReal} options={{ title: 'Mapa Real' }} />
        <Stack.Screen name="MapaKMZ" component={MapaKMZ} options={{ title: 'KMZ' }} />

        <Stack.Screen name="MonserrathScreen" component={MonserrathScreen} options={{ title: 'Monserrath' }} />
        <Stack.Screen name="ReporteMonserrath" component={ReporteMonserrath} options={{ title: 'Reporte Monserrath' }} />
        
        <Stack.Screen name="AsistenciaScreen" component={AsistenciaScreen} options={{ title: 'Asistencia' }} />
        <Stack.Screen name="PedirAusenciaScreen" component={PedirAusenciaScreen} options={{ title: 'Pedir Ausencia' }} />
        <Stack.Screen name="GestionAusencias" component={GestionAusencias} options={{ title: 'Gestionar Ausencias' }} />
        <Stack.Screen name="ReporteAsistencia" component={ReporteAsistencia} options={{ title: 'Reporte Asistencia' }} />
        <Stack.Screen name="ReporteAusencias" component={ReporteAusencias} options={{ title: 'Reporte Ausencias' }} />

        {/* ✅ CORREGIDO: UsuarioNuevoScreen */}
        <Stack.Screen name="UsuarioNuevoScreen" component={CrearCliente} options={{ title: 'Crear Usuario' }} />
        <Stack.Screen name="CambiarContraseña" component={CambiarContraseña} options={{ title: 'Cambiar Contraseña' }} />

        {/* ============================================
            🔌 DESCONEXIONES/RECONEXIONES (CORREGIDO)
            ============================================ */}
        <Stack.Screen name="DesconexionesMenu" component={DesconexionesMenu} options={{ title: '🔌 Desconexiones/Reconexiones' }} />
        <Stack.Screen name="RegistrarDesconexion" component={RegistrarDesconexion} options={{ title: '1️⃣ Registrar Desconexión' }} />
        <Stack.Screen name="RegistrarReconexion" component={RegistrarReconexion} options={{ title: '2️⃣ Registrar Reconexión' }} />
        {/* ✅ CORREGIDO: Ejecucion */}
        <Stack.Screen name="Ejecucion" component={Ejecucion} options={{ title: '3️⃣ Ejecución' }} />
        {/* ✅ CORREGIDO: BuscarDesRec */}
        <Stack.Screen name="BuscarDesRec" component={BuscarDesRec} options={{ title: '4️⃣ Buscar Des/Rec' }} />
       // ✅ NUEVAS PANTALLAS - SOLICITAR RECIBO
        <Stack.Screen name="SolicitarReciboMenu" component={SolicitarReciboMenu} />
        <Stack.Screen name="SolicitarRecibo" component={SolicitarRecibo} />
        <Stack.Screen name="SubirRecibo" component={SubirRecibo} />
        <Stack.Screen name="DescargarRecibo" component={DescargarRecibo} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ============================================
// 🚀 INICIALIZADOR DE APP CON SINCRONIZACIÓN Y UBICACIÓN
// ============================================
const AppInitializer = ({ children }) => {
  const { user } = useAuth();
  const syncUnsubscribeRef = useRef(null);

  useEffect(() => {
    const inicializarApp = async () => {
      try {
        await initDatabase();
        console.log('✅ Base de datos local inicializada');
        
        if (user) {
          console.log('👤 Usuario autenticado:', user.email);
          
          // 🔄 Sincronización automática
          console.log('🔄 Iniciando sincronización automática...');
          syncUnsubscribeRef.current = await iniciarSincronizacionAutomatica((result) => {
            if (result.sincronizados > 0) {
              console.log(`✅ ${result.sincronizados} elementos sincronizados`);
            }
          });
          
          // 📍 Iniciar ubicación en tiempo real
          console.log('📍 Iniciando ubicación en tiempo real...');
          await iniciarSeguimientoUbicacion();
        }
      } catch (error) {
        console.error('❌ Error al inicializar app:', error);
      }
    };
    
    inicializarApp();
    
    return () => {
      if (syncUnsubscribeRef.current) {
        syncUnsubscribeRef.current();
      }
      detenerSincronizacionAutomatica();
      // ✅ Detener ubicación al cerrar
      detenerSeguimientoUbicacion();
    };
  }, [user]);

  return children;
};

// ============================================
// 🏠 APP PRINCIPAL
// ============================================
export default function App() {
  useEffect(() => {
    // Notificaciones
    const { subscription, responseSubscription } = setupNotificationListeners();
    
    // ✅ Verificar actualizaciones OTA al iniciar
    checkUpdateOnStart();
    
    return () => {
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>  {/* ✅ ThemeProvider DENTRO de AuthProvider */}
        <StatusBar style="auto" />
        <AppInitializer>
          <ScreenCaptureBlocker>
            <ThemedNavigation />
          </ScreenCaptureBlocker>
        </AppInitializer>
      </ThemeProvider>
    </AuthProvider>
  );
}