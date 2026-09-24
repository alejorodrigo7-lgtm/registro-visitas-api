import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { gestionService } from '../services/api';

const RevisionGestion = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalVisita, setModalVisita] = useState(false);
  const [modalTecnico, setModalTecnico] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [segundaObservacion, setSegundaObservacion] = useState('');
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('');
  const [procesando, setProcesando] = useState(false);

  // ============================================
  // CARGAR PENDIENTES
  // ============================================
  const cargarPendientes = async () => {
    try {
      setLoading(true);
      const response = await gestionService.getPendientes();
      setServicios(response.data.data || []);
    } catch (error) {
      console.error('Error cargando pendientes:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarPendientes();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarPendientes();
  };

  // ============================================
  // CARGAR TÉCNICOS
  // ============================================
  const cargarTecnicos = async () => {
    try {
      const response = await gestionService.getTecnicos();
      setTecnicos(response.data.data || []);
    } catch (error) {
      console.error('Error cargando técnicos:', error);
      Alert.alert('Error', 'No se pudieron cargar los técnicos');
    }
  };

  // ============================================
  // ABRIR MODAL DETALLE
  // ============================================
  const abrirDetalle = (servicio) => {
    setServicioSeleccionado(servicio);
    setModalDetalle(true);
  };

  // ============================================
  // MARCAR RESUELTO
  // ============================================
  const handleResuelto = () => {
    Alert.alert(
      '✅ Marcar como RESUELTO',
      '¿Confirmas que este servicio fue resuelto por gestión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, resolver',
          onPress: async () => {
            try {
              setProcesando(true);
              await gestionService.marcarResuelto(servicioSeleccionado._id, '');
              setModalDetalle(false);
              setServicioSeleccionado(null);
              Alert.alert('✅ Éxito', 'Servicio marcado como RESUELTO');
              cargarPendientes();
            } catch (error) {
              console.error('Error marcando resuelto:', error);
              Alert.alert('Error', error.response?.data?.message || 'No se pudo marcar');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  // ============================================
  // ABRIR MODAL VISITA PRESENCIAL
  // ============================================
  const handleAbrirVisita = async () => {
    setSegundaObservacion('');
    setModalDetalle(false);
    setModalVisita(true);
    if (tecnicos.length === 0) {
      await cargarTecnicos();
    }
  };

  // ============================================
  // PASAR A MODAL TÉCNICO
  // ============================================
  const handleSiguiente = () => {
    if (!segundaObservacion || segundaObservacion.trim() === '') {
      Alert.alert('Error', 'La segunda observación es obligatoria');
      return;
    }
    setModalVisita(false);
    setModalTecnico(true);
  };

  // ============================================
  // ASIGNAR VISITA PRESENCIAL
  // ============================================
  const handleAsignarVisita = async () => {
    if (!tecnicoSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un técnico');
      return;
    }

    try {
      setProcesando(true);
      await gestionService.asignarVisita(
        servicioSeleccionado._id,
        segundaObservacion,
        tecnicoSeleccionado
      );

      const tecnicoNombre = tecnicos.find((t) => t._id === tecnicoSeleccionado)?.nombre || 'técnico';

      setModalTecnico(false);
      setServicioSeleccionado(null);
      setSegundaObservacion('');
      setTecnicoSeleccionado('');
      Alert.alert('✅ Asignado', `Visita presencial asignada a ${tecnicoNombre}`);
      cargarPendientes();
    } catch (error) {
      console.error('Error asignando visita:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo asignar');
    } finally {
      setProcesando(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  const renderServicio = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirDetalle(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardCliente} numberOfLines={1}>
          {item.cliente}
        </Text>
        <View style={styles.badgePendiente}>
          <Text style={styles.badgePendienteText}>PENDIENTE</Text>
        </View>
      </View>
      <Text style={styles.cardInfo}>Código: {item.codigoIdentificador}</Text>
      <Text style={styles.cardInfo}>{item.barrio}</Text>
      <Text style={styles.cardInfo} numberOfLines={1}>
        {item.direccion}
      </Text>
      <Text style={styles.cardObs} numberOfLines={2}>
        📝 {item.observaciones}
      </Text>
      {item.imagen && (
        <Image source={{ uri: item.imagen }} style={styles.cardImagen} />
      )}
    </TouchableOpacity>
  );

  if (loading && servicios.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando servicios pendientes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={servicios}
        keyExtractor={(item) => item._id}
        renderItem={renderServicio}
        contentContainerStyle={styles.listaContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No hay servicios pendientes</Text>
            <Text style={styles.emptySubtext}>
              Todos los servicios de gestión han sido revisados
            </Text>
          </View>
        }
      />

      {/* ============================================ */}
      {/* MODAL 1: DETALLE */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalle}
        onRequestClose={() => setModalDetalle(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <ScrollView>
              {servicioSeleccionado && (
                <>
                  <Text style={styles.modalTitle}>
                    📋 Revisar Servicio
                  </Text>

                  {servicioSeleccionado.imagen && (
                    <Image
                      source={{ uri: servicioSeleccionado.imagen }}
                      style={styles.modalImagen}
                    />
                  )}

                  <View style={styles.modalDatosBox}>
                    <Text style={styles.modalDatoLabel}>Cliente:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.cliente}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Código:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.codigoIdentificador}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Barrio:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.barrio}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Dirección:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.direccion}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Teléfono:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.telefono}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Teléfono de contacto:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.telefonoContacto || 'No especificado'}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Tipo de contacto:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.tipoContacto || 'No especificado'}
                    </Text>

                    <Text style={styles.modalDatoLabel}>Descripción:</Text>
                    <Text style={styles.modalDatoValor}>
                      {servicioSeleccionado.observaciones}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.botonAccion, styles.botonResuelto]}
                    onPress={handleResuelto}
                    disabled={procesando}
                  >
                    <Text style={styles.botonAccionText}>✅ RESUELTO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.botonAccion, styles.botonVisita]}
                    onPress={handleAbrirVisita}
                    disabled={procesando}
                  >
                    <Text style={styles.botonAccionText}>🔵 VISITA PRESENCIAL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalCancelar}
                    onPress={() => {
                      setModalDetalle(false);
                      setServicioSeleccionado(null);
                    }}
                  >
                    <Text style={styles.modalCancelarText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* MODAL 2: SEGUNDA OBSERVACIÓN */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisita}
        onRequestClose={() => setModalVisita(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Segunda Observación</Text>
            <Text style={styles.modalSubtitle}>
              Detalla qué se debe hacer en la visita presencial
            </Text>

            <TextInput
              style={styles.textArea}
              value={segundaObservacion}
              onChangeText={setSegundaObservacion}
              placeholder="Escribe la segunda observación..."
              multiline
              numberOfLines={5}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.botonAccion, styles.botonSiguiente]}
              onPress={handleSiguiente}
            >
              <Text style={styles.botonAccionText}>Siguiente →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelar}
              onPress={() => {
                setModalVisita(false);
                setSegundaObservacion('');
                setServicioSeleccionado(null);
              }}
            >
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* MODAL 3: SELECTOR DE TÉCNICO */}
      {/* ============================================ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTecnico}
        onRequestClose={() => setModalTecnico(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👷 Selecciona un Técnico</Text>
            <Text style={styles.modalSubtitle}>
              El servicio irá al repositorio del técnico elegido
            </Text>

            {tecnicos.length === 0 ? (
              <ActivityIndicator color="#6C5CE7" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={tecnicos}
                keyExtractor={(item) => item._id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.tecnicoItem,
                      tecnicoSeleccionado === item._id && styles.tecnicoItemSelected,
                    ]}
                    onPress={() => setTecnicoSeleccionado(item._id)}
                  >
                    <Text
                      style={[
                        styles.tecnicoNombre,
                        tecnicoSeleccionado === item._id &&
                          styles.tecnicoNombreSelected,
                      ]}
                    >
                      {item.nombre}
                    </Text>
                    <Text style={styles.tecnicoEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.botonAccion, styles.botonAsignar]}
              onPress={handleAsignarVisita}
              disabled={procesando || !tecnicoSeleccionado}
            >
              {procesando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botonAccionText}>🔵 ASIGNAR VISITA</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelar}
              onPress={() => {
                setModalTecnico(false);
                setSegundaObservacion('');
                setTecnicoSeleccionado('');
                setServicioSeleccionado(null);
              }}
            >
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#636E72',
  },
  listaContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCliente: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginRight: 8,
  },
  badgePendiente: {
    backgroundColor: '#FDCB6E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePendienteText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  cardInfo: { fontSize: 13, color: '#636E72', marginTop: 2 },
  cardObs: {
    fontSize: 13,
    color: '#2D3436',
    marginTop: 8,
    fontStyle: 'italic',
  },
  cardImagen: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  emptySubtext: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 6,
    textAlign: 'center',
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
  modalContentLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalImagen: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalDatosBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  modalDatoLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 8,
    fontWeight: '600',
  },
  modalDatoValor: {
    fontSize: 15,
    color: '#2D3436',
    marginTop: 2,
  },
  textArea: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  botonAccion: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  botonAccionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonResuelto: { backgroundColor: '#00B894' },
  botonVisita: { backgroundColor: '#0984E3' },
  botonSiguiente: { backgroundColor: '#6C5CE7' },
  botonAsignar: { backgroundColor: '#0984E3', marginTop: 12 },
  modalCancelar: {
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelarText: {
    color: '#636E72',
    fontSize: 14,
    fontWeight: '500',
  },
  tecnicoItem: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    marginBottom: 8,
  },
  tecnicoItemSelected: {
    backgroundColor: '#6C5CE7',
  },
  tecnicoNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  tecnicoNombreSelected: {
    color: '#FFFFFF',
  },
  tecnicoEmail: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
});

export default RevisionGestion;