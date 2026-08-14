import React, { useState, useRef } from 'react';
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
import api from '../services/api';

const SolicitarRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const typingTimeoutRef = useRef(null);

  // ✅ Función de búsqueda de clientes
  const searchClients = async (text) => {
    const termino = text !== undefined ? text : searchTerm;
    
    console.log('🔍 Buscando cliente con término:', termino);
    
    if (!termino || termino.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setLoading(true);

    try {
      const response = await api.get(
        `/clientes/buscar?termino=${encodeURIComponent(termino)}`
      );
      
      console.log('📡 Estado de la respuesta:', response.status);
      
      if (response.data.success) {
        if (response.data.data && response.data.data.length > 0) {
          setSearchResults(response.data.data);
          setShowSuggestions(true);
          console.log(`✅ Encontrados ${response.data.data.length} clientes`);
        } else {
          setSearchResults([]);
          setShowSuggestions(true);
          console.log('⚠️ No se encontraron clientes');
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
        Alert.alert('Error', response.data.message || 'Error al buscar clientes');
      }
    } catch (error) {
      console.error('❌ Error buscando clientes:', error);
      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'Error al buscar clientes');
      }
      setSearchResults([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // ✅ Búsqueda automática mientras escribe
  const handleTextChange = (text) => {
    setSearchTerm(text);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (selectedClient) {
      setSelectedClient(null);
    }

    if (text.length < 2) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    typingTimeoutRef.current = setTimeout(() => {
      searchClients(text);
    }, 500);
  };

  // ✅ BOTÓN DE BÚSQUEDA MANUAL
  const handleManualSearch = () => {
    if (!searchTerm || searchTerm.length < 2) {
      Alert.alert('⚠️', 'Ingresa al menos 2 caracteres para buscar');
      return;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    searchClients(searchTerm);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSearchTerm(`${client.nombre} - ${client.codigo}`);
    setShowSuggestions(false);
    setSearchResults([]);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSuggestions(false);
    setSelectedClient(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
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
      const response = await api.post('/solicitudes-recibo', {
        cliente: {
          nombre: selectedClient.nombre,
          codigo: selectedClient.codigo,
          direccion: selectedClient.direccion || '',
          telefono: selectedClient.telefono || ''
        },
        observaciones: observaciones.trim()
      });
      
      if (response.data.success) {
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
                setSearchResults([]);
                setShowSuggestions(false);
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Error al crear la solicitud');
      }
    } catch (error) {
      console.error('Error creando solicitud:', error);
      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'Error al crear la solicitud');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectClient(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.nombre}</Text>
        <Text style={styles.suggestionCode}>Código: {item.codigo}</Text>
        {item.direccion && (
          <Text style={styles.suggestionAddress} numberOfLines={1}>
            📍 {item.direccion}
          </Text>
        )}
        {item.telefono && (
          <Text style={styles.suggestionPhone}>📞 {item.telefono}</Text>
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
        <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
          <Ionicons name="close" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Buscar Cliente</Text>
          <Text style={styles.sectionSubtitle}>
            Busca por nombre o código del cliente
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre o código del cliente..."
                placeholderTextColor="#999"
                value={searchTerm}
                onChangeText={handleTextChange}
                editable={!selectedClient}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={handleManualSearch}
              />
              {loading && <ActivityIndicator size="small" color="#4CAF50" />}
              {searchTerm.length > 0 && !loading && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* ✅ BOTÓN BUSCAR - VERDE */}
            <TouchableOpacity
              style={[styles.searchButton, (isSearching || loading) && styles.searchButtonDisabled]}
              onPress={handleManualSearch}
              disabled={isSearching || loading}
            >
              <Text style={styles.searchButtonText}>
                {isSearching || loading ? '⏳' : '🔍'}
              </Text>
            </TouchableOpacity>
          </View>

          {showSuggestions && searchResults.length > 0 && (
            <Text style={styles.resultCount}>
              {searchResults.length} cliente{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
            </Text>
          )}

          {showSuggestions && searchResults.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.codigo}-${index}`}
                renderItem={renderSuggestion}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              />
            </View>
          )}

          {showSuggestions && searchResults.length === 0 && searchTerm.length >= 2 && !loading && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color="#ccc" />
                <Text style={styles.emptyText}>No se encontraron clientes</Text>
                <Text style={styles.emptySubText}>Verifica el nombre o código ingresado</Text>
              </View>
            </View>
          )}
        </View>

        {selectedClient && (
          <View style={styles.selectedClientContainer}>
            <View style={styles.selectedClientHeader}>
              <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
              <Text style={styles.selectedClientTitle}>Cliente Seleccionado</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{selectedClient.nombre}</Text>
              <Text style={styles.clientCode}>📋 {selectedClient.codigo}</Text>
              {selectedClient.direccion && (
                <Text style={styles.clientAddress}>📍 {selectedClient.direccion}</Text>
              )}
              {selectedClient.telefono && (
                <Text style={styles.clientPhone}>📞 {selectedClient.telefono}</Text>
              )}
              <TouchableOpacity 
                style={styles.changeClientButton}
                onPress={handleClearSearch}
              >
                <Text style={styles.changeClientText}>Cambiar cliente</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observaciones</Text>
          <Text style={styles.sectionSubtitle}>
            Describe el motivo de la solicitud
          </Text>
          <TextInput
            style={styles.observacionesInput}
            placeholder="Ej: Solicito recibo de pago del mes de julio..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={observaciones}
            onChangeText={setObservaciones}
            editable={!loading}
          />
          <Text style={styles.observacionesCount}>
            {observaciones.length} caracteres
          </Text>
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
              <Ionicons name="send" size={22} color="#fff" />
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
  clearButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end'
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
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
  clearSearchButton: {
    paddingHorizontal: 5
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#A5D6A7'
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    marginBottom: 4
  },
  suggestionsContainer: {
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 250,
    overflow: 'hidden'
  },
  suggestionsList: {
    maxHeight: 250
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
  suggestionPhone: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 1
  },
  selectedClientContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7'
  },
  selectedClientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  selectedClientTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32'
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
  changeClientButton: {
    marginTop: 8,
    paddingVertical: 6
  },
  changeClientText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500'
  },
  observacionesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  observacionesCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10
  },
  emptySubText: {
    color: '#bbb',
    fontSize: 13,
    marginTop: 4
  }
});

export default SolicitarRecibo;