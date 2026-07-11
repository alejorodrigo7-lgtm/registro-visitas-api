import { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const roles = [
  { id: 'Admin', label: '👑 Administrador', color: '#FF6B6B' },
  { id: 'Jefe', label: '👔 Jefe', color: '#4ECDC4' },
  { id: 'Coordinador', label: '📋 Coordinador', color: '#45B7D1' },
  { id: 'Tecnico', label: '🔧 Técnico/Instalador', color: '#96CEB4' },
];

const RoleSelection = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    navigation.navigate('Login', { selectedRole: role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registro de Visitas</Text>
        <Text style={styles.subtitle}>Selecciona tu rol</Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleCard,
              { backgroundColor: role.color },
              selectedRole === role.id && styles.selectedRole,
            ]}
            onPress={() => handleRoleSelect(role.id)}
          >
            <Text style={styles.roleLabel}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versión 1.0.0</Text>
      </View>
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
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 10,
  },
  rolesContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  roleCard: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedRole: {
    borderWidth: 3,
    borderColor: '#2D3436',
  },
  roleLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#B2BEC3',
  },
});

export default RoleSelection;