import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EjecucionServicio = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [serviciosPendientes, setServiciosPendientes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [ejecucionData, setEjecucionData] = useState({
    observaciones: '',
    materiales: [],
    macEquipo: '',
    macRepetidor: '',
    snReceptor: '',
  });
  const [materialSeleccionado, setMaterialSeleccionado] = useState('');
  const [cantidadMaterial, setCantidadMaterial] = useState('1');
  const [modalPendienteVisible, setModalPendienteVisible] = useState(false);
  const [observacionPendiente, setObservacionPendiente] = useState('');

  // 📦 Estado de la bodega
  const [bodega, setBodega] = useState(null);
  const [cargandoBodega, setCargandoBodega] = useState(false);

  const isAdminOrJefeOrTecnico = ['Admin', 'Jefe', 'Tecnico'].includes(user?.rol);

  const opcionesMateriales = [
    'FIBRA EN METROS',
    'CABLE EN METROS',
    'EQUIPO ONU',
    'REPETIDOR',
    'RECEPTOR',
    'F56',
    'DIV2',
    'DIV3',
    'CONECTOR VERDE',
    'CONECTOR AZUL',
    'ROSETTA',
    'TERMO',
    'CABLE LAN EN METROS',
    'GRAPAS',
    'AMARRAS',
  ];

  const cargarServicios = async () => {
    try {
      const responseTomados = await api.get('/servicios/estado/TOMADO');
      const responsePendientes = await api.get('/servicios/estado/PENDIENTE');
      
      const tomados = responseTomados.data.data || [];
      const pendientes = responsePendientes.data.data || [];
      
      setServicios(tomados);
      setServiciosPendientes(pendientes);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 📦 Cargar bodega del usuario
  const cargarBodega = async () => {
    setCargandoBodega(true);
    try {
      const response = await api.get(`/bodegas?usuario=${user._id}`);
      if (response.data.success && response.data.data.length > 0) {
        setBodega(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error al cargar bodega:', error);
    } finally {
      setCargandoBodega(false);
    }
  };

  useEffect(() => {
    cargarServicios();
    cargarBodega();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarServicios();
    cargarBodega();
  };

  // 🔍 Verificar stock disponible en bodega
  const verificarStock = (nombreMaterial, cantidad) => {
    if (!bodega) {
      Alert.alert('Sin bodega', 'No tienes una bodega asignada. Contacta a un administrador.');
      return false;
    }

    const materialEnBodega = bodega.materiales?.find(
      m => m.nombre === nombreMaterial
    );

    if (!materialEnBodega) {
      Alert.alert('Material no encontrado', `El material "${nombreMaterial}" no existe en tu bodega.`);
      return false;
    }

    if (materialEnBodega.cantidad < cantidad) {
      Alert.alert(
        'Stock insuficiente',
        `Stock disponible de ${nombreMaterial}: ${materialEnBodega.cantidad}`
      );
      return false;
    }

    return true;
  };

  const agregarMaterial = () => {
    if (!materialSeleccionado) {
      Alert.alert('Error', 'Selecciona un material');
      return;
    }
    const cantidad = parseInt(cantidadMaterial);
    if (isNaN(cantidad) || cantidad < 1) {
      Alert.alert('Error', 'La cantidad debe ser un número válido');
      return;
    }

    // Verificar stock en bodega
    if (!verificarStock(materialSeleccionado, cantidad)) {
      return;
    }

    setEjecucionData(prev => ({
      ...prev,
      materiales: [...prev.materiales, { nombre: materialSeleccionado, cantidad }],
    }));
    setMaterialSeleccionado('');
    setCantidadMaterial('1');
  };

  const eliminarMaterial = (index) => {
    setEjecucionData(prev => ({
      ...prev,
      materiales: prev.materiales.filter((_, i) => i !== index),
    }));
  };

  const ejecutarServicio = async () => {
    if (!ejecucionData.observaciones) {
      Alert.alert('Error', 'Las observaciones son obligatorias');
      return;
    }

    if (ejecucionData.materiales.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un material usado');
      return;
    }

    // Verificar stock nuevamente antes de ejecutar
    for (const material of ejecucionData.materiales) {
      if (!verificarStock(material.nombre, material.cantidad)) {
        return;
      }
    }

    Alert.alert(
      'Confirmar Ejecución',
      `¿Estás seguro de ejecutar este servicio con ${ejecucionData.materiales.length} materiales?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            try {
              // 1. Restar materiales de la bodega
              let alertasStock = null;
              if (bodega) {
                try {
                  const restarResponse = await api.post(`/bodegas/${bodega._id}/restar-material`, {
                    materiales: ejecucionData.materiales,
                  });
                  
                  if (restarResponse.data.alertas) {
                    alertasStock = restarResponse.data.alertas.materiales;
                  }
                  
                  // Actualizar bodega local
                  await cargarBodega();
                } catch (bodegaError) {
                  console.error('Error al restar materiales:', bodegaError);
                  Alert.alert(
                    'Error en bodega',
                    'No se pudieron restar los materiales de la bodega. El servicio no se ejecutará.'
                  );
                  return;
                }
              }

              // 2. Ejecutar el servicio
              await api.put(`/servicios/${servicioSeleccionado._id}/ejecutar`, ejecucionData);

              // 3. Mostrar alertas de stock bajo si existen
              if (alertasStock && alertasStock.length > 0) {
                Alert.alert(
                  '⚠️ Alerta de Stock Bajo',
                  `Los siguientes materiales están en su nivel mínimo:\n\n${alertasStock.map(m => 
                    `• ${m.nombre}: ${m.cantidad} (mínimo: ${m.minimo})`
                  ).join('\n')}\n\nRevisa tu bodega para reabastecer.`
                );
              }

              Alert.alert('Éxito', `Servicio ejecutado para ${servicioSeleccionado.cliente}`);
              setModalVisible(false);
              setEjecucionData({
                observaciones: '',
                materiales: [],
                macEquipo: '',
                macRepetidor: '',
                snReceptor: '',
              });
              cargarServicios();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al ejecutar el servicio');
            }
          },
        },
      ]
    );
  };

  const pendienteServicio = async () => {
    if (!observacionPendiente) {
      Alert.alert('Error', 'La observación es obligatoria');
      return;
    }

    Alert.alert(
      'Confirmar Pendiente',
      '¿Estás seguro de marcar este servicio como pendiente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar Pendiente',
          onPress: async () => {
            try {
              await api.put(`/servicios/${servicioSeleccionado._id}/pendiente`, {
                observaciones: observacionPendiente,
              });
              Alert.alert('Éxito', 'Servicio marcado como pendiente');
              setModalPendienteVisible(false);
              setObservacionPendiente('');
              cargarServicios();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al marcar pendiente');
            }
          },
        },
      ]
    );
  };

  const abrirDetalle = (item) => {
    setServicioSeleccionado(item);
    setModalDetalleVisible(true);
  };

  const renderServicio = (item, esPendiente = false) => {
    const estadoActual = esPendiente ? 'PENDIENTE' : 'TOMADO';
    const esTomado = estadoActual === 'TOMADO';

    return (
      <TouchableOpacity
        key={item._id}
        style={styles.servicioCard}
        onPress={() => abrirDetalle(item)}
      >
        <View style={styles.servicioHeader}>
          <Text style={styles.servicioCliente}>{item.cliente}</Text>
          <View style={[styles.estadoBadge, esTomado ? styles.estadoTomado : styles.estadoPendiente]}>
            <Text style={styles.estadoBadgeText}>
              {esTomado ? '📋 Tomado' : '⏳ Pendiente'}
            </Text>
          </View>
        </View>

        <Text style={styles.servicioInfo}>📋 {item.nombreServicio}</Text>
        <Text style={styles.servicioInfo}>📅 {new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
        <Text style={styles.servicioInfo}>🔧 Técnico: {item.tecnicoAsignado?.nombre || 'N/A'}</Text>
        <Text style={styles.servicioInfo}>👔 Jefe: {item.jefeAsignado?.nombre || 'N/A'}</Text>

        {(isAdminOrJefeOrTecnico) && (
          <View style={styles.accionesContainer}>
            <TouchableOpacity
              style={[styles.accionButton, styles.accionEjecutar]}
              onPress={() => {
                setServicioSeleccionado(item);
                setEjecucionData({
                  observaciones: '',
                  materiales: [],
                  macEquipo: '',
                  macRepetidor: '',
                  snReceptor: '',
                });
                setModalVisible(true);
              }}
            >
              <Text style={styles.accionButtonText}>✅ Ejecutar</Text>
            </TouchableOpacity>

            {esTomado && (
              <TouchableOpacity
                style={[styles.accionButton, styles.accionPendiente]}
                onPress={() => {
                  setServicioSeleccionado(item);
                  setObservacionPendiente('');
                  setModalPendienteVisible(true);
                }}
              >
                <Text style={styles.accionButtonText}>⏳ Pendiente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Ejecución de Servicios</Text>
        {bodega && (
          <Text style={styles.bodegaInfo}>📍 Bodega: {bodega.nombre}</Text>
        )}
        {cargandoBodega && (
          <Text style={styles.bodegaInfo}>⏳ Cargando bodega...</Text>
        )}
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {servicios.length > 0 && (
          <View>
            <Text style={styles.seccionTitle}>📋 Servicios por Ejecutar</Text>
            {servicios.map((item) => renderServicio(item, false))}
          </View>
        )}

        {serviciosPendientes.length > 0 && (
          <View>
            <Text style={styles.seccionTitle}>⏳ Servicios Pendientes</Text>
            {serviciosPendientes.map((item) => renderServicio(item, true))}
          </View>
        )}

        {servicios.length === 0 && serviciosPendientes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay servicios para ejecutar</Text>
          </View>
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Modal de Detalle del Servicio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalleVisible}
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Detalle del Servicio</Text>

            {servicioSeleccionado && (
              <View>
                <Text style={styles.modalLabel}>Cliente:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.cliente}</Text>

                <Text style={styles.modalLabel}>Código:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.codigoIdentificador}</Text>

                <Text style={styles.modalLabel}>Barrio:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.barrio}</Text>

                <Text style={styles.modalLabel}>Dirección:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.direccion}</Text>

                <Text style={styles.modalLabel}>Teléfono:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.telefono}</Text>

                <Text style={styles.modalLabel}>Teléfonos adicionales:</Text>
                <Text style={styles.modalValue}>
                  {servicioSeleccionado.telefonos?.join(', ') || 'Ninguno'}
                </Text>

                <Text style={styles.modalLabel}>Servicio:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.nombreServicio}</Text>

                <Text style={styles.modalLabel}>Observaciones:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.observaciones}</Text>

                <Text style={styles.modalLabel}>Responsable:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.responsable}</Text>

                <Text style={styles.modalLabel}>Técnico asignado:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.tecnicoAsignado?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Jefe asignado:</Text>
                <Text style={styles.modalValue}>{servicioSeleccionado.jefeAsignado?.nombre || 'N/A'}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: servicioSeleccionado.estado === 'TOMADO' ? '#FDCB6E' : '#E17055', alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>
                    {servicioSeleccionado.estado === 'TOMADO' ? '📋 Tomado' : '⏳ Pendiente'}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Fecha creación:</Text>
                <Text style={styles.modalValue}>{new Date(servicioSeleccionado.createdAt).toLocaleDateString('es-ES')}</Text>

                {servicioSeleccionado.imagen && (
                  <View>
                    <Text style={styles.modalLabel}>📷 Imagen del servicio:</Text>
                    <Image
                      source={{ 
                        uri: servicioSeleccionado.imagen.startsWith('data:image') 
                          ? servicioSeleccionado.imagen 
                          : `data:image/jpeg;base64,${servicioSeleccionado.imagen}` 
                      }}
                      style={styles.modalImagen}
                      resizeMode="cover"
                    />
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

      {/* Modal de Ejecución */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>✅ Ejecutar Servicio</Text>

            {/* Mostrar bodega actual */}
            {bodega && (
              <View style={styles.bodegaInfoModal}>
                <Text style={styles.bodegaInfoModalText}>
                  📍 Bodega: {bodega.nombre}
                </Text>
                <Text style={styles.bodegaInfoModalSub}>
                  Materiales disponibles: {bodega.materiales?.length || 0}
                </Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Observaciones *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={ejecucionData.observaciones}
              onChangeText={(text) => setEjecucionData(prev => ({ ...prev, observaciones: text }))}
              placeholder="Observaciones de la ejecución..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Materiales Usados</Text>
            <View style={styles.materialContainer}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={materialSeleccionado}
                  onValueChange={(itemValue) => setMaterialSeleccionado(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecciona un material..." value="" />
                  {opcionesMateriales.map((mat) => (
                    <Picker.Item key={mat} label={mat} value={mat} />
                  ))}
                </Picker>
              </View>
              <TextInput
                style={styles.cantidadInput}
                value={cantidadMaterial}
                onChangeText={setCantidadMaterial}
                placeholder="Cant"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.agregarMaterialButton} onPress={agregarMaterial}>
                <Text style={styles.agregarMaterialText}>➕</Text>
              </TouchableOpacity>
            </View>

            {materialSeleccionado && bodega && (
              <View style={styles.stockInfo}>
                <Text style={styles.stockInfoText}>
                  📦 Stock disponible: {
                    bodega.materiales?.find(m => m.nombre === materialSeleccionado)?.cantidad || 0
                  }
                </Text>
              </View>
            )}

            <View style={styles.materialesLista}>
              {ejecucionData.materiales.map((mat, index) => (
                <View key={index} style={styles.materialItem}>
                  <Text style={styles.materialItemText}>{mat.nombre} x{mat.cantidad}</Text>
                  <TouchableOpacity onPress={() => eliminarMaterial(index)}>
                    <Text style={styles.eliminarMaterialText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={styles.modalLabel}>MAC Equipo (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={ejecucionData.macEquipo}
              onChangeText={(text) => setEjecucionData(prev => ({ ...prev, macEquipo: text }))}
              placeholder="MAC del equipo"
            />

            <Text style={styles.modalLabel}>MAC Repetidor (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={ejecucionData.macRepetidor}
              onChangeText={(text) => setEjecucionData(prev => ({ ...prev, macRepetidor: text }))}
              placeholder="MAC del repetidor"
            />

            <Text style={styles.modalLabel}>SN Receptor (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              value={ejecucionData.snReceptor}
              onChangeText={(text) => setEjecucionData(prev => ({ ...prev, snReceptor: text }))}
              placeholder="SN del receptor"
            />

            <Text style={styles.modalResponsable}>👤 Responsable: {user?.nombre || ''}</Text>

            <Text style={styles.materialesCount}>
              📋 Materiales a restar: {ejecucionData.materiales.length}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={ejecutarServicio}
              >
                <Text style={styles.modalButtonText}>✅ Ejecutar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Pendiente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalPendienteVisible}
        onRequestClose={() => setModalPendienteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentPendiente}>
            <Text style={styles.modalTitle}>⏳ Marcar como Pendiente</Text>

            <Text style={styles.modalLabel}>Observaciones *</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={observacionPendiente}
              onChangeText={setObservacionPendiente}
              placeholder="Observaciones del pendiente..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalPendienteVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={pendienteServicio}
              >
                <Text style={styles.modalButtonText}>⏳ Marcar Pendiente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bodegaInfo: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
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
    flex: 1,
    padding: 15,
  },
  seccionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
    marginTop: 5,
  },
  servicioCard: {
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
  servicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicioCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoTomado: {
    backgroundColor: '#FDCB6E',
  },
  estadoPendiente: {
    backgroundColor: '#E17055',
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  servicioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  accionesContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  accionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  accionEjecutar: {
    backgroundColor: '#00B894',
  },
  accionPendiente: {
    backgroundColor: '#E17055',
  },
  accionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
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
  footerSpacer: {
    height: 20,
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
  modalContentPendiente: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
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
  modalImagen: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 5,
    backgroundColor: '#F5F5F5',
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
  modalResponsable: {
    fontSize: 14,
    color: '#6C5CE7',
    marginTop: 10,
    fontWeight: '500',
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
  materialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    overflow: 'hidden',
    height: 45,
  },
  picker: {
    height: 45,
    width: '100%',
  },
  cantidadInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    width: 70,
    textAlign: 'center',
  },
  agregarMaterialButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
    height: 45,
  },
  agregarMaterialText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  materialesLista: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    margin: 4,
  },
  materialItemText: {
    fontSize: 12,
    color: '#2D3436',
    marginRight: 8,
  },
  eliminarMaterialText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bodegaInfoModal: {
    backgroundColor: '#E8F0FE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  bodegaInfoModalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0984E3',
  },
  bodegaInfoModalSub: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  stockInfo: {
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  stockInfoText: {
    fontSize: 13,
    color: '#2D3436',
  },
  materialesCount: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default EjecucionServicio;