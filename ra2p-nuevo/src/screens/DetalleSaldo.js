import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import api from '../services/api';

const DetalleSaldo = ({ navigation, route }) => {
  const { zona } = route.params || { zona: 'TOLA' };
  const [loading, setLoading] = useState(true);
  const [caja, setCaja] = useState(null);

  useEffect(() => {
    cargarDetalle();
  }, []);

  const cargarDetalle = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/cajas/saldo-disponible?zona=${zona}`);
      if (response.data.success && response.data.data) {
        setCaja(response.data.data);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin registro';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 {zona}</Text>
        <Text style={styles.subtitle}>Saldo disponible</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>Saldo Final</Text>
          <Text style={styles.saldoValor}>${caja?.saldoFinal?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.saldoFecha}>Actualizado: {formatFecha(caja?.fecha)}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Información</Text>
          <Text style={styles.infoText}>
            Este es el saldo final del último día registrado para la zona {zona}.
            Este monto se utilizará como saldo inicial para el próximo día.
          </Text>
        </View>
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
  content: {
    padding: 15,
  },
  saldoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  saldoLabel: {
    fontSize: 16,
    color: '#636E72',
  },
  saldoValor: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00B894',
    marginVertical: 10,
  },
  saldoFecha: {
    fontSize: 12,
    color: '#636E72',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
  },
});

export default DetalleSaldo;