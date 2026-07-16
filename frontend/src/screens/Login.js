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
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = ({ navigation, route }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const selectedRole = route?.params?.selectedRole || 'Tecnico';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa email y contraseña');
      return;
    }

    setLoading(true);
    const result = await login(email, password, selectedRole);
    setLoading(false);

    if (result.success) {
      navigation.replace('MenuPrincipal');
    } else {
      Alert.alert('Error', result.error || 'Credenciales inválidas');
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Ingresa tu email');
      return;
    }

    setResetLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: resetEmail.trim()
      });

      if (response.data.success) {
        Alert.alert(
          '✅ Contraseña restablecida',
          `Se ha restablecido la contraseña para ${resetEmail}\n\nNueva contraseña: 123456`,
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                setEmail(resetEmail);
                setPassword('123456');
                setResetEmail('');
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo restablecer la contraseña'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RA²P</Text>
        <Text style={styles.subtitle}>Iniciar Sesión</Text>
        <Text style={styles.roleText}>Rol: {selectedRole}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Ingresar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        {/* Modal Restablecer Contraseña */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Restablecer Contraseña</Text>
              <Text style={styles.modalSubtitle}>
                Ingresa tu email para restablecer tu contraseña
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Restablecer</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#6C5CE7' },
  subtitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#2D3436', marginBottom: 5 },
  roleText: { fontSize: 16, textAlign: 'center', color: '#636E72', marginBottom: 20 },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  forgotButton: { alignItems: 'center', marginVertical: 10 },
  forgotButtonText: { color: '#6C5CE7', fontSize: 14 },
  backText: { color: '#6C5CE7', fontSize: 16, textAlign: 'center', marginTop: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2D3436', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#636E72', textAlign: 'center', marginBottom: 20 },
  modalInput: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  modalButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalCancelButton: { padding: 12, alignItems: 'center' },
  modalCancelText: { color: '#636E72', fontSize: 16 },
});

export default Login;