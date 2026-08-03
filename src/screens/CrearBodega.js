import React, { useState, useEffect } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CrearBodega = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    usuarioId: '',
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    console.log('👤 1. Cargando usuarios...');
    setCargandoUsuarios(true);
    try {
      const response = await api.get('/auth/usuarios');
      console.log('👤 2. Respuesta usuarios:', response.data);
      if (response.data.success) {
        const usuariosFiltrados = response.data.data.filter(
          u => u.rol === 'Tecnico' || u.rol === 'Coordinador'
        );
        console.log('👤 3. Usuarios filtrados:', usuariosFiltrados.length);
        setUsuarios(usuariosFiltrados);
      }
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const handleSubmit = async () => {
    console.log('🏗️ 1. handleSubmit - Inicio');
    console.log('🏗️ 2. FormData:', formData);

    if (!formData.nombre.trim()) {
      console.log('❌ 3. Error: nombre vacío');
      Alert.alert('Error', 'El nombre de la bodega es obligatorio');
      return;
    }

    if (!formData.usuarioId) {
      console.log('❌ 4. Error: usuarioId vacío');
      Alert.alert('Error', 'Debes seleccionar un usuario');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        nombre: formData.nombre.trim(),
        usuarioId: formData.usuarioId,
      };
      console.log('📤 5. Enviando datos:', dataToSend);

      const response = await api.post('/bodegas/crear', dataToSend);
      console.log('✅ 6. Respuesta:', response.data);

      Alert.alert(
        '✅ Éxito',
        `Bodega "${formData.nombre}" creada correctamente`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({ nombre: '', usuarioId: '' });
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.log('❌ 7. Error en handleSubmit:');
      console.log('❌ 8. Error completo:', error);
      console.log('❌ 9. Response:', error.response);
      console.log('❌ 10. Response data:', error.response?.data);
      console.log('❌ 11. Status:', error.response?.status);

      Alert.alert(
        'Error al crear bodega',
        error.response?.data?.message || error.message || 'Error al crear la bodega'
      );
    } finally {
      setLoading(false);
    }
  };

  if (cargandoUsuarios) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🏗️ Crear Bodega</Text>
          <Text style={styles.subtitle}>Asignar bodega a un usuario</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre de la Bodega *</Text>
          <TextInput
            style={styles.input}
            value={formData.nombre}
            onChangeText={(text) => setFormData(prev => ({ ...prev, nombre: text }))}
            placeholder="Ej: Bodega Técnico 1"
          />

          <Text style={styles.label}>Usuario Asignado *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.usuarioId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, usuarioId: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Selecciona un usuario" value="" />
              {usuarios.map((u) => (
                <Picker.Item
                  key={u._id}
                  label={`${u.nombre} (${u.rol})`}
                  value={u._id}
                />
              ))}
            </Picker>
          </View>

          {formData.usuarioId && (
            <View style={styles.usuarioSeleccionado}>
              <Text style={styles.usuarioSeleccionadoText}>
                ✅ Usuario seleccionado: {usuarios.find(u => u._id === formData.usuarioId)?.nombre}
              </Text>
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
              <Text style={styles.submitButtonText}>🏗️ Crear Bodega</Text>
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
  form: {
    padding: 20,
    paddingBottom: 40,
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
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  usuarioSeleccionado: {
    backgroundColor: '#E8F8F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  usuarioSeleccionadoText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '500',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
});

export default CrearBodega;