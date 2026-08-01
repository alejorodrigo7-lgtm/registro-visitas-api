import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const DepositosMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isJefeOrAdmin = ['Jefe', 'Admin'].includes(user?.rol);

  if (!isJefeOrAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.deniedIcon}>⛔</Text>
          <Text style={styles.deniedTitle}>Acceso Denegado</Text>
          <Text style={styles.deniedText}>Solo Jefes y Administradores pueden acceder</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏦 Depósitos</Text>
        <Text style={styles.subtitle}>Selecciona una opción</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SubirDeposito')}
        >
          <Text style={styles.menuIcon}>📤</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Subir Depósito</Text>
            <Text style={styles.menuDescription}>Registrar un nuevo depósito</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('RevisarDepositos')}
        >
          <Text style={styles.menuIcon}>🔍</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Revisar Depósitos</Text>
            <Text style={styles.menuDescription}>Ver y revisar depósitos</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deniedIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  deniedText: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
  },
});

export default DepositosMenu;