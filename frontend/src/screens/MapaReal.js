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
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MapaReal = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [region, setRegion] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

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

  // ✅ FUNCIÓN PARA CALCULAR TIEMPO DESDE ÚLTIMA UBICACIÓN
  const calcularTiempoDesde = (fecha) => {
    if (!fecha) return 'Sin ubicación';
    
    const ahora = new Date();
    const ultima = new Date(fecha);
    const diffMs = ahora - ultima;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffMin < 1) return 'Hace menos de 1 minuto';
    if (diffMin < 60) return `Hace ${diffMin} minutos`;
    if (diffHoras < 24) return `Hace ${diffHoras} horas`;
    return `Hace ${diffDias} días`;
  };

  // ✅ FUNCIÓN PARA VERIFICAR SI ESTÁ ACTIVO (menos de 15 minutos)
  const estaActivo = (fecha) => {
    if (!fecha) return false;
    const ahora = new Date();
    const ultima = new Date(fecha);
    const diffMs = ahora - ultima;
    const diffMin = Math.floor(diffMs / 60000);
    return diffMin < 15;
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
      
      const data = response.data.data || [];
      setUbicaciones(data);
      setUltimaActualizacion(new Date());
      
      // Centrar mapa en el primer usuario con ubicación
      const primera = data.find(u => u.ultimaUbicacion);
      if (primera) {
        const lat = primera.ultimaUbicacion.coordenadas.coordinates[1];
        const lng = primera.ultimaUbicacion.coordenadas.coordinates[0];
        if (!isNaN(lat) && !isNaN(lng)) {
          setRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
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

  // ✅ Filtrar usuarios con ubicación
  const usuariosConUbicacion = ubicaciones.filter(u => u.ultimaUbicacion);
  const usuariosActivos = usuariosConUbicacion.filter(u => estaActivo(u.ultimaUbicacion?.fecha));

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
        {ultimaActualizacion && (
          <Text style={styles.updateTime}>
            Última actualización: {ultimaActualizacion.toLocaleTimeString('es-ES')}
          </Text>
        )}
      </View>

      <View style={styles.filtrosContainer}>
        <View style={styles.filtrosHeader}>
          <Text style={styles.label}>Selecciona usuarios (máx 5)</Text>
          <Text style={styles.usuariosCount}>
            {selectedUsers.length} / 5 seleccionados
          </Text>
        </View>
        
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
            <Ionicons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.buscarButtonText}> Buscar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refrescarButton} onPress={actualizarUbicaciones}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.refrescarButtonText}> Actualizar</Text>
          </TouchableOpacity>
        </View>

        {usuariosConUbicacion.length > 0 && (
          <View style={styles.estadoContainer}>
            <Text style={styles.contador}>
              👤 {usuariosConUbicacion.length} usuarios con ubicación
            </Text>
            <Text style={styles.contadorActivos}>
              🟢 {usuariosActivos.length} activos (últimos 15 min)
            </Text>
          </View>
        )}
      </View>

      {/* Mapa */}
      <View style={styles.mapaContainer}>
        {region && usuariosConUbicacion.length > 0 ? (
          <MapView
            style={styles.mapa}
            region={region}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
          >
            {usuariosConUbicacion.map((item, index) => {
              const color = getColorPorUsuario(index);
              const lat = item.ultimaUbicacion.coordenadas.coordinates[1];
              const lng = item.ultimaUbicacion.coordenadas.coordinates[0];
              const activo = estaActivo(item.ultimaUbicacion.fecha);
              const tiempo = calcularTiempoDesde(item.ultimaUbicacion.fecha);
              
              return (
                <Marker
                  key={item.usuario?._id || index}
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={item.usuario?.nombre || 'Usuario'}
                  description={`${activo ? '🟢 Activo' : '🔴 Inactivo'} - ${tiempo}`}
                  pinColor={activo ? color : '#FF6B6B'}
                >
                  <View style={styles.markerContainer}>
                    <View style={[styles.markerDot, { backgroundColor: activo ? color : '#FF6B6B' }]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <View style={styles.mapaPlaceholder}>
            <Text style={styles.mapaPlaceholderText}>🗺️</Text>
            <Text style={styles.mapaPlaceholderSub}>
              {selectedUsers.length > 0 
                ? 'Los usuarios seleccionados no tienen ubicación disponible'
                : 'Selecciona usuarios y busca para ver su ubicación'}
            </Text>
          </View>
        )}
      </View>

      {/* Leyenda de usuarios activos */}
      {usuariosConUbicacion.length > 0 && (
        <View style={styles.leyendaContainer}>
          <Text style={styles.leyendaTitle}>
            👤 Usuarios ({usuariosActivos.length} activos / {usuariosConUbicacion.length} total)
          </Text>
          <ScrollView horizontal style={styles.leyendaLista}>
            {usuariosConUbicacion.map((item, index) => {
              const color = getColorPorUsuario(index);
              const activo = estaActivo(item.ultimaUbicacion?.fecha);
              const tiempo = calcularTiempoDesde(item.ultimaUbicacion?.fecha);
              
              return (
                <View key={item.usuario?._id || index} style={styles.leyendaItem}>
                  <View style={[styles.leyendaColor, { backgroundColor: activo ? color : '#FF6B6B' }]} />
                  <Text style={styles.leyendaNombre}>
                    {item.usuario?.nombre || 'Usuario'}
                  </Text>
                  <Text style={styles.leyendaTiempo}>
                    {tiempo}
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
  updateTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
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
  filtrosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  usuariosCount: {
    fontSize: 12,
    color: '#636E72',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  refrescarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 12,
    borderRadius: 10,
  },
  refrescarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  estadoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  contador: {
    fontSize: 14,
    color: '#636E72',
  },
  contadorActivos: {
    fontSize: 14,
    color: '#00B894',
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  leyendaColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  leyendaNombre: {
    fontSize: 12,
    color: '#2D3436',
    marginRight: 3,
    fontWeight: '500',
  },
  leyendaTiempo: {
    fontSize: 10,
    color: '#636E72',
  },
  leyendaEstado: {
    fontSize: 12,
  },
});

export default MapaReal;