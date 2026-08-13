import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'https://registro-visitas-api-v9tn.onrender.com';

const SubirRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/solicitudes-recibo?estado=SOLICITADO`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (data.success) {
        setSolicitudes(data.data);
        setFilteredSolicitudes(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSolicitudes(solicitudes);
    } else {
      const filtered = solicitudes.filter(s =>
        s.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSolicitudes(filtered);
    }
  }, [searchTerm, solicitudes]);

  const handleSelectFile = async (solicitud) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        Alert.alert(
          '📄 Archivo Seleccionado',
          `PDF: ${result.name}`,
          [
            {
              text: 'Subir Recibo',
              onPress: () => handleUpload(solicitud, result)
            },
            {
              text: 'Cancelar',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleUpload = async (solicitud, file) => {
    setUploading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/solicitudes-recibo/${solicitud._id}/aprobar`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            archivoNombre: file.name,
            archivoUrl: file.uri,
            archivoPublicId: 'temp_id'
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        Alert.alert('✅ Éxito', 'Recibo subido exitosamente');
        fetchSolicitudes();
      } else {
        Alert.alert('Error', data.message || 'Error al subir el recibo');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Error al procesar la solicitud');
    } finally {
      setUploading(false);
    }
  };

  const handleDenegar = async (solicitud) => {
    Alert.alert(
      '⚠️ Denegar Solicitud',
      '¿Estás seguro de que deseas denegar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denegar',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/solicitudes-recibo/${solicitud._id}/denegar`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                }
              );
              const data = await response.json();
              if (data.success) {
                Alert.alert('✅ Solicitud Denegada', 'La solicitud ha sido denegada');
                fetchSolicitudes();
              } else {
                Alert.alert('Error', data.message || 'Error al denegar');
              }
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Error al denegar la solicitud');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const renderSolicitud = ({ item }) => (
    <View style={styles.solicitudCard}>
      <View style={styles.solicitudHeader}>
        <View style={styles.clienteInfo}>
          <Text style={styles.clienteNombre}>{item.cliente.nombre}</Text>
          <Text style={styles.clienteCodigo}>Código: {item.cliente.codigo}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>⏳ PENDIENTE</Text>
        </View>
      </View>

      {item.observaciones && (
        <View style={styles.observacionesContainer}>
          <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
          <Text style={styles.observacionesText} numberOfLines={2}>
            {item.observaciones}
          </Text>
        </View>
      )}

      <View style={styles.fechaInfo}>
        <Text style={styles.fechaText}>
          Solicitado: {new Date(item.fechaSolicitud).toLocaleDateString('es-EC')}
        </Text>
        <Text style={styles.solicitanteText}>
          Por: {item.solicitadoPor.nombre}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.uploadButton]}
          onPress={() => handleSelectFile(item)}
          disabled={uploading}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Subir Recibo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.denyButton]}
          onPress={() => handleDenegar(item)}
          disabled={uploading}
        >
          <Ionicons name="close-outline" size={20} color="#fff" />
          <Text style={styles.buttonText}>Denegar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="inbox-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay solicitudes pendientes</Text>
      <Text style={styles.emptySubtitle}>
        Todas las solicitudes han sido procesadas
      </Text>
    </View>
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
        <Text style={styles.headerTitle}>Subir Recibo</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSolicitudes}
        >
          <Ionicons name="refresh-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSolicitudes}
          renderItem={renderSolicitud}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      )}
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
  refreshButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 45
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    paddingVertical: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20
  },
  solicitudCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  clienteInfo: {
    flex: 1
  },
  clienteNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  clienteCodigo: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F57C00'
  },
  observacionesContainer: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800'
  },
  observacionesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  observacionesText: {
    fontSize: 14,
    color: '#333'
  },
  fechaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  fechaText: {
    fontSize: 12,
    color: '#666'
  },
  solicitanteText: {
    fontSize: 12,
    color: '#666'
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  uploadButton: {
    backgroundColor: '#4CAF50'
  },
  denyButton: {
    backgroundColor: '#F44336'
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40
  }
});

export default SubirRecibo;