import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Ejecucion = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const cargarPendientes = async () => {
    try {
      console.log('📋 Cargando pendientes de desconexiones/reconexiones...');
      const response = await api.get('/desconexiones/pendientes');
      setPendientes(response.data.data || []);
      console.log(`✅ ${response.data.data?.length || 0} pendientes encontrados`);
    } catch (error) {
      console.error('❌ Error cargando pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const handleRealizado = async (id, tipo, cliente) => {
    Alert.alert(
      '✅ Realizar',
      `¿Confirmas que se ha ${tipo === 'DESCONEXION' ? 'desconectado' : 'reconectado'} a ${cliente}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Realizado',
          onPress: async () => {
            try {
              await api.put(`/desconexiones/${id}/realizado`);
              
              // 📱 Notificar al creador
              Alert.alert('✅ Éxito', `Registro marcado como realizado. Se ha notificado al creador.`);
              cargarPendientes();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al realizar');
            }
          },
        },
      ]
    );
  };

  const handleAnular = async (id, cliente) => {
    Alert.alert(
      '❌ Anular',
      `¿Estás seguro de anular el registro de ${cliente}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/desconexiones/${id}/anulado`);
              Alert.alert('✅ Éxito', 'Registro anulado correctamente');
              cargarPendientes();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al anular');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarPendientes();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getTipoColor = (tipo) => {
    return tipo === 'DESCONEXION' ? '#FF6B6B' : '#00B894';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'DESCONEXION' ? 'power-outline' : 'reload-outline';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando pendientes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>3️⃣ Ejecución</Text>
        <Text style={styles.subtitle}>
          {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {pendientes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#00B894" />
            <Text style={styles.emptyTitle}>No hay pendientes</Text>
            <Text style={styles.emptyText}>Todos los registros están completos</Text>
          </View>
        ) : (
          pendientes.map((item) => (
            <View key={item._id} style={[styles.card, { borderLeftColor: getTipoColor(item.tipo) }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTipoContainer}>
                  <Ionicons name={getTipoIcon(item.tipo)} size={18} color={getTipoColor(item.tipo)} />
                  <Text style={[styles.cardTipo, { color: getTipoColor(item.tipo) }]}>
                    {item.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔗 Reconexión'}
                  </Text>
                </View>
                <Text style={styles.cardFecha}>
                  📅 {new Date(item.fecha).toLocaleDateString('es-ES')}
                </Text>
              </View>

              <Text style={styles.cardCliente}>👤 {item.cliente}</Text>
              <Text style={styles.cardCodigo}>📋 Código: {item.codigoCliente}</Text>

              {item.observaciones && (
                <Text style={styles.cardObs}>📝 {item.observaciones}</Text>
              )}

              <Text style={styles.cardCreadoPor}>
                👤 Creado por: {item.creadoPorNombre}
              </Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.realizadoButton]}
                  onPress={() => handleRealizado(item._id, item.tipo, item.cliente)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Realizado</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.anuladoButton]}
                  onPress={() => handleAnular(item._id, item.cliente)}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Anular</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
    fontSize: 16,
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
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
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
    gap: 6,
  },
  cardTipo: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardFecha: {
    fontSize: 12,
    color: '#636E72',
  },
  cardCliente: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  cardCodigo: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  cardObs: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardCreadoPor: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  realizadoButton: {
    backgroundColor: '#00B894',
  },
  anuladoButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default Ejecucion;