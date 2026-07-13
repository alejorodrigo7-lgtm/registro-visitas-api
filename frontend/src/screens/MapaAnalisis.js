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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MapaAnalisis = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [region, setRegion] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      if (usuariosFiltrados.length > 0) {
        setSelectedUser(usuariosFiltrados[0]._id);
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    }
  };

  const buscarUbicaciones = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Selecciona un usuario');
      return;
    }

    setLoading(true);
    try {
      const fechaStr = fecha.toISOString().split('T')[0];
      const response = await api.get(`/mapas/ubicaciones?usuarioId=${selectedUser}&fecha=${fechaStr}`);
      
      setUbicaciones(response.data.data || []);
      
      if (response.data.data.length > 0) {
        // Centrar mapa en el primer punto
        const primera = response.data.data[0];
        setRegion({
          latitude: primera.coordenadas.coordinates[1],
          longitude: primera.coordenadas.coordinates[0],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        Alert.alert('Sin datos', 'No hay ubicaciones registradas para esta fecha');
      }
    } catch (error) {
      console.error('Error al buscar ubicaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (date) => {
    return date.toLocaleDateString('es-ES');
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
        <Text style={styles.title}>📊 Mapa Análisis</Text>
        <Text style={styles.subtitle}>Puntos visitados por usuario</Text>
      </View>

      <View style={styles.filtrosContainer}>
        <Text style={styles.label}>Usuario</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedUser}
            onValueChange={setSelectedUser}
            style={styles.picker}
          >
            {usuarios.map((u) => (
              <Picker.Item key={u._id} label={`${u.nombre} (${u.rol})`} value={u._id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Fecha</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>{formatFecha(fecha)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={fecha}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setFecha(selectedDate);
            }}
          />
        )}

        <TouchableOpacity style={styles.buscarButton} onPress={buscarUbicaciones}>
          <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
        </TouchableOpacity>

        {ubicaciones.length > 0 && (
          <Text style={styles.contador}>
            📍 {ubicaciones.length} puntos encontrados
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
            {ubicaciones.map((item, index) => (
              <Marker
                key={item._id}
                coordinate={{
                  latitude: item.coordenadas.coordinates[1],
                  longitude: item.coordenadas.coordinates[0],
                }}
                title={`Punto ${index + 1}`}
                description={item.direccion || 'Sin dirección'}
                pinColor={index === 0 ? '#00B894' : '#6C5CE7'}
              />
            ))}
            {ubicaciones.length > 1 && (
              <Polyline
                coordinates={ubicaciones.map(item => ({
                  latitude: item.coordenadas.coordinates[1],
                  longitude: item.coordenadas.coordinates[0],
                }))}
                strokeColor="#6C5CE7"
                strokeWidth={3}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.mapaPlaceholder}>
            <Text style={styles.mapaPlaceholderText}>🗺️</Text>
            <Text style={styles.mapaPlaceholderSub}>
              Selecciona un usuario y fecha para ver los puntos
            </Text>
          </View>
        )}
      </View>

      {/* Lista de puntos */}
      {ubicaciones.length > 0 && (
        <TouchableOpacity
          style={styles.verListaButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.verListaButtonText}>📋 Ver lista de puntos</Text>
        </TouchableOpacity>
      )}

      {/* Modal de lista de puntos */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📍 Puntos visitados</Text>
            <ScrollView style={styles.modalLista}>
              {ubicaciones.map((item, index) => (
                <View key={item._id} style={styles.modalItem}>
                  <Text style={styles.modalItemIndex}>#{index + 1}</Text>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemHora}>
                      {new Date(item.fecha).toLocaleTimeString('es-ES')}
                    </Text>
                    <Text style={styles.modalItemCoords}>
                      {item.coordenadas.coordinates[1].toFixed(6)},
                      {item.coordenadas.coordinates[0].toFixed(6)}
                    </Text>
                    {item.direccion && (
                      <Text style={styles.modalItemDireccion}>{item.direccion}</Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 5,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  dateInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#2D3436',
  },
  buscarButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  verListaButton: {
    backgroundColor: '#00B894',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  verListaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalLista: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
    width: 40,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemHora: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  modalItemCoords: {
    fontSize: 12,
    color: '#636E72',
  },
  modalItemDireccion: {
    fontSize: 12,
    color: '#0984E3',
    marginTop: 2,
  },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#2D3436',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MapaAnalisis;