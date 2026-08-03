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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ReporteAusencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');

  const estados = ['Pendiente', 'Aprobado', 'Rechazado'];

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/auth/usuarios');
      const tecnicos = response.data.data.filter(
        u => u.rol === 'Tecnico' || u.rol === 'Coordinador'
      );
      setUsuarios(tecnicos);
      if (tecnicos.length > 0) {
        setSelectedUser(tecnicos[0]._id);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const buscarSolicitudes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fechaInicio', formatDate(fechaInicio));
      params.append('fechaFin', formatDate(fechaFin));
      if (selectedUser) params.append('usuario', selectedUser);
      if (filtroEstado) params.append('estado', filtroEstado);

      const response = await api.get(`/pedir-ausencia/todas?${params.toString()}`);
      setSolicitudes(response.data.data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener el reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Aprobado') return '#00B894';
    if (estado === 'Rechazado') return '#FF6B6B';
    return '#FDCB6E';
  };

  const exportarReporte = async () => {
    try {
      const data = solicitudes.map(r => ({
        Usuario: r.usuario?.nombre || '',
        Rol: r.usuario?.rol || '',
        Fecha: r.fechaStr || '',
        Tipo: r.tipo || '',
        Motivo: r.motivo || '',
        Observaciones: r.observaciones || '',
        Estado: r.estado || '',
        'Aprobado Por': r.aprobadoPorNombre || '',
      }));

      const texto = data.map(r => 
        `Usuario: ${r.Usuario}\nRol: ${r.Rol}\nFecha: ${r.Fecha}\nTipo: ${r.Tipo}\nMotivo: ${r.Motivo}\nObservaciones: ${r.Observaciones}\nEstado: ${r.Estado}\nAprobado Por: ${r['Aprobado Por']}\n${'-'.repeat(40)}`
      ).join('\n\n');

      await Share.share({
        message: `📊 REPORTE DE AUSENCIAS\n${'-'.repeat(40)}\nTotal: ${solicitudes.length}\n${'-'.repeat(40)}\n\n${texto}`,
        title: 'Reporte Ausencias',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el reporte');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Reporte Ausencias</Text>
        <Text style={styles.subtitle}>Solicitudes de ausencia</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          <Text style={styles.label}>👤 Usuario</Text>
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

          <Text style={styles.label}>📅 Fecha Inicio</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowInicio(true)}>
            <Text style={styles.dateText}>{formatDate(fechaInicio)}</Text>
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
            <Text style={styles.dateText}>{formatDate(fechaFin)}</Text>
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

          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroEstado}
              onValueChange={setFiltroEstado}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {estados.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={styles.buscarButton} onPress={buscarSolicitudes}>
            <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
          </TouchableOpacity>
        </View>

        {/* Lista */}
        {solicitudes.length > 0 ? (
          <View style={styles.listaContainer}>
            <View style={styles.listaHeader}>
              <Text style={styles.listaTitle}>📋 Solicitudes ({solicitudes.length})</Text>
              <TouchableOpacity style={styles.exportarButton} onPress={exportarReporte}>
                <Text style={styles.exportarButtonText}>📤 Exportar</Text>
              </TouchableOpacity>
            </View>

            {solicitudes.map((item, index) => (
              <View key={item._id || index} style={styles.solicitudCard}>
                <View style={styles.solicitudHeader}>
                  <Text style={styles.solicitudUsuario}>{item.usuario?.nombre || 'N/A'}</Text>
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                    <Text style={styles.estadoBadgeText}>{item.estado || 'Pendiente'}</Text>
                  </View>
                </View>

                <Text style={styles.solicitudInfo}>📅 {item.fechaStr}</Text>
                <Text style={styles.solicitudInfo}>📋 {item.tipo}</Text>
                <Text style={styles.solicitudInfo}>📝 {item.motivo}</Text>
                {item.observaciones && (
                  <Text style={styles.solicitudInfo}>💬 {item.observaciones}</Text>
                )}
                {item.documentoNombre && (
                  <Text style={styles.solicitudInfo}>📎 {item.documentoNombre}</Text>
                )}
                {item.aprobadoPorNombre && (
                  <Text style={styles.solicitudInfo}>
                    {item.estado === 'Aprobado' ? '✅' : '❌'} {item.aprobadoPorNombre}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay solicitudes</Text>
            <Text style={styles.emptySubText}>Selecciona filtros y busca</Text>
          </View>
        )}
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
    backgroundColor: '#E17055',
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
  content: {
    flex: 1,
    padding: 15,
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
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#E17055',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
  },
  listaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  listaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  exportarButton: {
    backgroundColor: '#0984E3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  solicitudCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  solicitudUsuario: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  solicitudInfo: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
  },
});

export default ReporteAusencias;