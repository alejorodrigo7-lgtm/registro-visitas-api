import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'https://registro-visitas-api-v9tn.onrender.com';

const SolicitarRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchClients = async (text) => {
    if (text.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setSearchTerm(text);
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/solicitudes-recibo/clientes/buscar?termino=${text}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data);
        setShowSuggestions(data.data.length > 0);
      }
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.nombre} - ${client.codigo}`);
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!selectedClient) {
      Alert.alert('Error', 'Por favor selecciona un cliente');
      return;
    }

    if (!observaciones.trim()) {
      Alert.alert('Error', 'Por favor ingresa observaciones');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/solicitudes-recibo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            cliente: {
              nombre: selectedClient.nombre,
              codigo: selectedClient.codigo,
              direccion: selectedClient.direccion || '',
              telefono: selectedClient.telefono || ''
            },
            observaciones: observaciones.trim()
          })
        }
      );
      const data = await response.json();
      if (data.success) {
        Alert.alert(
          '✅ Solicitud Enviada',
          'Tu solicitud de recibo ha sido enviada exitosamente',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedClient(null);
                setSearchTerm('');
                setObservaciones('');
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Error al crear la solicitud');
      }
    } catch (error) {
      console.error('Error creando solicitud:', error);
      Alert.alert('Error', 'Error al crear la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectClient(item)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.nombre}</Text>
        <Text style={styles.suggestionCode}>Código: {item.codigo}</Text>
        {item.direccion && (
          <Text style={styles.suggestionAddress}>{item.direccion}</Text>
        )}
      </View>
      <Ionicons name="add-circle" size={24} color="#4CAF50" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Recibo</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Buscar Cliente</Text>
          <Text style={styles.sectionSubtitle}>
            Busca por nombre o código del cliente
          </Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre o código del cliente..."
              placeholderTextColor="#999"
              value={searchTerm}
              onChangeText={searchClients}
            />
            {loading && <ActivityIndicator size="small" color="#4CAF50" />}
          </View>

          {showSuggestions && searchResults.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.codigo}-${index}`}
                renderItem={renderSuggestion}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>

        {selectedClient && (
          <View style={styles.selectedClientContainer}>
            <Text style={styles.selectedClientTitle}>✅ Cliente Seleccionado</Text>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{selectedClient.nombre}</Text>
              <Text style={styles.clientCode}>Código: {selectedClient.codigo}</Text>
              {selectedClient.direccion && (
                <Text style={styles.clientAddress}>📍 {selectedClient.direccion}</Text>
              )}
              {selectedClient.telefono && (
                <Text style={styles.clientPhone}>📞 {selectedClient.telefono}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observaciones</Text>
          <TextInput
            style={styles.observacionesInput}
            placeholder="Describe el motivo de la solicitud..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={observaciones}
            onChangeText={setObservaciones}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedClient || !observaciones.trim() || loading) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!selectedClient || !observaciones.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Solicitar Recibo</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF1'
  },
  backButton: {
    padding: 5,
    width: 40
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  headerRight: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 20
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 10
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 50
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    paddingVertical: 10
  },
  suggestionsContainer: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 200
  },
  suggestionsList: {
    flexGrow: 0
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  suggestionContent: {
    flex: 1
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50'
  },
  suggestionCode: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 2
  },
  selectedClientContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20
  },
  selectedClientTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10
  },
  clientInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50'
  },
  clientCode: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2
  },
  clientAddress: {
    fontSize: 14,
    color: '#555',
    marginTop: 4
  },
  clientPhone: {
    fontSize: 14,
    color: '#555',
    marginTop: 2
  },
  observacionesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 16,
    marginTop: 10,
    marginBottom: 30
  },
  disabledButton: {
    opacity: 0.6
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10
  }
});

export default SolicitarRecibo;