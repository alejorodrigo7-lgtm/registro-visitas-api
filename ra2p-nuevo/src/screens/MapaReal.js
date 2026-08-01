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
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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
  const [mapError, setMapError] = useState(null);

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
    setMapError(null);
    try {
      const usuariosStr = selectedUsers.join(',');
      const response = await api.get(`/mapas/ubicaciones/reales?usuarios=${usuariosStr}`);
      
      const data = response.data.data || [];
      setUbicaciones(data);
      
      const primera = data.find(u => 
        u.ultimaUbicacion && 
        u.ultimaUbicacion.coordenadas && 
        u.ultimaUbicacion.coordenadas.coordinates && 
        u.ultimaUbicacion.coordenadas.coordinates.length >= 2
      );
      
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
      setMapError('No se pudieron cargar las ubicaciones. Verifica tu conexión.');
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

  // ✅ Calcular tiempo desde última ubicación
  const calcularTiempoDesde = (fecha) => {
    if (!fecha) return 'Sin ubicación';
    
    const ahora = new Date();
    const ultima = new Date(fecha);
    const diffMs = ahora - ultima;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    return `Hace ${diffDias} d`;
  };

  // ✅ Abrir Google Maps con las coordenadas
  const abrirEnGoogleMaps = (lat, lng, nombre) => {
    const url = Platform.select({
      ios: `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(nombre || 'Ubicación')}`,
      android: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    });
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir Google Maps');
    });
  };

  const isValidUbicacion = (item) => {
    if (!item) return false;
    if (!item.ultimaUbicacion) return false;
    if (!item.ultimaUbicacion.coordenadas) return false;
    if (!item.ultimaUbicacion.coordenadas.coordinates) return false;
    if (item.ultimaUbicacion.coordenadas.coordinates.length < 2) return false;
    
    const lat = item.ultimaUbicacion.coordenadas.coordinates[1];
    const lng = item.ultimaUbicacion.coordenadas.coordinates[0];
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat === 0 && lng === 0) return false;
    
    return true;
  };

  const ubicacionesValidas = ubicaciones.filter(item => isValidUbicacion(item));

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

        {ubicacionesValidas.length > 0 && (
          <Text style={styles.contador}>
            👤 {ubicacionesValidas.length} usuarios activos
          </Text>
        )}
      </View>

      <View style={styles.mapaContainer}>
        {mapError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{mapError}</Text>
            <TouchableOpacity style={styles.reintentarButton} onPress={buscarUbicaciones}>
              <Text style={styles.reintentarButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : region && ubicacionesValidas.length > 0 ? (
          <MapView
            style={styles.mapa}
            region={region}
            showsUserLocation={true}
            googleMapsApiKey="AQ.Ab8RN6Kn8LSOqYchqr9n9XFjKn7AVgHuUZ3YxKIEKNzKbLlrng"
            onError={(error) => {
              console.error('❌ Error en MapView:', error);
              setMapError('Error al cargar el mapa. Verifica tu conexión.');
            }}
          >
            {ubicacionesValidas.map((item, index) => {
              const color = getColorPorUsuario(index);
              const lat = item.ultimaUbicacion.coordenadas.coordinates[1];
              const lng = item.ultimaUbicacion.coordenadas.coordinates[0];
              
              return (
                <Marker
                  key={item.usuario?._id || index}
                  coordinate={{
                    latitude: lat,
                    longitude: lng,
                  }}
                  title={item.usuario?.nombre || 'Usuario'}
                  description={`${item.activo ? '🟢 Activo' : '🔴 Inactivo'} - ${calcularTiempoDesde(item.ultimaUbicacion.fecha)}`}
                  pinColor={item.activo ? color : '#FF6B6B'}
                  onPress={() => abrirEnGoogleMaps(lat, lng, item.usuario?.nombre)}
                />
              );
            })}
          </MapView>
        ) : (
          <View style={styles.mapaPlaceholder}>
            <Text style={styles.mapaPlaceholderText}>🗺️</Text>
            <Text style={styles.mapaPlaceholderSub}>
              {region ? 'No hay ubicaciones disponibles para mostrar' : 'Selecciona usuarios y busca para ver su ubicación'}
            </Text>
          </View>
        )}
      </View>

      {ubicacionesValidas.length > 0 && (
        <View style={styles.leyendaContainer}>
          <Text style={styles.leyendaTitle}>👤 Usuarios activos:</Text>
          <ScrollView horizontal style={styles.leyendaLista}>
            {ubicacionesValidas.map((item, index) => {
              const color = getColorPorUsuario(index);
              const lat = item.ultimaUbicacion.coordenadas.coordinates[1];
              const lng = item.ultimaUbicacion.coordenadas.coordinates[0];
              const usuarioNombre = item.usuario?.nombre || 'Usuario';
              
              return (
                <View key={item.usuario?._id || index} style={styles.leyendaItem}>
                  <View style={[styles.leyendaColor, { backgroundColor: color }]} />
                  <Text style={styles.leyendaNombre}>{item.usuario?.nombre || 'Usuario'}</Text>
                  <Text style={styles.leyendaEstado}>
                    {item.activo ? '🟢' : '🔴'}
                  </Text>
                  <Text style={styles.leyendaTiempo}>
                    {calcularTiempoDesde(item.ultimaUbicacion?.fecha)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.coordenadasLink}
                    onPress={() => abrirEnGoogleMaps(lat, lng, usuarioNombre)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="navigate-circle" size={14} color="#6C5CE7" />
                    <Text style={styles.coordenadasLinkText}>
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </Text>
                  </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 20,
  },
  reintentarButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: 150,
  },
  reintentarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
    paddingVertical: 5,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
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
    fontWeight: '500',
  },
  leyendaEstado: {
    fontSize: 12,
  },
  leyendaTiempo: {
    fontSize: 10,
    color: '#636E72',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  coordenadasLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
  },
  coordenadasLinkText: {
    fontSize: 10,
    color: '#6C5CE7',
    fontWeight: '500',
    marginLeft: 3,
  },
});

export default MapaReal;