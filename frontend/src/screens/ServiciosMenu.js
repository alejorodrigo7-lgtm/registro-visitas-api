import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const ServiciosMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdminOrJefeOrTecnico = ['Admin', 'Jefe', 'Tecnico'].includes(user?.rol);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Servicios</Text>
        <Text style={styles.subtitle}>Selecciona una opción</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {/* Tomar Servicio - Todos los roles */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TomarServicio')}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Tomar Servicio</Text>
            <Text style={styles.menuDescription}>Registra un nuevo servicio</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* Ejecución Servicio - Admin, Jefe, Técnico */}
        {isAdminOrJefeOrTecnico && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EjecucionServicio')}
          >
            <Text style={styles.menuIcon}>🛠️</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ejecución de Servicio</Text>
              <Text style={styles.menuDescription}>Ejecutar o poner pendiente</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Retroalimentación - Admin, Jefe, Técnico */}
        {isAdminOrJefeOrTecnico && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('RetroalimentacionServicio')}
          >
            <Text style={styles.menuIcon}>📝</Text>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Retroalimentación</Text>
              <Text style={styles.menuDescription}>Retroalimentar servicios ejecutados</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Revisión Servicios - Todos los roles */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('RevisionServicios')}
        >
          <Text style={styles.menuIcon}>🔍</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Revisión Servicios</Text>
            <Text style={styles.menuDescription}>Buscar y ver todos los servicios</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* ============================================ */}
        {/* 📋 MONSERRATH - DENTRO DE SERVICIOS */}
        {/* ============================================ */}
        <TouchableOpacity
          style={[styles.menuItem, styles.monserrathMenuItem]}
          onPress={() => navigation.navigate('MonserrathScreen')}
        >
          <Text style={styles.menuIcon}>📋</Text>
          <View style={styles.menuTextContainer}>
            <Text style={[styles.menuTitle, styles.monserrathText]}>Monserrath</Text>
            <Text style={styles.menuDescription}>Registro de visitas y servicios Monserrath</Text>
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
    backgroundColor: '#00B894',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
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
  monserrathMenuItem: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  monserrathText: {
    color: '#9C27B0',
  },
});

export default ServiciosMenu;