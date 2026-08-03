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
  Modal,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const GestionAusencias = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: new Date(),
    fechaFin: new Date(),
    estado: 'Pendiente',
  });
  const [showDatePicker, setShowDatePicker] = useState({
    inicio: false,
    fin: false,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [respuesta, setRespuesta] = useState('');

  const tiposAusencia = ['Entrada', 'Inicio Almuerzo', 'Fin Almuerzo', 'Salida'];
  const estadosFiltro = ['Todos', 'Pendiente', 'Aprobado', 'Rechazado'];

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      let url = '/pedir-ausencia/todas';
      const params = new URLSearchParams();

      if (filtros.fechaInicio) {
        params.append('fechaInicio', formatDate(filtros.fechaInicio));
      }
      if (filtros.fechaFin) {
        params.append('fechaFin', formatDate(filtros.fechaFin));
      }
      if (filtros.estado && filtros.estado !== 'Todos') {
        params.append('estado', filtros.estado);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      setSolicitudes(response.data.data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
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

  const mostrarDetalle = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setRespuesta('');
    setModalVisible(true);
  };

  const aprobarRechazar = async (estado) => {
    if (!solicitudSeleccionada) return;

    setLoading(true);
    try {
      await api.put(`/pedir-ausencia/${solicitudSeleccionada._id}`, {
        estado: estado,
        observaciones: respuesta,
      });

      Alert.alert('✅ Éxito', `Solicitud ${estado.toLowerCase()} correctamente`);
      setModalVisible(false);
      cargarSolicitudes();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Aprobado') return '#00B894';
    if (estado === 'Rechazado') return '#FF6B6B';
    return '#FDCB6E';
  };

  const getEstadoIcon = (estado) => {
    if (estado === 'Aprobado') return 'checkmark-circle';
    if (estado === 'Rechazado') return 'close-circle';
    return 'time-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Gestionar Ausencias</Text>
        <Text style={styles.subtitle}>Aprobar o rechazar solicitudes</Text>
      </View>

      <View style={styles.filtrosContainer}>
        <Text style={styles.filtrosTitle}>🔍 Filtros</Text>

        <View style={styles.filtrosRow}>
          <View style={styles.filtroItem}>
            <Text style={styles.filtroLabel}>Fecha Inicio</Text>
            <TouchableOpacity
              style={styles.filtroInput}
              onPress={() => setShowDatePicker({ ...showDatePicker, inicio: true })}
            >
              <Text style={styles.filtroText}>{formatDate(filtros.fechaInicio)}</Text>
            </TouchableOpacity>
            {showDatePicker.inicio && (
              <DateTimePicker
                value={filtros.fechaInicio}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker({ ...showDatePicker, inicio: false });
                  if (selectedDate) {
                    setFiltros({ ...filtros, fechaInicio: selectedDate });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.filtroItem}>
            <Text style={styles.filtroLabel}>Fecha Fin</Text>
            <TouchableOpacity
              style={styles.filtroInput}
              onPress={() => setShowDatePicker({ ...showDatePicker, fin: true })}
            >
              <Text style={styles.filtroText}>{formatDate(filtros.fechaFin)}</Text>
            </TouchableOpacity>
            {showDatePicker.fin && (
              <DateTimePicker
                value={filtros.fechaFin}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker({ ...showDatePicker, fin: false });
                  if (selectedDate) {
                    setFiltros({ ...filtros, fechaFin: selectedDate });
                  }
                }}
              />
            )}
          </View>
        </View>

        <Text style={styles.filtroLabel}>Estado</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filtros.estado}
            onValueChange={(value) => setFiltros({ ...filtros, estado: value })}
            style={styles.picker}
          >
            {estadosFiltro.map((e) => (
              <Picker.Item key={e} label={e} value={e} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.buscarButton} onPress={cargarSolicitudes}>
          <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listaContainer}>
        <Text style={styles.listaTitle}>
          📋 Solicitudes ({solicitudes.length})
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#6C5CE7" />
        ) : solicitudes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay solicitudes</Text>
            <Text style={styles.emptySubText}>Ajusta los filtros para buscar</Text>
          </View>
        ) : (
          solicitudes.map((item) => (
            <TouchableOpacity
              key={item._id}
              style={styles.solicitudCard}
              onPress={() => mostrarDetalle(item)}
            >
              <View style={styles.solicitudHeader}>
                <Text style={styles.solicitudUsuario}>{item.usuarioNombre}</Text>
                <View style={[styles.solicitudEstado, { backgroundColor: getEstadoColor(item.estado) }]}>
                  <Ionicons name={getEstadoIcon(item.estado)} size={14} color="#FFFFFF" />
                  <Text style={styles.solicitudEstadoText}>{item.estado}</Text>
                </View>
              </View>

              <Text style={styles.solicitudInfo}>📅 {item.fechaStr}</Text>
              <Text style={styles.solicitudInfo}>📝 {item.tipo}</Text>
              <Text style={styles.solicitudMotivo}>{item.motivo}</Text>

              {item.documentoNombre && (
                <Text style={styles.solicitudDocumento}>📎 {item.documentoNombre}</Text>
              )}

              <Text style={styles.solicitudVer}>👆 Toca para gestionar</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal de Detalle */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Detalle Solicitud</Text>
              <TouchableOpacity
                style={styles.modalCerrar}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            {solicitudSeleccionada && (
              <ScrollView>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Usuario:</Text>
                  <Text style={styles.modalValue}>{solicitudSeleccionada.usuarioNombre}</Text>

                  <Text style={styles.modalLabel}>Rol:</Text>
                  <Text style={styles.modalValue}>{solicitudSeleccionada.usuarioRol}</Text>

                  <Text style={styles.modalLabel}>Fecha:</Text>
                  <Text style={styles.modalValue}>{solicitudSeleccionada.fechaStr}</Text>

                  <Text style={styles.modalLabel}>Tipo:</Text>
                  <Text style={styles.modalValue}>{solicitudSeleccionada.tipo}</Text>

                  <Text style={styles.modalLabel}>Motivo:</Text>
                  <Text style={styles.modalValue}>{solicitudSeleccionada.motivo}</Text>

                  {solicitudSeleccionada.observaciones && (
                    <>
                      <Text style={styles.modalLabel}>Observaciones:</Text>
                      <Text style={styles.modalValue}>{solicitudSeleccionada.observaciones}</Text>
                    </>
                  )}

                  {solicitudSeleccionada.documentoNombre && (
                    <>
                      <Text style={styles.modalLabel}>Documento:</Text>
                      <Text style={[styles.modalValue, styles.modalDocumento]}>
                        📎 {solicitudSeleccionada.documentoNombre}
                      </Text>
                    </>
                  )}

                  <Text style={styles.modalLabel}>Estado:</Text>
                  <View style={[styles.modalEstado, { backgroundColor: getEstadoColor(solicitudSeleccionada.estado) }]}>
                    <Text style={styles.modalEstadoText}>{solicitudSeleccionada.estado}</Text>
                  </View>

                  {solicitudSeleccionada.estado === 'Pendiente' && (
                    <>
                      <Text style={styles.modalLabel}>Respuesta (opcional):</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={respuesta}
                        onChangeText={setRespuesta}
                        placeholder="Agregar comentario..."
                        multiline
                        numberOfLines={3}
                      />

                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalRechazar]}
                          onPress={() => aprobarRechazar('Rechazado')}
                          disabled={loading}
                        >
                          <Text style={styles.modalButtonText}>❌ Rechazar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalAprobar]}
                          onPress={() => aprobarRechazar('Aprobado')}
                          disabled={loading}
                        >
                          <Text style={styles.modalButtonText}>✅ Aprobar</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
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
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filtrosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  filtrosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filtroItem: {
    flex: 1,
  },
  filtroLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 4,
  },
  filtroInput: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 12,
  },
  filtroText: {
    fontSize: 14,
    color: '#2D3436',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buscarButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listaContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
  },
  solicitudCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  solicitudUsuario: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  solicitudEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  solicitudEstadoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  solicitudInfo: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 2,
  },
  solicitudMotivo: {
    fontSize: 13,
    color: '#2D3436',
    marginTop: 4,
  },
  solicitudDocumento: {
    fontSize: 12,
    color: '#0984E3',
    marginTop: 4,
  },
  solicitudVer: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 6,
    textAlign: 'right',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  modalCerrar: {
    padding: 8,
  },
  modalInfo: {
    paddingVertical: 10,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#636E72',
    marginTop: 8,
    marginBottom: 2,
  },
  modalValue: {
    fontSize: 15,
    color: '#2D3436',
    marginBottom: 4,
  },
  modalDocumento: {
    color: '#0984E3',
  },
  modalEstado: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  modalEstadoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginTop: 4,
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalAprobar: {
    backgroundColor: '#00B894',
  },
  modalRechazar: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default GestionAusencias;