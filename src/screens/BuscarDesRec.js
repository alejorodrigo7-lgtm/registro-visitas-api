import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BuscarDesRec = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const response = await api.get('/desconexiones/historial');
      if (response.data.success) {
        setSolicitudes(response.data.data);
        setFiltradas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscar = (texto) => {
    setBusqueda(texto);
    filtrar(texto, filtroEstado);
  };

  const filtrarPorEstado = (estado) => {
    setFiltroEstado(estado);
    filtrar(busqueda, estado);
  };

  const filtrar = (texto, estado) => {
    let resultados = solicitudes;
    
    if (texto.trim() !== '') {
      const busquedaLower = texto.toLowerCase().trim();
      resultados = resultados.filter(s => 
        (s.cliente || '').toLowerCase().includes(busquedaLower) ||
        (s.codigoCliente || '').toLowerCase().includes(busquedaLower)
      );
    }
    
    if (estado !== 'TODOS') {
      resultados = resultados.filter(s => s.estado === estado);
    }
    
    setFiltradas(resultados);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return '#FDCB6E';
      case 'EJECUTADO': return '#00B894';
      case 'RECHAZADO': return '#FF6B6B';
      default: return '#636E72';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'PENDIENTE': return 'time-outline';
      case 'EJECUTADO': return 'checkmark-circle-outline';
      case 'RECHAZADO': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  if (loading && solicitudes.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Buscar Desconexión/Reconexión</Text>
        <Text style={styles.subtitle}>Historial completo de gestiones</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#636E72" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente o código..."
          value={busqueda}
          onChangeText={buscar}
        />
        {busqueda !== '' && (
          <TouchableOpacity onPress={() => buscar('')}>
            <Ionicons name="close-circle" size={20} color="#636E72" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosContainer}>
        {['TODOS', 'PENDIENTE', 'EJECUTADO', 'RECHAZADO'].map((estado) => (
          <TouchableOpacity
            key={estado}
            style={[styles.filtroButton, filtroEstado === estado && styles.filtroButtonActive]}
            onPress={() => filtrarPorEstado(estado)}
          >
            <Text style={[styles.filtroText, filtroEstado === estado && styles.filtroTextActive]}>
              {estado === 'TODOS' ? '📋 Todos' : 
               estado === 'PENDIENTE' ? '⏳ Pendientes' :
               estado === 'EJECUTADO' ? '✅ Ejecutados' : '❌ Rechazados'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        {filtradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#B2BEC3" />
            <Text style={styles.emptyTitle}>No se encontraron resultados</Text>
            <Text style={styles.emptyText}>
              {busqueda ? 'Intenta con otra búsqueda' : 'No hay registros en el historial'}
            </Text>
          </View>
        ) : (
          filtradas.map((item) => (
            <View key={item._id} style={styles.historialCard}>
              <View style={styles.historialHeader}>
                <View style={styles.historialTipo}>
                  <Text style={styles.historialTipoText}>
                    {item.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión'}
                  </Text>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                  <Ionicons name={getEstadoIcon(item.estado)} size={14} color="#FFFFFF" />
                  <Text style={styles.estadoBadgeText}>{item.estado}</Text>
                </View>
              </View>

              <Text style={styles.historialCliente}>👤 {item.cliente || 'N/A'}</Text>
              <Text style={styles.historialInfo}>📋 Código: {item.codigoCliente || 'N/A'}</Text>
              <Text style={styles.historialInfo}>📅 {new Date(item.fecha).toLocaleDateString()}</Text>
              {item.observaciones && (
                <Text style={styles.historialObservacion}>📝 {item.observaciones}</Text>
              )}
              {item.observacion && (
                <Text style={styles.historialEjecucion}>📌 {item.observacion}</Text>
              )}

              <View style={styles.historialFooter}>
                <Text style={styles.historialUsuario}>
                  👤 {item.usuario?.nombre || 'N/A'}
                </Text>
                {item.ejecutadoPor && (
                  <Text style={styles.historialEjecutor}>
                    ✅ {item.ejecutadoPor.nombre}
                  </Text>
                )}
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
  header: {
    padding: 20,
    backgroundColor: '#6C5CE7',
    paddingTop: 40,
    paddingBottom: 20,
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
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3436',
  },
  filtrosContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  filtroButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  filtroButtonActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  filtroText: {
    color: '#636E72',
    fontSize: 12,
    fontWeight: '500',
  },
  filtroTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  historialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historialTipo: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historialTipoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2D3436',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  historialCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  historialInfo: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 2,
  },
  historialObservacion: {
    fontSize: 13,
    color: '#6C5CE7',
    marginTop: 4,
    fontStyle: 'italic',
  },
  historialEjecucion: {
    fontSize: 13,
    color: '#00B894',
    marginTop: 4,
  },
  historialFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  historialUsuario: {
    fontSize: 12,
    color: '#636E72',
  },
  historialEjecutor: {
    fontSize: 12,
    color: '#00B894',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
    textAlign: 'center',
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

export default BuscarDesRec;
