import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TextInput  // ✅ AGREGADO
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Retirados = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const cargarRetirados = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recuperacion/ordenes/estado/retirado');
      if (res.data.success) {
        let data = res.data.data;
        if (user?.rol === 'Coordinador') {
          data = data.filter(o => o.coordinadorAsignado?._id === user._id);
        }
        setOrdenes(data);
        setFilteredOrdenes(data);
      }
    } catch (error) {
      console.error('Error cargando retirados:', error);
      Alert.alert('Error', 'No se pudieron cargar los retirados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRetirados();
  }, []);

  // Filtrar por búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrdenes(ordenes);
    } else {
      const filtered = ordenes.filter(o =>
        o.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrdenes(filtered);
    }
  }, [searchTerm, ordenes]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCliente}>{item.cliente.nombre}</Text>
        <Text style={styles.cardCodigo}>Código: {item.cliente.codigo}</Text>
      </View>
      <Text style={styles.cardInfo}>📶 MAC: {item.mac}</Text>
      <Text style={styles.cardInfo}>✅ Retirado</Text>
      <Text style={styles.cardInfo}>👤 Coordinador: {item.coordinadorAsignado?.nombre || 'N/A'}</Text>
      <Text style={styles.cardInfo}>📅 Subida: {new Date(item.fechaSubida).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✅ Retirados</Text>
        <TouchableOpacity onPress={cargarRetirados}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente..."
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
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : filteredOrdenes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No hay órdenes retiradas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrdenes}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF1',
    height: 40,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#2D3436' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#636E72' },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12, textAlign: 'center' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  cardCodigo: { fontSize: 13, color: '#636E72' },
  cardInfo: { fontSize: 14, color: '#555', marginVertical: 2 },
});

export default Retirados;