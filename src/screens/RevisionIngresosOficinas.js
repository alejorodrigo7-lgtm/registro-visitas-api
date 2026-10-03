import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RevisionIngresosOficinas = ({ navigation }) => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'Admin';

  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [mostrarInicio, setMostrarInicio] = useState(false);
  const [mostrarFin, setMostrarFin] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [resumen, setResumen] = useState(null);

  const formatFecha = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  };

  const formatFechaVisible = (d) => {
    return d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const buscar = async () => {
    setCargando(true);
    try {
      const resp = await api.get('/ingresos-oficinas', {
        params: {
          fechaInicio: formatFecha(fechaInicio),
          fechaFin: formatFecha(fechaFin),
        },
      });

      if (resp.data.success) {
        setRegistros(resp.data.data || []);
        setResumen(resp.data.resumen || null);
      } else {
        Alert.alert('Error', resp.data.message || 'No se pudo obtener la lista');
      }
    } catch (err) {
      console.error('Error buscando ingresos:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error de conexion');
    } finally {
      setCargando(false);
    }
  };

  const eliminar = (id) => {
    Alert.alert(
      'Confirmar',
      '¿Eliminar este ingreso?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const resp = await api.delete('/ingresos-oficinas/' + id);
              if (resp.data.success) {
                Alert.alert('OK', 'Ingreso eliminado');
                buscar();
              } else {
                Alert.alert('Error', resp.data.message || 'No se pudo eliminar');
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const fecha = new Date(item.fecha);
    const fechaStr = fecha.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View
            style={[
              styles.badge,
              item.tipo === 'tola' ? styles.badgeTola : styles.badgeOtra,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.tipo === 'tola' ? 'TOLA' : 'OTRA'}
            </Text>
          </View>
          <Text style={styles.itemValor}>${Number(item.valor).toFixed(2)}</Text>
        </View>

        <Text style={styles.itemFecha}>Fecha: {fechaStr}</Text>

        {item.tipo === 'otra' && item.nombreOficina ? (
          <Text style={styles.itemOficina}>Oficina: {item.nombreOficina}</Text>
        ) : null}

        {item.tipo === 'otra' && item.observacion ? (
          <Text style={styles.itemObservacion}>Obs: {item.observacion}</Text>
        ) : null}

        <Text style={styles.itemRegistradoPor}>
          Registrado por: {item.registradoPorNombre || item.registradoPor?.nombre || '-'}
        </Text>

        {isAdmin && (
          <TouchableOpacity
            style={styles.botonEliminar}
            onPress={() => eliminar(item._id)}
          >
            <Text style={styles.botonEliminarText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filtro por fecha</Text>

          <View style={styles.filaFechas}>
            <View style={styles.colFecha}>
              <Text style={styles.label}>Desde</Text>
              <TouchableOpacity style={styles.inputFecha} onPress={() => setMostrarInicio(true)}>
                <Text style={styles.inputFechaText}>{formatFechaVisible(fechaInicio)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.colFecha}>
              <Text style={styles.label}>Hasta</Text>
              <TouchableOpacity style={styles.inputFecha} onPress={() => setMostrarFin(true)}>
                <Text style={styles.inputFechaText}>{formatFechaVisible(fechaFin)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mostrarInicio && (
            <DateTimePicker
              value={fechaInicio}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => { setMostrarInicio(Platform.OS === 'ios'); if (d) setFechaInicio(d); }}
            />
          )}
          {mostrarFin && (
            <DateTimePicker
              value={fechaFin}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => { setMostrarFin(Platform.OS === 'ios'); if (d) setFechaFin(d); }}
            />
          )}

          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDisabled]}
            onPress={buscar}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonText}>BUSCAR</Text>
            )}
          </TouchableOpacity>
        </View>

        {resumen && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen del rango</Text>

            <View style={styles.resumenRow}>
              <Text style={styles.resumenLabel}>Oficina TOLA</Text>
              <Text style={styles.resumenValor}>
                {resumen.tola.cantidad} reg - ${Number(resumen.tola.total).toFixed(2)}
              </Text>
            </View>

            <View style={styles.resumenRow}>
              <Text style={styles.resumenLabel}>Otras Oficinas</Text>
              <Text style={styles.resumenValor}>
                {resumen.otras.cantidad} reg - ${Number(resumen.otras.total).toFixed(2)}
              </Text>
            </View>

            <View style={[styles.resumenRow, styles.resumenTotalRow]}>
              <Text style={styles.resumenTotalLabel}>TOTAL GENERAL</Text>
              <Text style={styles.resumenTotalValor}>
                ${Number(resumen.totalGeneral).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {registros.length > 0 && (
          <View style={styles.listaContainer}>
            <Text style={styles.listaTitulo}>
              Registros ({registros.length})
            </Text>
            {registros.map((item) => (
              <View key={item._id}>{renderItem({ item })}</View>
            ))}
          </View>
        )}

        {!cargando && registros.length === 0 && resumen && (
          <View style={styles.vacio}>
            <Text style={styles.vacioText}>No hay ingresos en este rango</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 12 },
  filaFechas: { flexDirection: 'row', gap: 10 },
  colFecha: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#636E72', marginBottom: 6 },
  inputFecha: {
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  inputFechaText: { fontSize: 14, color: '#2D3436' },
  boton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  botonDisabled: { backgroundColor: '#B2BEC3' },
  botonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F2F6',
  },
  resumenLabel: { fontSize: 14, color: '#2D3436' },
  resumenValor: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  resumenTotalRow: {
    borderBottomWidth: 0,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#6C5CE7',
  },
  resumenTotalLabel: { fontSize: 15, fontWeight: '800', color: '#6C5CE7' },
  resumenTotalValor: { fontSize: 16, fontWeight: '800', color: '#6C5CE7' },
  listaContainer: { marginTop: 4 },
  listaTitulo: { fontSize: 15, fontWeight: '700', color: '#2D3436', marginBottom: 10 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTola: { backgroundColor: '#00B894' },
  badgeOtra: { backgroundColor: '#0984E3' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  itemValor: { fontSize: 18, fontWeight: '800', color: '#2D3436' },
  itemFecha: { fontSize: 13, color: '#636E72', marginBottom: 3 },
  itemOficina: { fontSize: 13, color: '#2D3436', marginBottom: 3 },
  itemObservacion: { fontSize: 12, color: '#636E72', fontStyle: 'italic', marginBottom: 3 },
  itemRegistradoPor: { fontSize: 11, color: '#B2BEC3', marginTop: 4 },
  botonEliminar: {
    marginTop: 10,
    backgroundColor: '#E17055',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  botonEliminarText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  vacio: {
    padding: 30,
    alignItems: 'center',
  },
  vacioText: { fontSize: 14, color: '#B2BEC3' },
});

export default RevisionIngresosOficinas;