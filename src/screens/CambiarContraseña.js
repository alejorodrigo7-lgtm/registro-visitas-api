import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext'; // ✅ AGREGAR
import api from '../services/api';

const CambiarContraseña = ({ navigation }) => {
  const { user } = useAuth(); // ✅ AGREGAR
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    passwordActual: '',
    passwordNuevo: '',
    confirmarPassword: '',
  });
  
  // ✅ MEJORA: separar visibilidad para cada campo
  const [showActual, setShowActual] = useState(false);
  const [showNuevo, setShowNuevo] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const handleSubmit = async () => {
    if (!formData.passwordActual || !formData.passwordNuevo || !formData.confirmarPassword) {
      Alert.alert('Error', 'Todos los campos son obligatorios');
      return;
    }

    if (formData.passwordNuevo.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.passwordNuevo !== formData.confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // ✅ CORREGIDO: ruta correcta /auth/change-password
      const response = await api.post('/auth/change-password', {
        currentPassword: formData.passwordActual,
        newPassword: formData.passwordNuevo,
      });

      if (response.data.success) {
        Alert.alert(
          '✅ Éxito',
          'Contraseña actualizada correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                setFormData({
                  passwordActual: '',
                  passwordNuevo: '',
                  confirmarPassword: '',
                });
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al cambiar la contraseña'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* ✅ AGREGAR BOTÓN DE VOLVER */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>🔒 Cambiar Contraseña</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          {/* ✅ MOSTRAR USUARIO */}
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={50} color="#6C5CE7" />
            <View>
              <Text style={styles.userName}>{user?.nombre || 'Usuario'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
          </View>

          <Text style={styles.label}>Contraseña actual *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.passwordActual}
              onChangeText={(text) => setFormData({ ...formData, passwordActual: text })}
              placeholder="Ingresa tu contraseña actual"
              secureTextEntry={!showActual}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowActual(!showActual)}
            >
              <Ionicons name={showActual ? 'eye-off' : 'eye'} size={24} color="#636E72" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nueva contraseña *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.passwordNuevo}
              onChangeText={(text) => setFormData({ ...formData, passwordNuevo: text })}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showNuevo}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowNuevo(!showNuevo)}
            >
              <Ionicons name={showNuevo ? 'eye-off' : 'eye'} size={24} color="#636E72" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar nueva contraseña *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={formData.confirmarPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmarPassword: text })}
              placeholder="Repite la nueva contraseña"
              secureTextEntry={!showConfirmar}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmar(!showConfirmar)}
            >
              <Ionicons name={showConfirmar ? 'eye-off' : 'eye'} size={24} color="#636E72" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#636E72" />
            <Text style={styles.infoText}>
              La contraseña debe tener al menos 6 caracteres.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Actualizar Contraseña</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  userEmail: {
    fontSize: 14,
    color: '#636E72',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#2D3436',
  },
  eyeButton: {
    padding: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#636E72',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CambiarContraseña;