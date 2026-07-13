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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MapaReal = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [region, setRegion] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/auth/usuarios');
      const usuariosFiltrados = response.data.data.filter(
        u => u.rol === 'Tecnico' || u.rol === 'Coordinador'
      );
      setUsuarios(usuariosFiltrados);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else if (selectedUsers.length >= 5) {
      Alert.alert('Límite alcanzado', 'Máximo 5 usuarios permitidos');
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const buscarUbicaciones = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un usuario');
      return;
    }

    setLoading(true);
    try {
      const usuariosStr = selectedUsers.join(',');
      const response = await api.get(`/mapas/ubicaciones/reales?usuarios=${usuariosStr}`);
      
      setUbicaciones(response.data.data || []);
      
      // Centrar mapa en el primer usuario con ubicación
      const primera = response.data.data.find(u => u.ultimaUbicacion);
      if (primera) {
        setRegion({
          latitude: primera.ultimaUbicacion.coordenadas.coordinates[1],
          longitude: primera.ultimaUbicacion.coordenadas.coordinates[0],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Error al buscar ubicaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const actualizarUbicaciones = () => {
    setRefreshing(true);
    buscarUbicaciones();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getColorPorUsuario = (index) => {
    const colors = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#0984E3'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Mapa Real</Text>
        <Text style={styles.subtitle}>Ubicación en tiempo real de usuarios</Text>
      </View>

      <View style={styles.filtrosContainer}>
        <Text style={styles.label}>Selecciona usuarios (máx 5)</Text>
        <ScrollView style={styles.usuariosLista}>
          {usuarios.map((u) => (
            <TouchableOpacity
              key={u._id}
              style={[
                styles.usuarioItem,
                selectedUsers.includes(u._id) && styles.usuarioItemSelected,
              ]}
              onPress={() => toggleUser(u._id)}
            >
              <Text style={[
                styles.usuarioItemText,
                selectedUsers.includes(u._id) && styles.usuarioItemTextSelected,
              ]}>
                {u.nombre} ({u.rol})
              </Text>
              {selectedUsers.includes(u._id) && (
                <Text style={styles.usuarioItemCheck}>✅</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.botonesContainer}>
          <TouchableOpacity style={styles.buscarButton} onPress={buscarUbicaciones}>
            <Text style={styles.buscarButtonText}>📍 Buscar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refrescarButton} onPress={actualizarUbicaciones}>
            <Text style={styles.refrescarButtonText}>🔄 Actualizar</Text>
          </TouchableOpacity>
        </View>

        {ubicaciones.length > 0 && (
          <Text style={styles.contador}>
            👤 {ubicaciones.filter(u => u.ultimaUbicacion).length} usuarios activos
          </Text>
        )}
      </View>

      {/* Mapa */}
      <View style={styles.mapaContainer}>
        {region ? (
          <MapView
            style={styles.mapa}
            region={region}
            showsUserLocation={true}
          >
            {ubicaciones.map((item, index) => {
              if (!item.ultimaUbicacion) return null;
              const color = getColorPorUsuario(index);
              return (
                <Marker
                  key={item.usuario._id}
                  coordinate={{
                    latitude: item.ultimaUbicacion.coordenadas.coordinates[1],
                    longitude: item.ultimaUbicacion.coordenadas.coordinates[0],
                  }}
                  title={item.usuario.nombre}
                  description={`${item.activo ? '🟢 Activo' : '🔴 Inactivo'} - ${new Date(item.ultimaUbicacion.fecha).toLocaleTimeString('es-ES')}`}
                  pinColor={item.activo ? color : '#FF6B6B'}
                />
              );
            })}
          </MapView>
        ) : (
          <View style={styles.mapaPlaceholder}>
            <Text style={styles.mapaPlaceholderText}>🗺️</Text>
            <Text style={styles.mapaPlaceholderSub}>
              Selecciona usuarios y busca para ver su ubicación
            </Text>
          </View>
        )}
      </View>

      {/* Leyenda */}
      {ubicaciones.filter(u => u.ultimaUbicacion).length > 0 && (
        <View style={styles.leyendaContainer}>
          <Text style={styles.leyendaTitle}>👤 Usuarios activos:</Text>
          <ScrollView horizontal style={styles.leyendaLista}>
            {ubicaciones.map((item, index) => {
              if (!item.ultimaUbicacion) return null;
              const color = getColorPorUsuario(index);
              return (
                <View key={item.usuario._id} style={styles.leyendaItem}>
                  <View style={[styles.leyendaColor, { backgroundColor: color }]} />
                  <Text style={styles.leyendaNombre}>{item.usuario.nombre}</Text>
                  <Text style={styles.leyendaEstado}>
                    {item.activo ? '🟢' : '🔴'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
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
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
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
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 10,
  },
  usuariosLista: {
    maxHeight: 120,
    marginBottom: 10,
  },
  usuarioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 5,
  },
  usuarioItemSelected: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  usuarioItemText: {
    fontSize: 14,
    color: '#2D3436',
  },
  usuarioItemTextSelected: {
    color: '#6C5CE7',
    fontWeight: '500',
  },
  usuarioItemCheck: {
    fontSize: 16,
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  buscarButton: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refrescarButton: {
    flex: 1,
    backgroundColor: '#00B894',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  refrescarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contador: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 10,
    textAlign: 'center',
  },
  mapaContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F0FE',
  },
  mapa: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapaPlaceholderText: {
    fontSize: 50,
    marginBottom: 10,
  },
  mapaPlaceholderSub: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
  },
  leyendaContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  leyendaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 5,
  },
  leyendaLista: {
    flexDirection: 'row',
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  leyendaColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  leyendaNombre: {
    fontSize: 12,
    color: '#2D3436',
    marginRight: 3,
  },
  leyendaEstado: {
    fontSize: 12,
  },
});

export default MapaReal;