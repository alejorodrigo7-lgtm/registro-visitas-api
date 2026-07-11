import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CrearUsuario = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Tecnico',
    telefono: '',
    especialidad: '',
  });

  const roles = [
    { id: 'Admin', label: '👑 Administrador', color: '#FF6B6B' },
    { id: 'Jefe', label: '👔 Jefe', color: '#4ECDC4' },
    { id: 'Coordinador', label: '📋 Coordinador', color: '#45B7D1' },
    { id: 'Tecnico', label: '🔧 Técnico', color: '#96CEB4' },
  ];

  const handleSubmit = async () => {
    // Validar campos obligatorios
    if (!formData.nombre || !formData.email || !formData.password || !formData.rol) {
      Alert.alert('Error', 'Nombre, Email, Contraseña y Rol son obligatorios');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Email no válido');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        nombre: formData.nombre,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
        telefono: formData.telefono || '',
        especialidad: formData.especialidad || '',
      });

      Alert.alert(
        'Éxito',
        `Usuario ${formData.nombre} creado correctamente con rol ${formData.rol}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                nombre: '',
                email: '',
                password: '',
                rol: 'Tecnico',
                telefono: '',
                especialidad: '',
              });
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>👥 Crear Nuevo Usuario</Text>
        <Text style={styles.subtitle}>Completa los datos del nuevo usuario</Text>

        <View style={styles.divider} />

        {/* Nombre */}
        <Text style={styles.label}>Nombre completo *</Text>
        <TextInput
          style={styles.input}
          value={formData.nombre}
          onChangeText={(text) => setFormData({ ...formData, nombre: text })}
          placeholder="Ej: Juan Pérez"
        />

        {/* Email */}
        <Text style={styles.label}>Correo electrónico *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Contraseña */}
        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          style={styles.input}
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
        />
        <Text style={styles.hint}>La contraseña debe tener al menos 6 caracteres</Text>

        {/* Selección de Rol */}
        <Text style={styles.label}>Rol *</Text>
        <View style={styles.rolesContainer}>
          {roles.map((rol) => (
            <TouchableOpacity
              key={rol.id}
              style={[
                styles.rolButton,
                { backgroundColor: formData.rol === rol.id ? rol.color : '#F5F5F5' },
                formData.rol === rol.id && styles.rolButtonSelected,
              ]}
              onPress={() => setFormData({ ...formData, rol: rol.id })}
            >
              <Text
                style={[
                  styles.rolButtonText,
                  formData.rol === rol.id && styles.rolButtonTextSelected,
                ]}
              >
                {rol.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Teléfono (opcional) */}
        <Text style={styles.label}>Teléfono (opcional)</Text>
        <TextInput
          style={styles.input}
          value={formData.telefono}
          onChangeText={(text) => setFormData({ ...formData, telefono: text })}
          placeholder="0987654321"
          keyboardType="phone-pad"
        />

        {/* Especialidad (solo para Técnicos) */}
        {formData.rol === 'Tecnico' && (
          <View>
            <Text style={styles.label}>Especialidad (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formData.especialidad}
              onChangeText={(text) => setFormData({ ...formData, especialidad: text })}
              placeholder="Ej: Instalaciones eléctricas"
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>✅ Crear Usuario</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#DFE6E9',
    marginVertical: 15,
  },
  label: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  hint: {
    fontSize: 12,
    color: '#636E72',
    marginTop: -10,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  rolButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DFE6E9',
    alignItems: 'center',
  },
  rolButtonSelected: {
    borderColor: '#2D3436',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rolButtonText: {
    fontSize: 14,
    color: '#2D3436',
    fontWeight: '500',
  },
  rolButtonTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#636E72',
    fontSize: 16,
  },
});

export default CrearUsuario;