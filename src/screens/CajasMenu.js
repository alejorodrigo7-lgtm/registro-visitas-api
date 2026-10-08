import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CajasMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Admin';
  const isJefeOrAdmin = ['Jefe', 'Admin'].includes(user?.rol);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Cajas</Text>
        <Text style={styles.subtitle}>Selecciona una opción</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {/* Ingreso de Caja - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('IngresoCaja')}
          >
            <View style={[styles.iconContainer, styles.iconIngreso]}>
              <Icon name="payment" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>📥 Ingreso de Caja</Text>
              <Text style={styles.menuDescription}>Registrar caja del día</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Saldos Disponibles - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SaldosDisponibles')}
          >
            <View style={[styles.iconContainer, styles.iconSaldos]}>
              <Icon name="account-balance-wallet" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>📊 Saldos Disponibles</Text>
              <Text style={styles.menuDescription}>Ver saldos por zona</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Cuadre de Caja - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemCuadre]}
            onPress={() => navigation.navigate('CuadreCajas')}
          >
            <View style={[styles.iconContainer, styles.iconCuadre]}>
              <Icon name="calculate" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>📊 Cuadre de Caja</Text>
              <Text style={styles.menuDescription}>
                Gestiona ingresos, pagos y saldo por zona (TOLA, CHILIBULO, MAGDALENA)
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Ingreso Oficina Tola - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('IngresoOficinaTola')}
          >
            <View style={[styles.iconContainer, styles.iconTola]}>
              <Icon name="business" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ingreso Oficina Tola</Text>
              <Text style={styles.menuDescription}>Registrar ingreso de Oficina Tola</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Ingreso Otras Oficinas - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('IngresoOtrasOficinas')}
          >
            <View style={[styles.iconContainer, styles.iconOtras]}>
              <Icon name="store" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ingreso Otras Oficinas</Text>
              <Text style={styles.menuDescription}>Registrar ingreso de otras oficinas</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Revision Ingresos - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemRevision]}
            onPress={() => navigation.navigate('RevisionIngresosOficinas')}
          >
            <View style={[styles.iconContainer, styles.iconRevision]}>
              <Icon name="assessment" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Revision Ingresos</Text>
              <Text style={styles.menuDescription}>Revisar ingresos por rango de fechas</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Ingreso Mensual - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemIngresoMensual]}
            onPress={() => navigation.navigate('IngresoMensual')}
          >
            <View style={[styles.iconContainer, styles.iconIngresoMensual]}>
              <Icon name="summarize" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ingreso Mensual</Text>
              <Text style={styles.menuDescription}>Consolidado mensual por zona/sector</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Edición de Cajas - Solo Admin */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('EdicionCajas')}
          >
            <View style={[styles.iconContainer, styles.iconEdicion]}>
              <Icon name="edit" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>✏️ Edición de Cajas</Text>
              <Text style={styles.menuDescription}>Editar cajas existentes</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* Depósitos - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('DepositosMenu')}
          >
            <View style={[styles.iconContainer, styles.iconDepositos]}>
              <Icon name="savings" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>🏦 Depósitos</Text>
              <Text style={styles.menuDescription}>Subir y revisar depósitos</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#B2BEC3" />
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
    backgroundColor: '#FDCB6E',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 16,
    color: '#2D3436',
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemCuadre: {
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconIngreso: {
    backgroundColor: '#00B894',
  },
  iconSaldos: {
    backgroundColor: '#0984E3',
  },
  iconCuadre: {
    backgroundColor: '#6C5CE7',
  },
  iconEdicion: {
    backgroundColor: '#E17055',
  },
  iconDepositos: {
    backgroundColor: '#FDCB6E',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  menuDescription: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  iconTola: {
    backgroundColor: '#00B894',
  },
  iconOtras: {
    backgroundColor: '#0984E3',
  },
  iconRevision: {
    backgroundColor: '#6C5CE7',
  },
  menuItemRevision: {
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  adminMenuItem: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  menuItemIngresoMensual: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  iconIngresoMensual: {
    backgroundColor: '#6C5CE7',
  },
});

export default CajasMenu;