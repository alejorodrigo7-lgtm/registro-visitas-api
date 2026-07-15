import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AsistenciaScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [asistencia, setAsistencia] = useState({
    hora_entrada: null,
    hora_inicio_almuerzo: null,
    hora_fin_almuerzo: null,
    hora_salida: null,
    estado: 'Pendiente',
    fechaStr: '',
  });
  const [ubicacion, setUbicacion] = useState(null);
  const [ausenciasPendientes, setAusenciasPendientes] = useState([]);
  const [ubicacionesPermitidas, setUbicacionesPermitidas] = useState([]);

  useEffect(() => {
    cargarAsistenciaHoy();
    cargarUbicacionesPermitidas();
  }, []);

  const cargarAsistenciaHoy = async () => {
    setLoading(true);
    try {
      const response = await api.get('/asistencia/hoy');
      setAsistencia(response.data.data);
      setAusenciasPendientes(response.data.ausenciasPendientes || []);
    } catch (error) {
      console.error('Error cargando asistencia:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarUbicacionesPermitidas = async () => {
    try {
      const response = await api.get('/asistencia/ubicaciones');
      setUbicacionesPermitidas(response.data.data || []);
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    }
  };

  const obtenerUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para registrar asistencia');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let address = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = `${addr.street || ''} ${addr.name || ''}, ${addr.district || ''}, ${addr.city || ''}`.trim();
        }
      } catch (geoError) {
        console.log('Error geocodificando:', geoError);
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address || `Lat: ${location.coords.latitude.toFixed(6)}, Lng: ${location.coords.longitude.toFixed(6)}`,
      };
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Activa el GPS.');
      return null;
    }
  };

  const registrar = async (tipo) => {
    const ubicacionActual = await obtenerUbicacion();
    if (!ubicacionActual) return;

    setLoading(true);
    try {
      const response = await api.post('/asistencia', {
        tipo: tipo,
        ubicacion: ubicacionActual,
      });

      Alert.alert('✅ Éxito', response.data.message);

      if (response.data.ausenciasPendientes > 0) {
        Alert.alert(
          '📝 Ausencias Pendientes',
          `Tienes ${response.data.ausenciasPendientes} solicitud(es) de ausencia pendiente(s) para hoy.`,
          [
            { text: 'Ver', onPress: () => navigation.navigate('PedirAusenciaScreen') },
            { text: 'Cerrar' },
          ]
        );
      }

      cargarAsistenciaHoy();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Completo') return '#00B894';
    if (estado === 'Incompleto') return '#E17055';
    return '#FDCB6E';
  };

  const getEstadoIcon = (estado) => {
    if (estado === 'Completo') return 'checkmark-circle';
    if (estado === 'Incompleto') return 'close-circle';
    return 'time-outline';
  };

  const isRegistrado = (hora) => {
    return hora !== null && hora !== undefined && hora !== '';
  };

  if (loading && !asistencia.fechaStr) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando asistencia...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 Asistencia</Text>
        <Text style={styles.subtitle}>Registra tu jornada laboral</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Fecha y Estado */}
        <View style={styles.fechaContainer}>
          <Text style={styles.fechaText}>📅 {asistencia.fechaStr || new Date().toISOString().split('T')[0]}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(asistencia.estado) }]}>
            <Ionicons name={getEstadoIcon(asistencia.estado)} size={16} color="#FFFFFF" />
            <Text style={styles.estadoText}>{asistencia.estado || 'Pendiente'}</Text>
          </View>
        </View>

        {/* Ubicaciones Permitidas */}
        <View style={styles.ubicacionesContainer}>
          <Text style={styles.ubicacionesTitle}>📍 Ubicaciones Permitidas</Text>
          {ubicacionesPermitidas.map((ub, index) => (
            <View key={index} style={styles.ubicacionItem}>
              <Ionicons name="location-outline" size={16} color="#0984E3" />
              <Text style={styles.ubicacionText}>{ub.nombre}</Text>
              <Text style={styles.ubicacionDistancia}>Radio: {ub.radio}m</Text>
            </View>
          ))}
        </View>

        {/* Ausencias Pendientes */}
        {ausenciasPendientes.length > 0 && (
          <View style={styles.ausenciasContainer}>
            <Text style={styles.ausenciasTitle}>📝 Ausencias Pendientes</Text>
            {ausenciasPendientes.map((aus, index) => (
              <View key={index} style={styles.ausenciaItem}>
                <Text style={styles.ausenciaTipo}>• {aus.tipo}</Text>
                <Text style={styles.ausenciaMotivo}>{aus.motivo}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.verAusenciasButton}
              onPress={() => navigation.navigate('PedirAusenciaScreen')}
            >
              <Text style={styles.verAusenciasButtonText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botones de Registro */}
        <View style={styles.botonesContainer}>
          <Text style={styles.botonesTitle}>⏰ Registrar</Text>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_entrada) ? styles.botonRegistrado : styles.botonPendiente,
            ]}
            onPress={() => registrar('entrada')}
            disabled={isRegistrado(asistencia.hora_entrada) || loading}
          >
            <View style={styles.botonIconContainer}>
              <Ionicons
                name={isRegistrado(asistencia.hora_entrada) ? 'checkmark-circle' : 'enter-outline'}
                size={24}
                color={isRegistrado(asistencia.hora_entrada) ? '#00B894' : '#FFFFFF'}
              />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={styles.botonTitulo}>🟢 Entrada</Text>
              {isRegistrado(asistencia.hora_entrada) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_entrada}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>Registrar hora de entrada</Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_entrada) && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_inicio_almuerzo) ? styles.botonRegistrado : styles.botonPendiente,
            ]}
            onPress={() => registrar('inicio_almuerzo')}
            disabled={isRegistrado(asistencia.hora_inicio_almuerzo) || loading}
          >
            <View style={styles.botonIconContainer}>
              <Ionicons
                name={isRegistrado(asistencia.hora_inicio_almuerzo) ? 'checkmark-circle' : 'restaurant-outline'}
                size={24}
                color={isRegistrado(asistencia.hora_inicio_almuerzo) ? '#00B894' : '#FFFFFF'}
              />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={styles.botonTitulo}>🍽️ Inicio Almuerzo</Text>
              {isRegistrado(asistencia.hora_inicio_almuerzo) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_inicio_almuerzo}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>Registrar inicio de almuerzo</Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_inicio_almuerzo) && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_fin_almuerzo) ? styles.botonRegistrado : styles.botonPendiente,
            ]}
            onPress={() => registrar('fin_almuerzo')}
            disabled={isRegistrado(asistencia.hora_fin_almuerzo) || loading}
          >
            <View style={styles.botonIconContainer}>
              <Ionicons
                name={isRegistrado(asistencia.hora_fin_almuerzo) ? 'checkmark-circle' : 'restaurant-outline'}
                size={24}
                color={isRegistrado(asistencia.hora_fin_almuerzo) ? '#00B894' : '#FFFFFF'}
              />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={styles.botonTitulo}>🍽️ Fin Almuerzo</Text>
              {isRegistrado(asistencia.hora_fin_almuerzo) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_fin_almuerzo}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>Registrar fin de almuerzo</Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_fin_almuerzo) && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_salida) ? styles.botonRegistrado : styles.botonPendiente,
            ]}
            onPress={() => registrar('salida')}
            disabled={isRegistrado(asistencia.hora_salida) || loading}
          >
            <View style={styles.botonIconContainer}>
              <Ionicons
                name={isRegistrado(asistencia.hora_salida) ? 'checkmark-circle' : 'exit-outline'}
                size={24}
                color={isRegistrado(asistencia.hora_salida) ? '#00B894' : '#FFFFFF'}
              />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={styles.botonTitulo}>🔴 Salida</Text>
              {isRegistrado(asistencia.hora_salida) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_salida}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>Registrar hora de salida</Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_salida) && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>• Solo puedes registrar cada evento una vez al día</Text>
          <Text style={styles.infoText}>• Debes estar dentro del radio permitido (500m)</Text>
          <Text style={styles.infoText}>• La hora se toma automáticamente del sistema</Text>
          <Text style={styles.infoText}>• Si no puedes registrar, usa "Pedir Ausencia"</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={cargarAsistenciaHoy}
        >
          <Ionicons name="refresh-outline" size={20} color="#6C5CE7" />
          <Text style={styles.refreshButtonText}>Actualizar</Text>
        </TouchableOpacity>
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
    backgroundColor: '#00B894',
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
  content: {
    flex: 1,
    padding: 15,
  },
  fechaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fechaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  estadoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ubicacionesContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ubicacionesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  ubicacionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  ubicacionText: {
    fontSize: 13,
    color: '#2D3436',
    flex: 1,
  },
  ubicacionDistancia: {
    fontSize: 12,
    color: '#636E72',
  },
  ausenciasContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  ausenciasTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E17055',
    marginBottom: 8,
  },
  ausenciaItem: {
    paddingVertical: 4,
  },
  ausenciaTipo: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D3436',
  },
  ausenciaMotivo: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 16,
  },
  verAusenciasButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E17055',
    borderRadius: 8,
    alignItems: 'center',
  },
  verAusenciasButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  botonesContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  botonesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  botonRegistro: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  botonPendiente: {
    backgroundColor: '#6C5CE7',
  },
  botonRegistrado: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  botonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonTextContainer: {
    flex: 1,
  },
  botonTitulo: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  botonSubTitulo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  botonHora: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00B894',
  },
  infoContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#636E72',
    marginVertical: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    gap: 8,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
});

export default AsistenciaScreen;