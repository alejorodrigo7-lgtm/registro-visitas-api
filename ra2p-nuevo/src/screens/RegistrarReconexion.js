import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DateTimePicker from '@react-native-community/datetimepicker';

const RegistrarReconexion = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [buscando, setBuscando] = useState(false);

  const buscarCliente = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Error', 'Ingresa un código o nombre de cliente');
      return;
    }

    setBuscando(true);
    try {
      console.log('🔍 Buscando cliente:', searchTerm);
      const response = await api.get(`/clientes/buscar/${searchTerm.trim()}`);
      if (response.data.success) {
        setCliente(response.data.data);
        Alert.alert('✅ Cliente encontrado', `Cliente: ${response.data.data.nombre}`);
        console.log('✅ Cliente encontrado:', response.data.data);
      }
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
      Alert.alert('Error', 'Cliente no encontrado');
      setCliente(null);
    } finally {
      setBuscando(false);
    }
  };

  const handleSubmit = async () => {
    if (!cliente) {
      Alert.alert('Error', 'Primero busca y selecciona un cliente');
      return;
    }

    setLoading(true);
    try {
      const data = {
        tipo: 'RECONEXION',
        cliente: cliente.nombre,
        codigoCliente: cliente.identificador,
        fecha: fecha.toISOString(),
        observaciones: observaciones,
      };

      console.log('📤 Registrando reconexión:', data);
      const response = await api.post('/desconexiones', data);

      Alert.alert(
        '✅ Reconexión Registrada',
        `Se ha registrado la reconexión del cliente ${cliente.nombre}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCliente(null);
              setSearchTerm('');
              setObservaciones('');
              navigation.goBack();
            },
          },
        ]
      );
      console.log('✅ Reconexión registrada:', response.data);
    } catch (error) {
      console.error('❌ Error registrando reconexión:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al registrar la reconexión'
      );
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFecha(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>2️⃣ Registrar Reconexión</Text>
          <Text style={styles.subtitle}>Busca un cliente para registrar su reconexión</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Buscar Cliente */}
          <Text style={styles.label}>🔍 Buscar Cliente (Código o Nombre)</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Ingresa código o nombre del cliente..."
              placeholderTextColor="#B2BEC3"
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={buscarCliente}
              disabled={buscando}
            >
              {buscando ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="search" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Información del Cliente */}
          {cliente && (
            <View style={styles.clienteInfo}>
              <View style={styles.clienteHeader}>
                <Text style={styles.clienteNombre}>👤 {cliente.nombre}</Text>
                <View style={styles.clienteBadge}>
                  <Text style={styles.clienteBadgeText}>Encontrado</Text>
                </View>
              </View>
              <Text style={styles.clienteDetalle}>📋 Código: {cliente.identificador}</Text>
              <Text style={styles.clienteDetalle}>📍 Dirección: {cliente.direccion}</Text>
              <Text style={styles.clienteDetalle}>📞 Teléfono: {cliente.telefono}</Text>
              <Text style={styles.clienteDetalle}>🏘️ Barrio: {cliente.barrio}</Text>
            </View>
          )}

          {/* Fecha de Reconexión */}
          <Text style={styles.label}>📅 Fecha de Reconexión</Text>
          <TouchableOpacity 
            style={styles.dateButton} 
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6C5CE7" />
            <Text style={styles.dateText}>
              {fecha.toLocaleDateString('es-ES')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#636E72" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={fecha}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Observaciones */}
          <Text style={styles.label}>📝 Observaciones</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Detalles adicionales de la reconexión..."
            placeholderTextColor="#B2BEC3"
            multiline
            numberOfLines={4}
          />

          {/* Usuario que registra */}
          <View style={styles.usuarioInfo}>
            <Ionicons name="person-circle-outline" size={20} color="#6C5CE7" />
            <Text style={styles.usuarioText}>
              Registrado por: {user?.nombre || 'Usuario'}
            </Text>
          </View>

          {/* Botón Guardar */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!cliente || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!cliente || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Registrar Reconexión</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    padding: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 54,
  },
  clienteInfo: {
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  clienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clienteNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  clienteBadge: {
    backgroundColor: '#00B894',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  clienteBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clienteDetalle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#2D3436',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  usuarioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  usuarioText: {
    fontSize: 14,
    color: '#636E72',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegistrarReconexion;