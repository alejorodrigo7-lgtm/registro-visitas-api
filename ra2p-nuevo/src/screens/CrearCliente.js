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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CrearCliente = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    telefono: [''],
    barrio: '',
    direccion: '',
    cedula: '',
  });

  const addTelefono = () => {
    if (formData.telefono.length < 5) {
      setFormData({
        ...formData,
        telefono: [...formData.telefono, ''],
      });
    } else {
      Alert.alert('Límite', 'Máximo 5 teléfonos');
    }
  };

  const removeTelefono = (index) => {
    if (formData.telefono.length > 1) {
      const nuevosTelefonos = formData.telefono.filter((_, i) => i !== index);
      setFormData({ ...formData, telefono: nuevosTelefonos });
    }
  };

  const updateTelefono = (text, index) => {
    const nuevosTelefonos = [...formData.telefono];
    nuevosTelefonos[index] = text;
    setFormData({ ...formData, telefono: nuevosTelefonos });
  };

  const handleSubmit = async () => {
    // ✅ Validaciones con seguridad
    if (!formData.codigo?.trim()) {
      Alert.alert('Error', 'El código es obligatorio');
      return;
    }
    if (!formData.nombre?.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return;
    }
    if (!formData.cedula?.trim()) {
      Alert.alert('Error', 'La cédula es obligatoria');
      return;
    }
    if (!formData.barrio?.trim()) {
      Alert.alert('Error', 'El barrio es obligatorio');
      return;
    }
    if (!formData.direccion?.trim()) {
      Alert.alert('Error', 'La dirección es obligatoria');
      return;
    }

    // ✅ Validar teléfonos con seguridad
    const telefonosValidos = formData.telefono
      .filter(t => t && typeof t === 'string' && t.trim() !== '')
      .map(t => t.trim());

    if (telefonosValidos.length === 0) {
      Alert.alert('Error', 'Debes ingresar al menos un teléfono');
      return;
    }

    setLoading(true);
    try {
      // ✅ Asegurar que los teléfonos sean strings limpios
      const telefonosLimpios = telefonosValidos.map(t => String(t).trim());

      const dataToSend = {
        identificador: formData.codigo.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        telefono: telefonosLimpios,
        barrio: formData.barrio.trim(),
        direccion: formData.direccion.trim(),
        cedula: formData.cedula.trim(),
        creadoPor: user._id,
        creadoPorNombre: user.nombre,
      };

      console.log('📤 Creando cliente:', dataToSend);

      const response = await api.post('/clientes', dataToSend);

      Alert.alert(
        '✅ Cliente Creado',
        `Cliente ${formData.nombre} registrado correctamente`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                codigo: '',
                nombre: '',
                telefono: [''],
                barrio: '',
                direccion: '',
                cedula: '',
              });
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al crear el cliente'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>👤 Nuevo Cliente</Text>
          <Text style={styles.subtitle}>Registrar un nuevo cliente</Text>
        </View>

        <View style={styles.form}>
          {/* Código */}
          <Text style={styles.label}>📋 Código *</Text>
          <TextInput
            style={styles.input}
            value={formData.codigo}
            onChangeText={(text) => setFormData({ ...formData, codigo: text })}
            placeholder="Ej: 123456"
            autoCapitalize="characters"
          />

          {/* Nombre Completo */}
          <Text style={styles.label}>👤 Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            placeholder="Nombre completo del cliente"
          />

          {/* Cédula */}
          <Text style={styles.label}>🆔 Cédula *</Text>
          <TextInput
            style={styles.input}
            value={formData.cedula}
            onChangeText={(text) => setFormData({ ...formData, cedula: text })}
            placeholder="Número de cédula"
            keyboardType="numeric"
          />

          {/* Teléfonos */}
          <Text style={styles.label}>📱 Teléfonos *</Text>
          {formData.telefono.map((tel, index) => (
            <View key={index} style={styles.telefonoRow}>
              <TextInput
                style={[styles.input, styles.telefonoInput]}
                value={tel}
                onChangeText={(text) => updateTelefono(text, index)}
                placeholder={`Teléfono ${index + 1}`}
                keyboardType="phone-pad"
              />
              {formData.telefono.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeTelefono(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addTelefono}>
            <Ionicons name="add-circle" size={24} color="#6C5CE7" />
            <Text style={styles.addButtonText}>Agregar teléfono</Text>
          </TouchableOpacity>

          {/* Barrio */}
          <Text style={styles.label}>🏘️ Barrio *</Text>
          <TextInput
            style={styles.input}
            value={formData.barrio}
            onChangeText={(text) => setFormData({ ...formData, barrio: text })}
            placeholder="Barrio del cliente"
          />

          {/* Dirección */}
          <Text style={styles.label}>📍 Dirección *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.direccion}
            onChangeText={(text) => setFormData({ ...formData, direccion: text })}
            placeholder="Dirección completa"
            multiline
            numberOfLines={2}
          />

          {/* Usuario que crea */}
          <View style={styles.usuarioContainer}>
            <Text style={styles.usuarioLabel}>👤 Creado por:</Text>
            <Text style={styles.usuarioNombre}>{user?.nombre || 'Usuario'}</Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>💾 Guardar Cliente</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  telefonoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telefonoInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  addButtonText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  usuarioContainer: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  usuarioLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  usuarioNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CrearCliente;