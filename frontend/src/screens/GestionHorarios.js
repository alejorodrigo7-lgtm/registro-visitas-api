import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const diasSemana = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
];

const GestionHorarios = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [horarios, setHorarios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    asignadoA: '',
    diasLaborales: [],
    horaInicio: '08:00',
    horaFin: '17:00',
    intervaloAlerta: 60,
  });

  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  const cargarHorarios = async () => {
    setLoading(true);
    try {
      const response = await api.get('/horarios');
      setHorarios(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await api.get('/auth/usuarios');
      const filtrados = response.data.data.filter(u => 
        ['Tecnico', 'Coordinador'].includes(u.rol) && u._id
      );
      setUsuarios(filtrados);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    cargarHorarios();
    if (isAdminOrJefe) {
      cargarUsuarios();
    }
  }, []);

  const handleCrearHorario = async () => {
    if (!formData.asignadoA) {
      Alert.alert('Error', 'Selecciona un usuario');
      return;
    }
    if (formData.diasLaborales.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día');
      return;
    }

    setLoading(true);
    try {
      await api.post('/horarios', formData);
      Alert.alert('Éxito', 'Horario creado correctamente');
      setModalVisible(false);
      setFormData({
        asignadoA: '',
        diasLaborales: [],
        horaInicio: '08:00',
        horaFin: '17:00',
        intervaloAlerta: 60,
      });
      cargarHorarios();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al crear horario');
    } finally {
      setLoading(false);
    }
  };

  const toggleDia = (diaId) => {
    const current = formData.diasLaborales;
    if (current.includes(diaId)) {
      setFormData({ ...formData, diasLaborales: current.filter(d => d !== diaId) });
    } else {
      setFormData({ ...formData, diasLaborales: [...current, diaId] });
    }
  };

  const toggleActivo = async (id, activo) => {
    try {
      await api.put(`/horarios/${id}`, { activo: !activo });
      cargarHorarios();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar');
    }
  };

  const eliminarHorario = async (id) => {
    Alert.alert(
      'Eliminar Horario',
      '¿Estás seguro de eliminar este horario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/horarios/${id}`);
              cargarHorarios();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al eliminar');
            }
          },
        },
      ]
    );
  };

  const renderHorario = (item) => {
    const dias = item.diasLaborales?.map(d => diasSemana.find(ds => ds.id === d)?.label || d).join(', ') || 'Sin días';

    return (
      <View key={item._id} style={styles.horarioCard}>
        <View style={styles.horarioHeader}>
          <Text style={styles.horarioTitle}>
            {item.asignadoA?.nombre || 'Usuario'}
          </Text>
          <View style={[styles.estadoBadge, item.activo ? styles.activoBadge : styles.inactivoBadge]}>
            <Text style={styles.estadoBadgeText}>
              {item.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <Text style={styles.horarioInfo}>📅 Días: {dias}</Text>
        <Text style={styles.horarioInfo}>🕐 Horario: {item.horaInicio} - {item.horaFin}</Text>
        <Text style={styles.horarioInfo}>⏱️ Alerta cada: {item.intervaloAlerta} minutos</Text>
        <Text style={styles.horarioInfo}>👤 Creado por: {item.creadoPor?.nombre || 'Desconocido'}</Text>

        {isAdminOrJefe && (
          <View style={styles.accionesContainer}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Activo</Text>
              <Switch
                value={item.activo}
                onValueChange={() => toggleActivo(item._id, item.activo)}
                trackColor={{ false: '#767577', true: '#6C5CE7' }}
              />
            </View>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionEliminar]}
              onPress={() => eliminarHorario(item._id)}
            >
              <Text style={styles.accionButtonText}>🗑️ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Horarios</Text>
        {isAdminOrJefe && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addButtonText}>➕ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando horarios...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listaContainer}>
          {horarios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay horarios configurados</Text>
            </View>
          ) : (
            horarios.map(renderHorario)
          )}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Nuevo Horario</Text>

            <Text style={styles.label}>Usuario Asignado *</Text>
            {usuarios.length === 0 ? (
              <Text style={styles.emptyUsuariosText}>No hay técnicos o coordinadores disponibles</Text>
            ) : (
              <View style={styles.usuariosContainer}>
                {usuarios.map((u) => (
                  <TouchableOpacity
                    key={u._id}
                    style={[
                      styles.usuarioButton,
                      formData.asignadoA === u._id && styles.usuarioButtonSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, asignadoA: u._id })}
                  >
                    <Text
                      style={[
                        styles.usuarioButtonText,
                        formData.asignadoA === u._id && styles.usuarioButtonTextSelected,
                      ]}
                    >
                      {u.nombre} ({u.rol})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Días Laborales *</Text>
            <View style={styles.diasContainer}>
              {diasSemana.map((dia) => (
                <TouchableOpacity
                  key={dia.id}
                  style={[
                    styles.diaButton,
                    formData.diasLaborales.includes(dia.id) && styles.diaButtonSelected,
                  ]}
                  onPress={() => toggleDia(dia.id)}
                >
                  <Text
                    style={[
                      styles.diaButtonText,
                      formData.diasLaborales.includes(dia.id) && styles.diaButtonTextSelected,
                    ]}
                  >
                    {dia.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hora Inicio *</Text>
            <TextInput
              style={styles.input}
              value={formData.horaInicio}
              onChangeText={(text) => setFormData({ ...formData, horaInicio: text })}
              placeholder="08:00"
            />

            <Text style={styles.label}>Hora Fin *</Text>
            <TextInput
              style={styles.input}
              value={formData.horaFin}
              onChangeText={(text) => setFormData({ ...formData, horaFin: text })}
              placeholder="17:00"
            />

            <Text style={styles.label}>Intervalo de Alerta (minutos) *</Text>
            <TextInput
              style={styles.input}
              value={String(formData.intervaloAlerta)}
              onChangeText={(text) => {
                const valor = parseInt(text) || 0;
                setFormData({ ...formData, intervaloAlerta: valor });
              }}
              placeholder="60"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>Ej: 60 = cada 1 hora, 30 = cada 30 minutos</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCrearHorario}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  addButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addButtonText: { color: '#6C5CE7', fontWeight: 'bold', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#636E72' },
  listaContainer: { padding: 15 },
  horarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  horarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  horarioTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3436' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  activoBadge: { backgroundColor: '#00B894' },
  inactivoBadge: { backgroundColor: '#FF6B6B' },
  estadoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500' },
  horarioInfo: { fontSize: 14, color: '#636E72', marginVertical: 2 },
  accionesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { marginRight: 10, color: '#2D3436' },
  accionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  accionEliminar: { backgroundColor: '#FF6B6B' },
  accionButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyText: { color: '#636E72', fontSize: 16 },
  emptyUsuariosText: { color: '#636E72', fontSize: 14, textAlign: 'center', padding: 10 },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3436', textAlign: 'center', marginBottom: 15 },
  label: { fontSize: 14, color: '#2D3436', marginBottom: 5, fontWeight: '500' },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 12,
  },
  hint: { fontSize: 12, color: '#636E72', marginBottom: 12, fontStyle: 'italic' },
  usuariosContainer: { marginBottom: 12 },
  usuarioButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    backgroundColor: '#F5F5F5',
    marginBottom: 5,
  },
  usuarioButtonSelected: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  usuarioButtonText: { fontSize: 14, color: '#2D3436' },
  usuarioButtonTextSelected: { color: '#FFFFFF' },
  diasContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  diaButton: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    backgroundColor: '#F5F5F5',
    minWidth: 40,
    alignItems: 'center',
  },
  diaButtonSelected: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  diaButtonText: { fontSize: 14, color: '#2D3436' },
  diaButtonTextSelected: { color: '#FFFFFF' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#DFE6E9' },
  modalButtonSave: { backgroundColor: '#6C5CE7' },
  modalButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});

export default GestionHorarios;