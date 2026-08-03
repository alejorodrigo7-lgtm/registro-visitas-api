import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ReporteMonserrath = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [estadisticas, setEstadisticas] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  useEffect(() => {
    if (isAdminOrJefe) {
      cargarUsuarios();
    }
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/auth/usuarios');
      const tecnicos = response.data.data.filter(u => u.rol === 'Tecnico' || u.rol === 'Coordinador');
      setUsuarios(tecnicos);
      if (tecnicos.length > 0) {
        setSelectedUser(tecnicos[0]._id);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const buscarReporte = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fechaInicio', fechaInicio.toISOString().split('T')[0]);
      params.append('fechaFin', fechaFin.toISOString().split('T')[0]);
      if (selectedUser) params.append('tecnico', selectedUser);

      const response = await api.get(`/monserrath/reporte?${params.toString()}`);
      setRegistros(response.data.data || []);
      setEstadisticas(response.data.estadisticas || {});
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener el reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const formatHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-ES');
  };

  const exportarReporte = async () => {
    try {
      const data = registros.map(r => ({
        Cliente: r.cliente,
        Identificador: r.identificador,
        Barrio: r.barrio,
        Direccion: r.direccion,
        Telefono: r.telefono,
        Fecha: formatFecha(r.fecha),
        'Hora Llegada': r.hora_llegada,
        'Hora Salida': r.hora_salida,
        'Material Usado': r.material_usado || '',
        Observaciones: r.observaciones || '',
        Estado: r.estado,
        Tecnico: r.tecnicoNombre,
      }));

      const texto = data.map(r => 
        `Cliente: ${r.Cliente}\nIdentificador: ${r.Identificador}\nBarrio: ${r.Barrio}\nDireccion: ${r.Direccion}\nTelefono: ${r.Telefono}\nFecha: ${r.Fecha}\nHora Llegada: ${r['Hora Llegada']}\nHora Salida: ${r['Hora Salida']}\nMaterial Usado: ${r['Material Usado']}\nObservaciones: ${r.Observaciones}\nEstado: ${r.Estado}\nTecnico: ${r.Tecnico}\n${'-'.repeat(40)}`
      ).join('\n\n');

      const share = await Share.share({
        message: `📊 REPORTE MONSERRATH\n${'-'.repeat(40)}\nTotal: ${registros.length}\nCompletados: ${estadisticas.completados || 0}\nPendientes: ${estadisticas.pendientes || 0}\nCancelados: ${estadisticas.cancelados || 0}\n${'-'.repeat(40)}\n\n${texto}`,
        title: 'Reporte Monserrath',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el reporte');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando reporte...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Reporte Monserrath</Text>
        <Text style={styles.subtitle}>Registros de visitas y servicios</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          {isAdminOrJefe && (
            <>
              <Text style={styles.label}>👤 Técnico</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedUser} onValueChange={setSelectedUser}>
                  {usuarios.map((u) => (
                    <Picker.Item key={u._id} label={`${u.nombre} (${u.rol})`} value={u._id} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          <Text style={styles.label}>📅 Fecha Inicio</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowInicio(true)}>
            <Text style={styles.dateText}>{formatFecha(fechaInicio)}</Text>
          </TouchableOpacity>
          {showInicio && (
            <DateTimePicker
              value={fechaInicio}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowInicio(false);
                if (selectedDate) setFechaInicio(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>📅 Fecha Fin</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowFin(true)}>
            <Text style={styles.dateText}>{formatFecha(fechaFin)}</Text>
          </TouchableOpacity>
          {showFin && (
            <DateTimePicker
              value={fechaFin}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowFin(false);
                if (selectedDate) setFechaFin(selectedDate);
              }}
            />
          )}

          <TouchableOpacity style={styles.buscarButton} onPress={buscarReporte}>
            <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Estadísticas */}
        {registros.length > 0 && (
          <View style={styles.estadisticasContainer}>
            <Text style={styles.estadisticasTitle}>📊 Estadísticas</Text>
            <View style={styles.estadisticasGrid}>
              <View style={[styles.estadisticaItem, styles.total]}>
                <Text style={styles.estadisticaNumero}>{registros.length}</Text>
                <Text style={styles.estadisticaLabel}>Total</Text>
              </View>
              <View style={[styles.estadisticaItem, styles.completados]}>
                <Text style={styles.estadisticaNumero}>{estadisticas.completados || 0}</Text>
                <Text style={styles.estadisticaLabel}>Completados</Text>
              </View>
              <View style={[styles.estadisticaItem, styles.pendientes]}>
                <Text style={styles.estadisticaNumero}>{estadisticas.pendientes || 0}</Text>
                <Text style={styles.estadisticaLabel}>Pendientes</Text>
              </View>
              <View style={[styles.estadisticaItem, styles.cancelados]}>
                <Text style={styles.estadisticaNumero}>{estadisticas.cancelados || 0}</Text>
                <Text style={styles.estadisticaLabel}>Cancelados</Text>
              </View>
            </View>
          </View>
        )}

        {/* Lista de registros */}
        {registros.length > 0 ? (
          <View style={styles.listaContainer}>
            <View style={styles.listaHeader}>
              <Text style={styles.listaTitle}>📋 Registros ({registros.length})</Text>
              <TouchableOpacity style={styles.exportarButton} onPress={exportarReporte}>
                <Text style={styles.exportarButtonText}>📤 Exportar</Text>
              </TouchableOpacity>
            </View>

            {registros.map((item, index) => (
              <View key={item._id} style={styles.registroCard}>
                <View style={styles.registroHeader}>
                  <Text style={styles.registroCliente}>{item.cliente}</Text>
                  <View style={[styles.estadoBadge, 
                    item.estado === 'Completado' ? styles.estadoCompletado :
                    item.estado === 'Cancelado' ? styles.estadoCancelado :
                    styles.estadoPendiente
                  ]}>
                    <Text style={styles.estadoBadgeText}>{item.estado}</Text>
                  </View>
                </View>

                <Text style={styles.registroInfo}>🆔 {item.identificador}</Text>
                <Text style={styles.registroInfo}>🏘️ {item.barrio}</Text>
                <Text style={styles.registroInfo}>📍 {item.direccion}</Text>
                <Text style={styles.registroInfo}>📞 {item.telefono}</Text>
                <Text style={styles.registroInfo}>📅 {formatFecha(item.fecha)}</Text>
                <Text style={styles.registroInfo}>🕐 Llegada: {item.hora_llegada} | Salida: {item.hora_salida}</Text>
                {item.material_usado && (
                  <Text style={styles.registroInfo}>🔧 Material: {item.material_usado}</Text>
                )}
                {item.observaciones && (
                  <Text style={styles.registroInfo}>📝 {item.observaciones}</Text>
                )}
                <Text style={styles.registroInfo}>👤 {item.tecnicoNombre}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay registros</Text>
            <Text style={styles.emptySubText}>Selecciona filtros y busca</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 20, backgroundColor: '#6C5CE7', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 5 },
  content: { flex: 1, padding: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#636E72' },
  filtrosContainer: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '500', color: '#2D3436', marginBottom: 5 },
  pickerContainer: { backgroundColor: '#F5F5F5', borderRadius: 10, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 15, overflow: 'hidden' },
  dateInput: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#DFE6E9', marginBottom: 15 },
  dateText: { fontSize: 16, color: '#2D3436' },
  buscarButton: { backgroundColor: '#6C5CE7', padding: 15, borderRadius: 10, alignItems: 'center' },
  buscarButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  estadisticasContainer: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 15 },
  estadisticasTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436', marginBottom: 10 },
  estadisticasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  estadisticaItem: { flex: 1, minWidth: '45%', padding: 15, borderRadius: 10, alignItems: 'center' },
  total: { backgroundColor: '#6C5CE7' },
  completados: { backgroundColor: '#00B894' },
  pendientes: { backgroundColor: '#FDCB6E' },
  cancelados: { backgroundColor: '#FF6B6B' },
  estadisticaNumero: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  estadisticaLabel: { fontSize: 12, color: '#FFFFFF', opacity: 0.8 },
  listaContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 30 },
  listaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  listaTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  exportarButton: { backgroundColor: '#0984E3', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  exportarButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  registroCard: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  registroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  registroCliente: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  estadoCompletado: { backgroundColor: '#00B894' },
  estadoPendiente: { backgroundColor: '#FDCB6E' },
  estadoCancelado: { backgroundColor: '#FF6B6B' },
  estadoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  registroInfo: { fontSize: 13, color: '#636E72', marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  emptySubText: { fontSize: 14, color: '#636E72', marginTop: 5 },
});

export default ReporteMonserrath;