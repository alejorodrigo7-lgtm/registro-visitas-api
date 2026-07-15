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
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [siguientePaso, setSiguientePaso] = useState('entrada');
  const [siguientePasoNombre, setSiguientePasoNombre] = useState('Entrada');
  const [completado, setCompletado] = useState(false);
  const [ausenciasPendientes, setAusenciasPendientes] = useState([]);
  const [ubicacionesPermitidas, setUbicacionesPermitidas] = useState([]);
  const [fakeGpsDetectado, setFakeGpsDetectado] = useState(false);

  useEffect(() => {
    cargarAsistenciaHoy();
    cargarUbicacionesPermitidas();
  }, []);

  const cargarAsistenciaHoy = async () => {
    setLoading(true);
    try {
      const response = await api.get('/asistencia/hoy');
      setAsistencia(response.data.data);
      setSiguientePaso(response.data.siguientePaso || 'entrada');
      setSiguientePasoNombre(response.data.siguientePasoNombre || 'Entrada');
      setCompletado(response.data.siguientePaso === 'completado');
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

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000;
  };

  const verificarFakeGps = async (ubicacion) => {
    try {
      // Verificar precisión sospechosa
      if (ubicacion.accuracy !== undefined && ubicacion.accuracy < 5) {
        return { sospechoso: true, razon: 'Precisión de ubicación sospechosa (Fake GPS detectado)' };
      }

      // Verificar coordenadas (0,0)
      if (ubicacion.latitude === 0 && ubicacion.longitude === 0) {
        return { sospechoso: true, razon: 'Ubicación (0,0) inválida' };
      }

      // Verificar rangos de Ecuador
      if (ubicacion.latitude < -5 || ubicacion.latitude > 2 || 
          ubicacion.longitude < -82 || ubicacion.longitude > -74) {
        return { sospechoso: true, razon: 'Coordenadas fuera de Ecuador' };
      }

      // Verificar con ubicación anterior
      const ubicacionAnterior = await AsyncStorage.getItem('@ultima_ubicacion');
      if (ubicacionAnterior) {
        const anterior = JSON.parse(ubicacionAnterior);
        const distancia = calcularDistancia(
          ubicacion.latitude, ubicacion.longitude,
          anterior.latitude, anterior.longitude
        );
        // Si la distancia es menor a 1 metro y la precisión es igual, es sospechoso
        if (distancia < 1 && anterior.accuracy === ubicacion.accuracy) {
          return { sospechoso: true, razon: 'Ubicación congelada (Fake GPS detectado)' };
        }
      }

      // Guardar ubicación actual para próxima comparación
      await AsyncStorage.setItem('@ultima_ubicacion', JSON.stringify({
        latitude: ubicacion.latitude,
        longitude: ubicacion.longitude,
        accuracy: ubicacion.accuracy,
        timestamp: new Date().toISOString()
      }));

      return { sospechoso: false };
    } catch (error) {
      console.error('Error verificando Fake GPS:', error);
      return { sospechoso: false };
    }
  };

  const obtenerUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para registrar entrada y salida');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000,
      });

      // 🔥 VERIFICAR FAKE GPS
      const verificacion = await verificarFakeGps(location.coords);
      if (verificacion.sospechoso) {
        Alert.alert(
          '⚠️ Fake GPS Detectado',
          `${verificacion.razon}\n\nPor favor, desactiva cualquier aplicación de Fake GPS e intenta nuevamente.`,
          [
            { text: 'Entendido', style: 'default' },
          ]
        );
        setFakeGpsDetectado(true);
        return null;
      }

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
        accuracy: location.coords.accuracy,
        address: address || `Lat: ${location.coords.latitude.toFixed(6)}, Lng: ${location.coords.longitude.toFixed(6)}`,
      };
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Activa el GPS.');
      return null;
    }
  };

  const registrar = async (tipo) => {
    if (completado) {
      Alert.alert('✅ Jornada Completada', 'Ya completaste tu jornada de hoy. ¡Excelente trabajo!');
      return;
    }

    if (tipo !== siguientePaso) {
      Alert.alert('⚠️ Paso Incorrecto', `Debes registrar "${siguientePasoNombre}" primero.`);
      return;
    }

    let ubicacionActual = null;
    
    if (tipo === 'entrada' || tipo === 'salida') {
      ubicacionActual = await obtenerUbicacion();
      if (!ubicacionActual) return;
    }

    setLoading(true);
    try {
      const response = await api.post('/asistencia', {
        tipo: tipo,
        ubicacion: ubicacionActual,
      });

      Alert.alert('✅ Éxito', response.data.message);

      if (response.data.completado) {
        setCompletado(true);
        Alert.alert('🎉 Felicitaciones', '¡Has completado tu jornada de hoy!');
      }

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

  const getPasoIcon = (paso) => {
    const iconos = {
      'entrada': 'enter-outline',
      'inicio_almuerzo': 'restaurant-outline',
      'fin_almuerzo': 'restaurant-outline',
      'salida': 'exit-outline',
    };
    return iconos[paso] || 'time-outline';
  };

  const getPasoColor = (paso) => {
    const colores = {
      'entrada': '#00B894',
      'inicio_almuerzo': '#FDCB6E',
      'fin_almuerzo': '#FDCB6E',
      'salida': '#E17055',
    };
    return colores[paso] || '#6C5CE7';
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
        {fakeGpsDetectado && (
          <View style={styles.fakeGpsWarning}>
            <Ionicons name="warning" size={20} color="#FF6B6B" />
            <Text style={styles.fakeGpsWarningText}>⚠️ Fake GPS Detectado</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.fechaContainer}>
          <Text style={styles.fechaText}>📅 {asistencia.fechaStr || new Date().toISOString().split('T')[0]}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: completado ? '#00B894' : getEstadoColor(asistencia.estado) }]}>
            <Ionicons name={completado ? 'checkmark-circle' : getEstadoIcon(asistencia.estado)} size={16} color="#FFFFFF" />
            <Text style={styles.estadoText}>
              {completado ? 'Completado 🎉' : (asistencia.estado || 'Pendiente')}
            </Text>
          </View>
        </View>

        <View style={styles.progresoContainer}>
          <Text style={styles.progresoTitle}>📊 Progreso</Text>
          <View style={styles.progresoBarra}>
            <View style={[styles.progresoFill, { 
              width: `${
                (Object.values(asistencia).filter(v => v !== null && v !== '' && typeof v === 'string' && v.includes(':')).length / 4) * 100
              }%` 
            }]} />
          </View>
          <Text style={styles.progresoText}>
            Paso actual: <Text style={styles.progresoPaso}>{siguientePasoNombre}</Text>
          </Text>
        </View>

        <View style={styles.ubicacionesContainer}>
          <Text style={styles.ubicacionesTitle}>📍 Ubicaciones Permitidas (Entrada/Salida)</Text>
          {ubicacionesPermitidas.map((ub, index) => (
            <View key={index} style={styles.ubicacionItem}>
              <Ionicons name="location-outline" size={16} color="#0984E3" />
              <Text style={styles.ubicacionText}>{ub.nombre}</Text>
              <Text style={styles.ubicacionDistancia}>Radio: {ub.radio}m</Text>
            </View>
          ))}
        </View>

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

        <View style={styles.botonesContainer}>
          <Text style={styles.botonesTitle}>⏰ Registrar</Text>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_entrada) ? styles.botonRegistrado : 
              (siguientePaso === 'entrada' && !completado ? styles.botonActivo : styles.botonBloqueado),
            ]}
            onPress={() => registrar('entrada')}
            disabled={isRegistrado(asistencia.hora_entrada) || loading || completado || siguientePaso !== 'entrada'}
          >
            <View style={[styles.botonIconContainer, { backgroundColor: isRegistrado(asistencia.hora_entrada) ? '#00B894' : getPasoColor('entrada') }]}>
              <Ionicons name={isRegistrado(asistencia.hora_entrada) ? 'checkmark' : getPasoIcon('entrada')} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={[styles.botonTitulo, isRegistrado(asistencia.hora_entrada) ? styles.textoRegistrado : styles.textoActivo]}>
                🟢 Entrada
              </Text>
              {isRegistrado(asistencia.hora_entrada) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_entrada}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>
                  {siguientePaso === 'entrada' ? '👉 Registra tu entrada' : 'Esperando entrada'}
                </Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_entrada) && siguientePaso === 'entrada' && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_inicio_almuerzo) ? styles.botonRegistrado : 
              (siguientePaso === 'inicio_almuerzo' && !completado ? styles.botonActivo : styles.botonBloqueado),
            ]}
            onPress={() => registrar('inicio_almuerzo')}
            disabled={isRegistrado(asistencia.hora_inicio_almuerzo) || loading || completado || siguientePaso !== 'inicio_almuerzo'}
          >
            <View style={[styles.botonIconContainer, { backgroundColor: isRegistrado(asistencia.hora_inicio_almuerzo) ? '#00B894' : getPasoColor('inicio_almuerzo') }]}>
              <Ionicons name={isRegistrado(asistencia.hora_inicio_almuerzo) ? 'checkmark' : getPasoIcon('inicio_almuerzo')} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={[styles.botonTitulo, isRegistrado(asistencia.hora_inicio_almuerzo) ? styles.textoRegistrado : styles.textoActivo]}>
                🍽️ Inicio Almuerzo
              </Text>
              {isRegistrado(asistencia.hora_inicio_almuerzo) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_inicio_almuerzo}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>
                  {siguientePaso === 'inicio_almuerzo' ? '👉 Registra inicio de almuerzo' : 'Esperando inicio almuerzo'}
                </Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_inicio_almuerzo) && siguientePaso === 'inicio_almuerzo' && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_fin_almuerzo) ? styles.botonRegistrado : 
              (siguientePaso === 'fin_almuerzo' && !completado ? styles.botonActivo : styles.botonBloqueado),
            ]}
            onPress={() => registrar('fin_almuerzo')}
            disabled={isRegistrado(asistencia.hora_fin_almuerzo) || loading || completado || siguientePaso !== 'fin_almuerzo'}
          >
            <View style={[styles.botonIconContainer, { backgroundColor: isRegistrado(asistencia.hora_fin_almuerzo) ? '#00B894' : getPasoColor('fin_almuerzo') }]}>
              <Ionicons name={isRegistrado(asistencia.hora_fin_almuerzo) ? 'checkmark' : getPasoIcon('fin_almuerzo')} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={[styles.botonTitulo, isRegistrado(asistencia.hora_fin_almuerzo) ? styles.textoRegistrado : styles.textoActivo]}>
                🍽️ Fin Almuerzo
              </Text>
              {isRegistrado(asistencia.hora_fin_almuerzo) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_fin_almuerzo}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>
                  {siguientePaso === 'fin_almuerzo' ? '👉 Registra fin de almuerzo' : 'Esperando fin almuerzo'}
                </Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_fin_almuerzo) && siguientePaso === 'fin_almuerzo' && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonRegistro,
              isRegistrado(asistencia.hora_salida) ? styles.botonRegistrado : 
              (siguientePaso === 'salida' && !completado ? styles.botonActivo : styles.botonBloqueado),
            ]}
            onPress={() => registrar('salida')}
            disabled={isRegistrado(asistencia.hora_salida) || loading || completado || siguientePaso !== 'salida'}
          >
            <View style={[styles.botonIconContainer, { backgroundColor: isRegistrado(asistencia.hora_salida) ? '#00B894' : getPasoColor('salida') }]}>
              <Ionicons name={isRegistrado(asistencia.hora_salida) ? 'checkmark' : getPasoIcon('salida')} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.botonTextContainer}>
              <Text style={[styles.botonTitulo, isRegistrado(asistencia.hora_salida) ? styles.textoRegistrado : styles.textoActivo]}>
                🔴 Salida
              </Text>
              {isRegistrado(asistencia.hora_salida) ? (
                <Text style={styles.botonHora}>✅ {asistencia.hora_salida}</Text>
              ) : (
                <Text style={styles.botonSubTitulo}>
                  {siguientePaso === 'salida' ? '👉 Registra tu salida' : 'Esperando salida'}
                </Text>
              )}
            </View>
            {!isRegistrado(asistencia.hora_salida) && siguientePaso === 'salida' && (
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {completado && (
            <View style={styles.completadoContainer}>
              <Ionicons name="trophy" size={40} color="#FDCB6E" />
              <Text style={styles.completadoText}>🎉 ¡Jornada Completada!</Text>
              <Text style={styles.completadoSubText}>Excelente trabajo hoy. Descansa y mañana más.</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>• 📍 Entrada y Salida: Debes estar en una ubicación permitida</Text>
          <Text style={styles.infoText}>• 🍽️ Inicio y Fin de Almuerzo: Puedes registrar desde cualquier lugar</Text>
          <Text style={styles.infoText}>• 🔄 El registro es secuencial (Entrada → Inicio Almuerzo → Fin Almuerzo → Salida)</Text>
          <Text style={styles.infoText}>• 🚫 Apps de Fake GPS están prohibidas y serán detectadas</Text>
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
  fakeGpsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  fakeGpsWarningText: {
    color: '#FF6B6B',
    fontSize: 12,
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
  progresoContainer: {
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
  progresoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  progresoBarra: {
    height: 8,
    backgroundColor: '#DFE6E9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progresoFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 4,
  },
  progresoText: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 8,
  },
  progresoPaso: {
    fontWeight: 'bold',
    color: '#6C5CE7',
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
  botonActivo: {
    backgroundColor: '#6C5CE7',
  },
  botonRegistrado: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  botonBloqueado: {
    backgroundColor: '#DFE6E9',
    opacity: 0.6,
  },
  botonIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  textoActivo: {
    color: '#FFFFFF',
  },
  textoRegistrado: {
    color: '#636E72',
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
  completadoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  completadoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00B894',
    marginTop: 10,
  },
  completadoSubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
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