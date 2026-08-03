import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const GestionHorarios = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [horarios, setHorarios] = useState([]);
  const [miHorario, setMiHorario] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [jefes, setJefes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSolicitudVisible, setModalSolicitudVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);

  const isAdmin = user?.rol === 'Admin';
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);
  const isTecnicoOrCoordinador = ['Tecnico', 'Coordinador'].includes(user?.rol);

  const [formData, setFormData] = useState({
    asignadoA: '',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    horaInicio: '08:00',
    horaFin: '17:00',
    horaAlmuerzoInicio: '12:00',
    horaAlmuerzoFin: '13:00',
    intervaloAlerta: '30',
  });

  const [solicitudData, setSolicitudData] = useState({
    tipo: 'PERMISO',
    fecha: new Date(),
    horaInicio: '08:00',
    horaFin: '17:00',
    observacion: '',
    jefeId: '',
  });

  const [showFechaInicio, setShowFechaInicio] = useState(false);
  const [showFechaFin, setShowFechaFin] = useState(false);
  const [showSolicitudFecha, setShowSolicitudFecha] = useState(false);

  // ============================================
  // CARGAR DATOS
  // ============================================
  const cargarDatos = async () => {
    try {
      // Cargar horarios
      const responseHorarios = await api.get('/horarios');
      setHorarios(responseHorarios.data.data || []);

      // Cargar mi horario (si es Técnico/Coordinador)
      if (isTecnicoOrCoordinador) {
        const responseMiHorario = await api.get('/horarios/mi-horario');
        setMiHorario(responseMiHorario.data.data);
      }

      // Cargar usuarios para asignar horarios (solo Admin/Jefe)
      if (isAdminOrJefe) {
        const responseUsuarios = await api.get('/auth/usuarios');
        const usuariosFiltrados = responseUsuarios.data.data.filter(
          u => u.rol === 'Tecnico' || u.rol === 'Coordinador'
        );
        setUsuarios(usuariosFiltrados);
      }

      // Cargar jefes
      try {
        const responseJefes = await api.get('/auth/jefes');
        setJefes(responseJefes.data.data || []);
      } catch (jefeError) {
        if (isAdminOrJefe) {
          const responseJefes2 = await api.get('/auth/usuarios');
          const jefesFiltrados = responseJefes2.data.data.filter(
            u => u.rol === 'Admin' || u.rol === 'Jefe'
          );
          setJefes(jefesFiltrados);
        }
      }

      // Cargar solicitudes
      const responseSolicitudes = await api.get('/horarios/solicitudes');
      setSolicitudes(responseSolicitudes.data.data || []);

    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // ============================================
  // CREAR HORARIO (SOLO ADMIN/JEFE)
  // ============================================
  const handleCreateHorario = async () => {
    if (!isAdminOrJefe) {
      Alert.alert('⛔ Acceso Denegado', 'Solo Administradores y Jefes pueden crear horarios');
      return;
    }

    if (!formData.asignadoA) {
      Alert.alert('Error', 'Selecciona un usuario');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        asignadoA: formData.asignadoA,
        fechaInicio: formData.fechaInicio.toISOString(),
        fechaFin: formData.fechaFin.toISOString(),
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        horaAlmuerzoInicio: formData.horaAlmuerzoInicio,
        horaAlmuerzoFin: formData.horaAlmuerzoFin,
        intervaloAlerta: parseInt(formData.intervaloAlerta),
      };

      await api.post('/horarios', dataToSend);
      Alert.alert('✅ Éxito', 'Horario creado correctamente');
      setModalVisible(false);
      cargarDatos();
      resetFormHorario();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al crear horario');
    } finally {
      setLoading(false);
    }
  };

  const resetFormHorario = () => {
    setFormData({
      asignadoA: '',
      fechaInicio: new Date(),
      fechaFin: new Date(),
      horaInicio: '08:00',
      horaFin: '17:00',
      horaAlmuerzoInicio: '12:00',
      horaAlmuerzoFin: '13:00',
      intervaloAlerta: '30',
    });
  };

  // ============================================
  // SOLICITUD DE PERMISO/RESESO
  // ============================================
  const handleCrearSolicitud = async () => {
    if (!solicitudData.jefeId) {
      Alert.alert('Error', 'Selecciona un jefe');
      return;
    }
    if (!solicitudData.observacion.trim()) {
      Alert.alert('Error', 'La observación es obligatoria');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        tipo: solicitudData.tipo,
        fecha: solicitudData.fecha.toISOString(),
        horaInicio: solicitudData.horaInicio,
        horaFin: solicitudData.horaFin,
        observacion: solicitudData.observacion,
        jefeId: solicitudData.jefeId,
      };

      await api.post('/horarios/solicitudes', dataToSend);
      Alert.alert('✅ Éxito', 'Solicitud enviada correctamente');
      setModalSolicitudVisible(false);
      cargarDatos();
      resetFormSolicitud();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar solicitud');
    } finally {
      setLoading(false);
    }
  };

  const resetFormSolicitud = () => {
    setSolicitudData({
      tipo: 'PERMISO',
      fecha: new Date(),
      horaInicio: '08:00',
      horaFin: '17:00',
      observacion: '',
      jefeId: '',
    });
  };

  // ============================================
  // APROBAR/DESAPROBAR SOLICITUD (SOLO ADMIN/JEFE)
  // ============================================
  const handleActualizarSolicitud = async (solicitudId, estado, comentario = '') => {
    if (!isAdminOrJefe) {
      Alert.alert('⛔ Acceso Denegado', 'Solo Administradores y Jefes pueden gestionar solicitudes');
      return;
    }

    Alert.alert(
      'Confirmar',
      `¿Estás seguro de ${estado === 'APROBADO' ? 'aprobar' : 'desaprobar'} esta solicitud?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: estado === 'APROBADO' ? 'Aprobar' : 'Desaprobar',
          onPress: async () => {
            try {
              await api.put(`/horarios/solicitudes/${solicitudId}`, {
                estado,
                comentarioJefe: comentario,
              });
              Alert.alert('✅ Éxito', `Solicitud ${estado === 'APROBADO' ? 'aprobada' : 'desaprobada'}`);
              cargarDatos();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al procesar');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // 🗑️ ELIMINAR HORARIO (SOLO ADMIN)
  // ============================================
  const handleEliminarHorario = async (id, nombre) => {
    if (!isAdmin) {
      Alert.alert('⛔ Acceso Denegado', 'Solo los Administradores pueden eliminar horarios');
      return;
    }

    Alert.alert(
      '🗑️ Eliminar Horario',
      `¿Estás seguro de eliminar el horario de ${nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/horarios/${id}`);
              Alert.alert('✅ Éxito', 'Horario eliminado correctamente');
              setModalDetalleVisible(false);
              cargarDatos();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al eliminar horario');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // 🔄 DESACTIVAR/ACTIVAR HORARIO (ADMIN Y JEFE)
  // ============================================
  const handleToggleHorario = async (id, activo, nombre) => {
    if (!isAdminOrJefe) {
      Alert.alert('⛔ Acceso Denegado', 'Solo Administradores y Jefes pueden cambiar el estado');
      return;
    }

    const nuevoEstado = !activo;
    const mensaje = nuevoEstado ? 'activar' : 'desactivar';

    Alert.alert(
      `🔄 ${mensaje === 'activar' ? 'Activar' : 'Desactivar'} Horario`,
      `¿Estás seguro de ${mensaje} el horario de ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: mensaje === 'activar' ? 'Activar' : 'Desactivar',
          onPress: async () => {
            try {
              await api.put(`/horarios/${id}`, { activo: nuevoEstado });
              Alert.alert('✅ Éxito', `Horario ${mensaje === 'activar' ? 'activado' : 'desactivado'} correctamente`);
              setModalDetalleVisible(false);
              cargarDatos();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al cambiar estado');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Gestión de Horarios</Text>
        <Text style={styles.subtitle}>
          {isAdminOrJefe ? 'Administra los horarios de los técnicos' : 'Consulta tu horario'}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ============================================ */}
        {/* 📍 ASISTENCIA - Coordinador y Técnico */}
        {/* ============================================ */}
        {isTecnicoOrCoordinador && (
          <TouchableOpacity
            style={[styles.menuItem, styles.asistenciaMenuItem]}
            onPress={() => navigation.navigate('AsistenciaScreen')}
          >
            <View style={[styles.menuIconContainer, styles.greenIcon]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#00B894" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, styles.asistenciaText]}>📍 Asistencia</Text>
              <Text style={styles.menuDescription}>Registrar entrada, almuerzo y salida</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* ============================================ */}
        {/* 📝 PEDIR AUSENCIA - Coordinador y Técnico */}
        {/* ============================================ */}
        {isTecnicoOrCoordinador && (
          <TouchableOpacity
            style={[styles.menuItem, styles.ausenciaMenuItem]}
            onPress={() => navigation.navigate('PedirAusenciaScreen')}
          >
            <View style={[styles.menuIconContainer, styles.orangeIcon]}>
              <Ionicons name="alert-circle-outline" size={24} color="#E17055" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, styles.ausenciaText]}>📝 Pedir Ausencia</Text>
              <Text style={styles.menuDescription}>Solicitar justificación de ausencia</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* ============================================ */}
        {/* GESTIONAR AUSENCIAS - Solo Admin/Jefe */}
        {/* ============================================ */}
        {isAdminOrJefe && (
          <TouchableOpacity
            style={[styles.menuItem, styles.gestionAusenciaMenuItem]}
            onPress={() => navigation.navigate('GestionAusencias')}
          >
            <View style={[styles.menuIconContainer, styles.purpleIcon]}>
              <Ionicons name="people-outline" size={24} color="#6C5CE7" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuTitle, styles.gestionAusenciaText]}>📋 Gestionar Ausencias</Text>
              <Text style={styles.menuDescription}>Aprobar o rechazar solicitudes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
          </TouchableOpacity>
        )}

        {/* ============================================ */}
        {/* MI HORARIO - Técnico/Coordinador */}
        {/* ============================================ */}
        {isTecnicoOrCoordinador && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Mi Horario</Text>
            {miHorario ? (
              <View style={styles.miHorarioCard}>
                <Text style={styles.miHorarioInfo}>
                  📅 {new Date(miHorario.fechaInicio).toLocaleDateString('es-ES')} - {new Date(miHorario.fechaFin).toLocaleDateString('es-ES')}
                </Text>
                <Text style={styles.miHorarioInfo}>
                  🕐 {miHorario.horaInicio} - {miHorario.horaFin}
                </Text>
                <Text style={styles.miHorarioInfo}>
                  🍽️ Almuerzo: {miHorario.horaAlmuerzoInicio} - {miHorario.horaAlmuerzoFin}
                </Text>
                <Text style={styles.miHorarioInfo}>
                  ⚠️ Alerta: {miHorario.intervaloAlerta} min
                </Text>
                <Text style={styles.miHorarioCreador}>
                  👤 Creado por: {miHorario.creadoPor?.nombre || 'Desconocido'}
                </Text>
              </View>
            ) : (
              <View style={styles.miHorarioEmpty}>
                <Text style={styles.miHorarioEmptyText}>No tienes un horario activo</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.solicitarButton}
              onPress={() => setModalSolicitudVisible(true)}
            >
              <Text style={styles.solicitarButtonText}>📝 Pedir Permiso/Reseso</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================ */}
        {/* LISTA DE HORARIOS - Solo Admin/Jefe */}
        {/* ============================================ */}
        {isAdminOrJefe && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Horarios</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addButtonText}>➕</Text>
              </TouchableOpacity>
            </View>

            {horarios.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay horarios creados</Text>
              </View>
            ) : (
              horarios.map((horario) => (
                <TouchableOpacity
                  key={horario._id}
                  style={styles.horarioCard}
                  onPress={() => {
                    setHorarioSeleccionado(horario);
                    setModalDetalleVisible(true);
                  }}
                >
                  <View style={styles.horarioHeader}>
                    <Text style={styles.horarioNombre}>{horario.asignadoA?.nombre || 'N/A'}</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: horario.activo ? '#00B894' : '#FF6B6B' }]}>
                      <Text style={styles.estadoBadgeText}>
                        {horario.activo ? '✅ Activo' : '❌ Inactivo'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.horarioInfo}>
                    📅 {new Date(horario.fechaInicio).toLocaleDateString('es-ES')} - {new Date(horario.fechaFin).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.horarioInfo}>
                    🕐 {horario.horaInicio} - {horario.horaFin}
                  </Text>
                  <Text style={styles.horarioInfo}>
                    👤 Creado por: {horario.creadoPor?.nombre || 'N/A'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ============================================ */}
        {/* SOLICITUDES PENDIENTES - Solo Admin/Jefe */}
        {/* ============================================ */}
        {isAdminOrJefe && solicitudes.filter(s => s.estado === 'PENDIENTE').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Solicitudes Pendientes</Text>
            {solicitudes
              .filter(s => s.estado === 'PENDIENTE')
              .map((solicitud) => (
                <View key={solicitud._id} style={styles.solicitudCard}>
                  <Text style={styles.solicitudUsuario}>
                    👤 {solicitud.usuarioNombre}
                  </Text>
                  <Text style={styles.solicitudInfo}>
                    📋 {solicitud.tipo === 'PERMISO' ? 'Permiso' : 'Reseso'}
                  </Text>
                  <Text style={styles.solicitudInfo}>
                    📅 {new Date(solicitud.fecha).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.solicitudInfo}>
                    🕐 {solicitud.horaInicio} - {solicitud.horaFin}
                  </Text>
                  <Text style={styles.solicitudInfo}>
                    💬 {solicitud.observacion}
                  </Text>
                  <View style={styles.solicitudButtons}>
                    <TouchableOpacity
                      style={[styles.solicitudButton, styles.solicitudAprobar]}
                      onPress={() => handleActualizarSolicitud(solicitud._id, 'APROBADO')}
                    >
                      <Text style={styles.solicitudButtonText}>✅ Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.solicitudButton, styles.solicitudDesaprobar]}
                      onPress={() => handleActualizarSolicitud(solicitud._id, 'DESAPROBADO')}
                    >
                      <Text style={styles.solicitudButtonText}>❌ Desaprobar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* ============================================ */}
      {/* MODAL CREAR HORARIO */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Crear Horario</Text>

            <Text style={styles.modalLabel}>Usuario *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.asignadoA}
                onValueChange={(value) => setFormData(prev => ({ ...prev, asignadoA: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona un usuario" value="" />
                {usuarios.map((u) => (
                  <Picker.Item key={u._id} label={`${u.nombre} (${u.rol})`} value={u._id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Fecha Inicio *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowFechaInicio(true)}
            >
              <Text style={styles.dateText}>
                {formData.fechaInicio.toLocaleDateString('es-ES')}
              </Text>
            </TouchableOpacity>
            {showFechaInicio && (
              <DateTimePicker
                value={formData.fechaInicio}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFechaInicio(false);
                  if (selectedDate) setFormData(prev => ({ ...prev, fechaInicio: selectedDate }));
                }}
              />
            )}

            <Text style={styles.modalLabel}>Fecha Fin *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowFechaFin(true)}
            >
              <Text style={styles.dateText}>
                {formData.fechaFin.toLocaleDateString('es-ES')}
              </Text>
            </TouchableOpacity>
            {showFechaFin && (
              <DateTimePicker
                value={formData.fechaFin}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFechaFin(false);
                  if (selectedDate) setFormData(prev => ({ ...prev, fechaFin: selectedDate }));
                }}
              />
            )}

            <Text style={styles.modalLabel}>Hora Inicio *</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.horaInicio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, horaInicio: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Hora Fin *</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.horaFin}
              onChangeText={(text) => setFormData(prev => ({ ...prev, horaFin: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Hora Almuerzo Inicio</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.horaAlmuerzoInicio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, horaAlmuerzoInicio: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Hora Almuerzo Fin</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.horaAlmuerzoFin}
              onChangeText={(text) => setFormData(prev => ({ ...prev, horaAlmuerzoFin: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Intervalo Alerta (minutos) *</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.intervaloAlerta}
              onChangeText={(text) => setFormData(prev => ({ ...prev, intervaloAlerta: text }))}
              placeholder="30"
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCreateHorario}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>💾 Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* MODAL SOLICITUD PERMISO/RESESO */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalSolicitudVisible}
        onRequestClose={() => setModalSolicitudVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Solicitar Permiso/Reseso</Text>

            <Text style={styles.modalLabel}>Tipo *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={solicitudData.tipo}
                onValueChange={(value) => setSolicitudData(prev => ({ ...prev, tipo: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Permiso" value="PERMISO" />
                <Picker.Item label="Reseso" value="RESESO" />
                <Picker.Item label="Horario Especial" value="HORARIO_ESPECIAL" />
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Fecha *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowSolicitudFecha(true)}
            >
              <Text style={styles.dateText}>
                {solicitudData.fecha.toLocaleDateString('es-ES')}
              </Text>
            </TouchableOpacity>
            {showSolicitudFecha && (
              <DateTimePicker
                value={solicitudData.fecha}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowSolicitudFecha(false);
                  if (selectedDate) setSolicitudData(prev => ({ ...prev, fecha: selectedDate }));
                }}
              />
            )}

            <Text style={styles.modalLabel}>Hora Inicio *</Text>
            <TextInput
              style={styles.modalInput}
              value={solicitudData.horaInicio}
              onChangeText={(text) => setSolicitudData(prev => ({ ...prev, horaInicio: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Hora Fin *</Text>
            <TextInput
              style={styles.modalInput}
              value={solicitudData.horaFin}
              onChangeText={(text) => setSolicitudData(prev => ({ ...prev, horaFin: text }))}
              placeholder="HH:MM"
            />

            <Text style={styles.modalLabel}>Observación *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={solicitudData.observacion}
              onChangeText={(text) => setSolicitudData(prev => ({ ...prev, observacion: text }))}
              placeholder="Motivo de la solicitud..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Jefe a quien solicitar *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={solicitudData.jefeId}
                onValueChange={(value) => {
                  setSolicitudData(prev => ({ ...prev, jefeId: value }));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona un jefe" value="" />
                {jefes && jefes.length > 0 ? (
                  jefes.map((j) => (
                    <Picker.Item key={j._id} label={`${j.nombre} (${j.rol})`} value={j._id} />
                  ))
                ) : (
                  <Picker.Item label="No hay jefes disponibles" value="" />
                )}
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalSolicitudVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCrearSolicitud}
                disabled={loading || !solicitudData.jefeId}
              >
                <Text style={styles.modalButtonText}>📤 Enviar Solicitud</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* MODAL DETALLE HORARIO */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalleVisible}
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Detalle Horario</Text>

            {horarioSeleccionado && (
              <View>
                <Text style={styles.modalLabel}>Usuario:</Text>
                <Text style={styles.modalValue}>{horarioSeleccionado.asignadoA?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Fecha Inicio:</Text>
                <Text style={styles.modalValue}>
                  {new Date(horarioSeleccionado.fechaInicio).toLocaleDateString('es-ES')}
                </Text>

                <Text style={styles.modalLabel}>Fecha Fin:</Text>
                <Text style={styles.modalValue}>
                  {new Date(horarioSeleccionado.fechaFin).toLocaleDateString('es-ES')}
                </Text>

                <Text style={styles.modalLabel}>Horario:</Text>
                <Text style={styles.modalValue}>
                  {horarioSeleccionado.horaInicio} - {horarioSeleccionado.horaFin}
                </Text>

                <Text style={styles.modalLabel}>Almuerzo:</Text>
                <Text style={styles.modalValue}>
                  {horarioSeleccionado.horaAlmuerzoInicio} - {horarioSeleccionado.horaAlmuerzoFin}
                </Text>

                <Text style={styles.modalLabel}>Intervalo Alerta:</Text>
                <Text style={styles.modalValue}>{horarioSeleccionado.intervaloAlerta} minutos</Text>

                <Text style={styles.modalLabel}>Creado por:</Text>
                <Text style={styles.modalValue}>{horarioSeleccionado.creadoPor?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: horarioSeleccionado.activo ? '#00B894' : '#FF6B6B', alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>
                    {horarioSeleccionado.activo ? '✅ Activo' : '❌ Inactivo'}
                  </Text>
                </View>

                {isAdminOrJefe && (
                  <View style={styles.detalleAcciones}>
                    <TouchableOpacity
                      style={[
                        styles.detalleButton,
                        horarioSeleccionado?.activo ? styles.detalleButtonDesactivar : styles.detalleButtonActivar
                      ]}
                      onPress={() => handleToggleHorario(
                        horarioSeleccionado._id,
                        horarioSeleccionado.activo,
                        horarioSeleccionado.asignadoA?.nombre || 'N/A'
                      )}
                    >
                      <Text style={styles.detalleButtonText}>
                        {horarioSeleccionado?.activo ? '🔴 Desactivar' : '🟢 Activar'}
                      </Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <TouchableOpacity
                        style={[styles.detalleButton, styles.detalleButtonEliminar]}
                        onPress={() => handleEliminarHorario(
                          horarioSeleccionado._id,
                          horarioSeleccionado.asignadoA?.nombre || 'N/A'
                        )}
                      >
                        <Text style={styles.detalleButtonText}>🗑️ Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalDetalleVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  addButton: {
    backgroundColor: '#6C5CE7',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greenIcon: {
    backgroundColor: '#E8F8F5',
  },
  orangeIcon: {
    backgroundColor: '#FFF3E0',
  },
  purpleIcon: {
    backgroundColor: '#F3E5F5',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  menuDescription: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  asistenciaMenuItem: {
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#00B894',
  },
  asistenciaText: {
    color: '#00B894',
  },
  ausenciaMenuItem: {
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#E17055',
  },
  ausenciaText: {
    color: '#E17055',
  },
  gestionAusenciaMenuItem: {
    backgroundColor: '#F8F0FF',
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  gestionAusenciaText: {
    color: '#6C5CE7',
  },
  horarioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  horarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  horarioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  horarioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
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
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
  },
  miHorarioCard: {
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  miHorarioInfo: {
    fontSize: 15,
    color: '#2D3436',
    marginVertical: 3,
  },
  miHorarioCreador: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 5,
    fontStyle: 'italic',
  },
  miHorarioEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  miHorarioEmptyText: {
    fontSize: 14,
    color: '#636E72',
  },
  solicitarButton: {
    backgroundColor: '#FDCB6E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  solicitarButtonText: {
    color: '#2D3436',
    fontSize: 16,
    fontWeight: 'bold',
  },
  solicitudCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FDCB6E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  solicitudUsuario: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  solicitudInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  solicitudButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  solicitudButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  solicitudAprobar: {
    backgroundColor: '#00B894',
  },
  solicitudDesaprobar: {
    backgroundColor: '#FF6B6B',
  },
  solicitudButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    marginTop: 10,
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
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
    marginBottom: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#2D3436',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#DFE6E9',
  },
  modalButtonSave: {
    backgroundColor: '#6C5CE7',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#2D3436',
    fontSize: 14,
    fontWeight: '500',
  },
  detalleAcciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  detalleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  detalleButtonDesactivar: {
    backgroundColor: '#E17055',
  },
  detalleButtonActivar: {
    backgroundColor: '#00B894',
  },
  detalleButtonEliminar: {
    backgroundColor: '#FF6B6B',
  },
  detalleButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default GestionHorarios;