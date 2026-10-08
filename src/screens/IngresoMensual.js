import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import api from '../services/api';

const MESES = [
  { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' },
  { num: 3, nombre: 'Marzo' },
  { num: 4, nombre: 'Abril' },
  { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' },
  { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' },
  { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' },
];

const COLORES_ZONA = {
  'TOLA': '#0984E3',
  'SAN JOSE DE CHILIBULO': '#00B894',
  'MAGDALENA': '#FDCB6E',
};

const IngresoMensual = ({ navigation }) => {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio] = useState(hoy.getFullYear());
  const [modalMes, setModalMes] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const nombreMes = MESES.find(m => m.num === mes)?.nombre || '';

  const cargar = useCallback(async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);
    setError(null);
    try {
      const resp = await api.get('/ingreso-mensual', {
        params: { mes, anio },
      });
      if (resp.data.success) {
        setDatos(resp.data);
      } else {
        setError(resp.data.message || 'No se pudo cargar');
      }
    } catch (err) {
      console.error('Error cargando ingreso mensual:', err);
      setError(err.response?.data?.message || err.message || 'Error de conexion');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const fmt = (n) => '$' + (Number(n) || 0).toFixed(2);

  const renderZona = (zona) => {
    const color = COLORES_ZONA[zona.zona] || '#636E72';
    return (
      <View key={zona.zona} style={[styles.zonaCard, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        <Text style={[styles.zonaTitulo, { color }]}>{zona.zona}</Text>

        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Cobros Visitas</Text>
          <Text style={styles.filaValor}>{fmt(zona.cobrosVisitas)}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Transferencias</Text>
          <Text style={styles.filaValor}>{fmt(zona.transferencias)}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Ingreso Oficina Tola</Text>
          <Text style={styles.filaValor}>{fmt(zona.oficinaTola)}</Text>
        </View>
        <View style={styles.fila}>
          <Text style={styles.filaLabel}>Ingreso Otras Oficinas</Text>
          <Text style={styles.filaValor}>{fmt(zona.otrasOficinas)}</Text>
        </View>

        <View style={styles.separador} />

        <View style={styles.filaTotal}>
          <Text style={styles.totalLabel}>TOTAL {zona.zona}</Text>
          <Text style={[styles.totalValor, { color }]}>{fmt(zona.totalZona)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ingreso Mensual</Text>
          <TouchableOpacity style={styles.selectorMes} onPress={() => setModalMes(true)}>
            <Text style={styles.selectorMesText}>{nombreMes} {anio} ▼</Text>
          </TouchableOpacity>
        </View>

        {cargando && !datos ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0984E3" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.reintentarBtn} onPress={() => cargar()}>
              <Text style={styles.reintentarText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : datos ? (
          <>
            {datos.zonas.map(renderZona)}

            <View style={styles.totalGeneralCard}>
              <Text style={styles.totalGeneralLabel}>TOTAL GENERAL</Text>
              <Text style={styles.totalGeneralValor}>{fmt(datos.totalGeneral)}</Text>
            </View>

            <Text style={styles.footer}>
              Mes: {datos.nombreMes}
            </Text>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={modalMes}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMes(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar mes</Text>
            <FlatList
              data={MESES}
              keyExtractor={(item) => String(item.num)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.num === mes && styles.modalItemActive]}
                  onPress={() => { setMes(item.num); setModalMes(false); }}
                >
                  <Text style={[styles.modalItemText, item.num === mes && styles.modalItemTextActive]}>
                    {item.nombre} {anio}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalMes(false)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#2D3436', marginBottom: 12 },
  selectorMes: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFE6E9',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  selectorMesText: { fontSize: 16, color: '#2D3436', fontWeight: '600' },
  loadingBox: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#636E72', fontSize: 14 },
  errorBox: { padding: 20, alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: 12 },
  errorText: { color: '#D63031', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  reintentarBtn: {
    backgroundColor: '#0984E3',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  reintentarText: { color: '#FFF', fontWeight: '700' },
  zonaCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  zonaTitulo: { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  filaLabel: { fontSize: 14, color: '#636E72' },
  filaValor: { fontSize: 14, color: '#2D3436', fontWeight: '600' },
  separador: {
    height: 1,
    backgroundColor: '#DFE6E9',
    marginVertical: 10,
  },
  filaTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#2D3436' },
  totalValor: { fontSize: 18, fontWeight: '700' },
  totalGeneralCard: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  totalGeneralLabel: {
    color: '#DFE6E9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalGeneralValor: { color: '#FFF', fontSize: 28, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#B2BEC3', fontSize: 12, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', textAlign: 'center', marginBottom: 15 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 24 },
  modalItemActive: { backgroundColor: '#E8F4FD' },
  modalItemText: { fontSize: 16, color: '#2D3436' },
  modalItemTextActive: { color: '#0984E3', fontWeight: '700' },
  modalCancelar: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F1F2F6',
    alignItems: 'center',
  },
  modalCancelarText: { fontSize: 15, color: '#636E72', fontWeight: '600' },
});

export default IngresoMensual;
