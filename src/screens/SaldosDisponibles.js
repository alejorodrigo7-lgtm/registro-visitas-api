import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SaldosDisponibles = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saldos, setSaldos] = useState({
    TOLA: { saldo: 0, fecha: null },
    MAGDALENA: { saldo: 0, fecha: null },
    CHILIBULO: { saldo: 0, fecha: null },
  });

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];

  const cargarSaldos = async () => {
    setLoading(true);
    try {
      const nuevosSaldos = {};
      for (const zona of zonas) {
        const response = await api.get(`/cajas/saldo-disponible?zona=${zona}`);
        if (response.data.success && response.data.data) {
          nuevosSaldos[zona] = {
            saldo: response.data.data.saldoFinal || 0,
            fecha: response.data.data.fecha,
          };
        } else {
          nuevosSaldos[zona] = { saldo: 0, fecha: null };
        }
      }
      setSaldos(nuevosSaldos);
    } catch (error) {
      console.error('Error al cargar saldos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarSaldos();
  }, []);

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin registro';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const getZonaColor = (zona) => {
    const colors = {
      'TOLA': '#FF6B6B',
      'MAGDALENA': '#4ECDC4',
      'CHILIBULO': '#45B7D1',
    };
    return colors[zona] || '#636E72';
  };

  const getZonaIcon = (zona) => {
    const icons = {
      'TOLA': '📍',
      'MAGDALENA': '📍',
      'CHILIBULO': '📍',
    };
    return icons[zona] || '📍';
  };

  const verDetalle = (zona) => {
    navigation.navigate('DetalleSaldo', { zona });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando saldos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Saldos Disponibles</Text>
        <Text style={styles.subtitle}>Saldo final del día anterior por zona</Text>
      </View>

      <ScrollView style={styles.listaContainer}>
        {zonas.map((zona) => (
          <TouchableOpacity
            key={zona}
            style={[styles.zonaCard, { borderLeftColor: getZonaColor(zona) }]}
            onPress={() => verDetalle(zona)}
          >
            <View style={styles.zonaHeader}>
              <Text style={styles.zonaIcon}>{getZonaIcon(zona)}</Text>
              <Text style={styles.zonaNombre}>{zona}</Text>
            </View>

            <View style={styles.zonaInfo}>
              <Text style={styles.zonaSaldo}>
                ${saldos[zona]?.saldo?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.zonaFecha}>
                Última actualización: {formatFecha(saldos[zona]?.fecha)}
              </Text>
            </View>

            <View style={styles.zonaFooter}>
              <Text style={styles.zonaDetalle}>Ver detalle ›</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  listaContainer: {
    padding: 15,
  },
  zonaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  zonaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  zonaIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  zonaNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  zonaInfo: {
    marginBottom: 10,
  },
  zonaSaldo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00B894',
  },
  zonaFecha: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 5,
  },
  zonaFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  zonaDetalle: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SaldosDisponibles;