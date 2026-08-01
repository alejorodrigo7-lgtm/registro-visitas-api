import { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const roles = [
  { id: 'Admin', label: '👑 Administrador', color: '#6C5CE7' },
  { id: 'Jefe', label: '👔 Jefe', color: '#00B894' },
  { id: 'Coordinador', label: '📋 Coordinador', color: '#0984E3' },
  { id: 'Tecnico', label: '🔧 Técnico/Instalador', color: '#FDCB6E' },
];

const RoleSelection = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    navigation.navigate('Login', { selectedRole: role });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🎨 HEADER - BIENVENIDO PROFESIONAL */}
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>BIENVENIDO</Text>
        <View style={styles.welcomeLine} />
        <Text style={styles.welcomeSubtitle}>Selecciona tu rol para continuar</Text>
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
            activeOpacity={0.8}
          >
            <Text style={styles.roleLabel}>{role.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>🔥 RA²P v1.0.7 🔥</Text>
        <Text style={styles.footerSubText}>Desarrollado por Alejandro Abril 👍</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '300',
    color: '#1A1A2E',
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  welcomeLine: {
    width: 60,
    height: 3,
    backgroundColor: '#6C5CE7',
    marginTop: 12,
    borderRadius: 2,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6C6C80',
    marginTop: 10,
    fontWeight: '400',
    letterSpacing: 1.5,
  },
  rolesContainer: {
    flex: 1,
    paddingHorizontal: 4,
    justifyContent: 'center',
    gap: 16,
  },
  roleCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedRole: {
    borderWidth: 2,
    borderColor: '#1A1A2E',
    transform: [{ scale: 1.02 }],
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6C6C80',
    fontWeight: '300',
    letterSpacing: 2,
  },
  footerSubText: {
    fontSize: 10,
    color: '#A0A0B0',
    marginTop: 4,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});

export default RoleSelection;
