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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BuscarDesRec = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultados, setResultados] = useState([]);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const buscar = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Error', 'Ingresa un término de búsqueda');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Buscando desconexiones/reconexiones:', searchTerm);
      const response = await api.get(`/desconexiones/buscar?search=${encodeURIComponent(searchTerm.trim())}`);
      setResultados(response.data.data || []);
      if (response.data.data.length === 0) {
        setError('No se encontraron registros');
      }
      console.log(`✅ ${response.data.data?.length || 0} registros encontrados`);
    } catch (error) {
      console.error('❌ Error buscando:', error);
      setError('Error al buscar');
      Alert.alert('Error', 'No se pudieron buscar los registros');
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = (registro) => {
    setRegistroSeleccionado(registro);
    setModalVisible(true);
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'PENDIENTE': '#FDCB6E',
      'REALIZADO': '#00B894',
      'ANULADO': '#FF6B6B',
    };
    return colores[estado] || '#636E72';
  };

  const getEstadoIcon = (estado) => {
    const icons = {
      'PENDIENTE': 'time-outline',
      'REALIZADO': 'checkmark-circle-outline',
      'ANULADO': 'close-circle-outline',
    };
    return icons[estado] || 'help-outline';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'DESCONEXION' ? 'power-outline' : 'reload-outline';
  };

  const getTipoColor = (tipo) => {
    return tipo === 'DESCONEXION' ? '#FF6B6B' : '#00B894';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>4️⃣ Buscar Des/Rec</Text>
        <Text style={styles.subtitle}>Busca por nombre de cliente o código - Orden: más antiguo primero</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#636E72" />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Nombre o código del cliente..."
            placeholderTextColor="#B2BEC3"
            returnKeyType="search"
            onSubmitEditing={buscar}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#636E72" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={buscar}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Buscando registros...</Text>
        </View>
      ) : (
        <ScrollView style={styles.resultadosContainer} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#B2BEC3" />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : resultados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#B2BEC3" />
              <Text style={styles.emptyText}>Ingresa un término de búsqueda</Text>
              <Text style={styles.emptySubText}>Ej: nombre del cliente o código</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultadosCount}>
                📋 {resultados.length} registro{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
              </Text>
              {resultados.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.card, { borderLeftColor: getEstadoColor(item.estado) }]}
                  onPress={() => verDetalle(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTipoContainer}>
                      <Ionicons name={getTipoIcon(item.tipo)} size={16} color={getTipoColor(item.tipo)} />
                      <Text style={[styles.cardTipo, { color: getTipoColor(item.tipo) }]}>
                        {item.tipo === 'DESCONEXION' ? 'Desconexión' : 'Reconexión'}
                      </Text>
                    </View>
                    <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                      <Ionicons name={getEstadoIcon(item.estado)} size={12} color="#FFFFFF" />
                      <Text style={styles.estadoBadgeText}>{item.estado}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardCliente}>👤 {item.cliente}</Text>
                  <Text style={styles.cardCodigo}>📋 Código: {item.codigoCliente}</Text>
                  <Text style={styles.cardFecha}>📅 {new Date(item.fecha).toLocaleDateString('es-ES')}</Text>
                  <Text style={styles.cardCreadoPor}>👤 Creado por: {item.creadoPorNombre}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Modal de Detalles */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Detalle del Registro</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            {registroSeleccionado && (
              <>
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📌 Tipo</Text>
                  <Text style={styles.detalleValue}>
                    {registroSeleccionado.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔗 Reconexión'}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>👤 Cliente</Text>
                  <Text style={styles.detalleValue}>{registroSeleccionado.cliente}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📋 Código</Text>
                  <Text style={styles.detalleValue}>{registroSeleccionado.codigoCliente}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📅 Fecha</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(registroSeleccionado.fecha).toLocaleDateString('es-ES')}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📌 Estado</Text>
                  <View style={[styles.estadoBadgeDetalle, { backgroundColor: getEstadoColor(registroSeleccionado.estado) }]}>
                    <Text style={styles.estadoBadgeText}>{registroSeleccionado.estado}</Text>
                  </View>
                </View>

                {registroSeleccionado.observaciones && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>📝 Observaciones</Text>
                    <Text style={styles.detalleValue}>{registroSeleccionado.observaciones}</Text>
                  </View>
                )}

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>👤 Creado por</Text>
                  <Text style={styles.detalleValue}>{registroSeleccionado.creadoPorNombre}</Text>
                </View>

                {registroSeleccionado.estado === 'REALIZADO' && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>✅ Realizado por</Text>
                    <Text style={styles.detalleValue}>{registroSeleccionado.realizadoPorNombre}</Text>
                  </View>
                )}

                {registroSeleccionado.estado === 'ANULADO' && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>❌ Anulado por</Text>
                    <Text style={styles.detalleValue}>{registroSeleccionado.anuladoPorNombre}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cerrarModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cerrarModalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#2D3436',
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    fontSize: 16,
  },
  resultadosContainer: {
    flex: 1,
    padding: 15,
  },
  resultadosCount: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTipo: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  cardCodigo: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  cardFecha: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  cardCreadoPor: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  detalleSection: {
    marginBottom: 12,
  },
  detalleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 2,
  },
  detalleValue: {
    fontSize: 15,
    color: '#2D3436',
  },
  estadoBadgeDetalle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cerrarModalButton: {
    backgroundColor: '#6C5CE7',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  cerrarModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BuscarDesRec;