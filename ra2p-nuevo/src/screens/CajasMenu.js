import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

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
            <Text style={styles.menuIcon}>📥</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ingreso de Caja</Text>
              <Text style={styles.menuDescription}>Registrar caja del día</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Saldos Disponibles - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('SaldosDisponibles')}
          >
            <Text style={styles.menuIcon}>📊</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Saldos Disponibles</Text>
              <Text style={styles.menuDescription}>Ver saldos por zona</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Edición de Cajas - Solo Admin */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, styles.adminMenuItem]}
            onPress={() => navigation.navigate('EdicionCajas')}
          >
            <Text style={styles.menuIcon}>✏️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Edición de Cajas</Text>
              <Text style={styles.menuDescription}>Editar cajas existentes</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Depósitos - Jefe y Admin */}
        {isJefeOrAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('DepositosMenu')}
          >
            <Text style={styles.menuIcon}>🏦</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Depósitos</Text>
              <Text style={styles.menuDescription}>Subir y revisar depósitos</Text>
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

export default CajasMenu;