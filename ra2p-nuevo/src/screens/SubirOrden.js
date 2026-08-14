import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SubirOrden = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [coordinadores, setCoordinadores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [telefono, setTelefono] = useState('');
  const [mac, setMac] = useState('');
  const [coordinadorId, setCoordinadorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchCoordinadores = async () => {
      try {
        const res = await api.get('/recuperacion/coordinadores');
        if (res.data.success) {
          setCoordinadores(res.data.data);
          if (res.data.data.length > 0) setCoordinadorId(res.data.data[0]._id);
        }
      } catch (error) {
        console.error('Error cargando coordinadores:', error);
        Alert.alert('Error', 'No se pudieron cargar los coordinadores');
      }
    };
    fetchCoordinadores();
  }, []);

  const searchClients = async (text) => {
    if (text.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await api.get(`/clientes/buscar?termino=${encodeURIComponent(text)}`);
      if (response.data.success) {
        setSearchResults(response.data.data || []);
        setShowSuggestions(response.data.data?.length > 0);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    }
  };

  const handleSelectClient = (client) => {
    setClienteSeleccionado(client);
    setSearchTerm(`${client.nombre} - ${client.codigo}`);
    setTelefono(client.telefono || '');
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleClearClient = () => {
    setClienteSeleccionado(null);
    setSearchTerm('');
    setTelefono('');
  };

  const validateTelefono = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 9) {
      setTelefono(cleaned);
    }
  };

  const handleSubmit = async () => {
    if (!clienteSeleccionado) {
      Alert.alert('Error', 'Selecciona un cliente');
      return;
    }
    if (!telefono || telefono.length !== 9) {
      Alert.alert('Error', 'Teléfono debe tener 9 dígitos sin el 0');
      return;
    }
    if (!mac.trim()) {
      Alert.alert('Error', 'MAC es obligatoria');
      return;
    }
    if (!coordinadorId) {
      Alert.alert('Error', 'Selecciona un coordinador');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        cliente: {
          nombre: clienteSeleccionado.nombre,
          codigo: clienteSeleccionado.codigo,
          telefono: telefono,
          direccion: clienteSeleccionado.direccion || '',
        },
        mac: mac.trim(),
        coordinadorId,
        observacionesSubida: observaciones.trim(),
      };

      const res = await api.post('/recuperacion/orden', payload);
      if (res.data.success) {
        Alert.alert('✅ Éxito', 'Orden subida correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', res.data.message || 'Error al subir la orden');
      }
    } catch (error) {
      console.error('Error subiendo orden:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al subir la orden');
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectClient(item)}>
      <View>
        <Text style={styles.suggestionName}>{item.nombre}</Text>
        <Text style={styles.suggestionCode}>Código: {item.codigo}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#6C5CE7" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📤 Subir Orden</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>🔍 Cliente (nombre o código)</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              searchClients(text);
            }}
            editable={!clienteSeleccionado}
          />
          {clienteSeleccionado && (
            <TouchableOpacity onPress={handleClearClient}>
              <Ionicons name="close-circle" size={24} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        {showSuggestions && searchResults.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => `${item.codigo}-${index}`}
              renderItem={renderSuggestion}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            />
          </View>
        )}

        {clienteSeleccionado && (
          <View style={styles.clienteInfo}>
            <Text style={styles.clienteNombre}>{clienteSeleccionado.nombre}</Text>
            <Text style={styles.clienteCodigo}>Código: {clienteSeleccionado.codigo}</Text>
            {clienteSeleccionado.direccion && <Text style={styles.clienteDireccion}>📍 {clienteSeleccionado.direccion}</Text>}
          </View>
        )}

        <Text style={styles.label}>📞 Teléfono (9 dígitos, sin 0)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 987654321"
          keyboardType="numeric"
          value={telefono}
          onChangeText={validateTelefono}
          maxLength={9}
        />

        <Text style={styles.label}>📶 MAC</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: AA:BB:CC:DD:EE:FF"
          value={mac}
          onChangeText={setMac}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>👤 Coordinador</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={coordinadorId}
            onValueChange={(itemValue) => setCoordinadorId(itemValue)}
            style={styles.picker}
          >
            {coordinadores.map((c) => (
              <Picker.Item key={c._id} label={c.nombre} value={c._id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>📝 Observaciones</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones de la orden..."
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>📤 Subir Orden</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  formContainer: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 16, fontWeight: '600', color: '#2D3436', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginTop: 5,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionName: { fontSize: 15, fontWeight: '500', color: '#2D3436' },
  suggestionCode: { fontSize: 13, color: '#636E72' },
  clienteInfo: {
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  clienteNombre: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  clienteCodigo: { fontSize: 14, color: '#636E72' },
  clienteDireccion: { fontSize: 14, color: '#555', marginTop: 2 },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    overflow: 'hidden',
  },
  picker: { height: 50, width: '100%' },
  submitButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { opacity: 0.6 },
});

export default SubirOrden;