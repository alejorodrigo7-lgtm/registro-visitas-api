import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const UsuarioNuevoScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    identificador: '',
    barrio: '',
    direccion: '',
    telefono: '',
  });

  const validarCampos = () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return false;
    }
    if (!formData.identificador.trim()) {
      Alert.alert('Error', 'El identificador es obligatorio');
      return false;
    }
    if (!formData.barrio.trim()) {
      Alert.alert('Error', 'El barrio es obligatorio');
      return false;
    }
    if (!formData.direccion.trim()) {
      Alert.alert('Error', 'La dirección es obligatoria');
      return false;
    }
    if (!formData.telefono.trim()) {
      Alert.alert('Error', 'El teléfono es obligatorio');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validarCampos()) return;

    setLoading(true);
    try {
      const dataToSend = {
        nombre: formData.nombre.trim(),
        identificador: formData.identificador.trim(),
        barrio: formData.barrio.trim(),
        direccion: formData.direccion.trim(),
        telefono: formData.telefono.trim(),
      };

      const response = await api.post('/clientes', dataToSend);

      Alert.alert(
        '✅ Éxito',
        `Cliente "${formData.nombre}" registrado correctamente`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                nombre: '',
                identificador: '',
                barrio: '',
                direccion: '',
                telefono: '',
              });
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al registrar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👤 Usuario Nuevo</Text>
        <Text style={styles.subtitle}>Registrar un nuevo cliente</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Nombre completo *</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            placeholder="Nombre del cliente"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Identificador *</Text>
          <TextInput
            style={styles.input}
            value={formData.identificador}
            onChangeText={(text) => setFormData({ ...formData, identificador: text })}
            placeholder="Cédula / RUC"
            placeholderTextColor="#999"
            keyboardType="default"
          />

          <Text style={styles.label}>Barrio *</Text>
          <TextInput
            style={styles.input}
            value={formData.barrio}
            onChangeText={(text) => setFormData({ ...formData, barrio: text })}
            placeholder="Barrio"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Dirección *</Text>
          <TextInput
            style={styles.input}
            value={formData.direccion}
            onChangeText={(text) => setFormData({ ...formData, direccion: text })}
            placeholder="Dirección completa"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Teléfono *</Text>
          <TextInput
            style={styles.input}
            value={formData.telefono}
            onChangeText={(text) => setFormData({ ...formData, telefono: text })}
            placeholder="Número de teléfono"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Registrar Cliente</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#636E72" />
            <Text style={styles.infoText}>
              El cliente se guardará en la base de datos y estará disponible para todos los módulos.
            </Text>
          </View>
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
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    color: '#2D3436',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#636E72',
    lineHeight: 18,
  },
});

export default UsuarioNuevoScreen;