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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MapaKMZ = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kmzs, setKmzs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [kmzSeleccionado, setKmzSeleccionado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    archivo: null,
    archivoNombre: '',
  });

  const isAdmin = user?.rol === 'Admin';
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  useEffect(() => {
    cargarKMZ();
  }, []);

  const cargarKMZ = async () => {
    try {
      const response = await api.get('/mapas/kmz');
      setKmzs(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar KMZ:', error);
      Alert.alert('Error', 'No se pudieron cargar los archivos KMZ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarKMZ();
  };

  const seleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.google-earth.kmz', 'application/vnd.google-earth.kml+xml'],
      });

      if (result.type === 'success') {
        // Leer el archivo como base64
        const fileContent = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setFormData({
          ...formData,
          archivo: fileContent,
          archivoNombre: result.name,
        });

        Alert.alert('✅ Archivo seleccionado', result.name);
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!formData.archivo) {
      Alert.alert('Error', 'Debes seleccionar un archivo KMZ/KML');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        archivo: formData.archivo,
        tipo: formData.archivoNombre.endsWith('.kml') ? 'kml' : 'kmz',
      };

      await api.post('/mapas/kmz', dataToSend);

      Alert.alert(
        '✅ Éxito',
        'Archivo KMZ subido correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setModalVisible(false);
              setFormData({
                nombre: '',
                descripcion: '',
                archivo: null,
                archivoNombre: '',
              });
              cargarKMZ();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setLoading(false);
    }
  };

  const verKMZ = (kmz) => {
    setKmzSeleccionado(kmz);
    setModalDetalleVisible(true);
  };

  const eliminarKMZ = async (id, nombre) => {
    if (!isAdmin) {
      Alert.alert('⛔ Acceso Denegado', 'Solo Administradores pueden eliminar archivos');
      return;
    }

    Alert.alert(
      '🗑️ Eliminar KMZ',
      `¿Estás seguro de eliminar "${nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/mapas/kmz/${id}`);
              Alert.alert('✅ Éxito', 'Archivo eliminado correctamente');
              cargarKMZ();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al eliminar');
            }
          },
        },
      ]
    );
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando archivos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📁 KMZ / KML</Text>
        <Text style={styles.subtitle}>Archivos de mapas y rutas</Text>
      </View>

      {isAdminOrJefe && (
        <TouchableOpacity
          style={styles.subirButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.subirButtonText}>📤 Subir KMZ/KML</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {kmzs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay archivos KMZ</Text>
            <Text style={styles.emptySubText}>
              Sube archivos KMZ/KML para visualizar rutas
            </Text>
          </View>
        ) : (
          kmzs.map((kmz) => (
            <TouchableOpacity
              key={kmz._id}
              style={styles.kmzCard}
              onPress={() => verKMZ(kmz)}
            >
              <View style={styles.kmzHeader}>
                <Text style={styles.kmzNombre}>{kmz.nombre}</Text>
                <View style={styles.kmzTipoBadge}>
                  <Text style={styles.kmzTipoText}>{kmz.tipo?.toUpperCase()}</Text>
                </View>
              </View>

              {kmz.descripcion && (
                <Text style={styles.kmzDescripcion}>{kmz.descripcion}</Text>
              )}

              <View style={styles.kmzFooter}>
                <Text style={styles.kmzInfo}>
                  👤 {kmz.creadoPorNombre || 'Desconocido'}
                </Text>
                <Text style={styles.kmzInfo}>
                  📅 {formatFecha(kmz.createdAt)}
                </Text>
              </View>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.kmzEliminar}
                  onPress={() => eliminarKMZ(kmz._id, kmz.nombre)}
                >
                  <Text style={styles.kmzEliminarText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Modal de Detalle KMZ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalDetalleVisible}
        onRequestClose={() => setModalDetalleVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📁 Detalle KMZ</Text>

            {kmzSeleccionado && (
              <View>
                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{kmzSeleccionado.nombre}</Text>

                {kmzSeleccionado.descripcion && (
                  <>
                    <Text style={styles.modalLabel}>Descripción:</Text>
                    <Text style={styles.modalValue}>{kmzSeleccionado.descripcion}</Text>
                  </>
                )}

                <Text style={styles.modalLabel}>Tipo:</Text>
                <View style={[styles.kmzTipoBadge, { alignSelf: 'flex-start' }]}>
                  <Text style={styles.kmzTipoText}>
                    {kmzSeleccionado.tipo?.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.modalLabel}>Creado por:</Text>
                <Text style={styles.modalValue}>{kmzSeleccionado.creadoPorNombre || 'Desconocido'}</Text>

                <Text style={styles.modalLabel}>Fecha:</Text>
                <Text style={styles.modalValue}>{formatFecha(kmzSeleccionado.createdAt)}</Text>

                <View style={styles.modalInfoBox}>
                  <Text style={styles.modalInfoText}>
                    📌 Tamaño: {(kmzSeleccionado.archivo?.length / 1024).toFixed(2)} KB
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalAbrirButton}
                  onPress={() => {
                    Alert.alert(
                      '📁 Abrir KMZ',
                      `¿Quieres abrir ${kmzSeleccionado.nombre}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Abrir',
                          onPress: () => {
                            // Aquí puedes implementar la apertura del KMZ
                            // Por ejemplo, descargar o abrir con una app externa
                            Alert.alert(
                              '✅ Abrir KMZ',
                              `Abriendo ${kmzSeleccionado.nombre}...\n\n(La funcionalidad de visualización se implementará con una librería de mapas)`
                            );
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.modalAbrirButtonText}>🗺️ Abrir KMZ</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalDetalleVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Subir KMZ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📤 Subir KMZ/KML</Text>

            <Text style={styles.modalLabel}>Nombre *</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.nombre}
              onChangeText={(text) => setFormData(prev => ({ ...prev, nombre: text }))}
              placeholder="Nombre del archivo"
            />

            <Text style={styles.modalLabel}>Descripción</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={formData.descripcion}
              onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text }))}
              placeholder="Descripción del archivo"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Archivo *</Text>
            <TouchableOpacity
              style={styles.seleccionarArchivoButton}
              onPress={seleccionarArchivo}
            >
              <Text style={styles.seleccionarArchivoButtonText}>
                {formData.archivoNombre ? `📎 ${formData.archivoNombre}` : '📂 Seleccionar archivo KMZ/KML'}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setModalVisible(false);
                  setFormData({
                    nombre: '',
                    descripcion: '',
                    archivo: null,
                    archivoNombre: '',
                  });
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>📤 Subir</Text>
                )}
              </TouchableOpacity>
            </View>
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
  subirButton: {
    backgroundColor: '#00B894',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  subirButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listaContainer: {
    flex: 1,
    padding: 15,
  },
  kmzCard: {
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
  kmzHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kmzNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
  },
  kmzTipoBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kmzTipoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  kmzDescripcion: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  kmzFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kmzInfo: {
    fontSize: 12,
    color: '#636E72',
  },
  kmzEliminar: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  kmzEliminarText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
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
  modalInfoBox: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#636E72',
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
  seleccionarArchivoButton: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    alignItems: 'center',
    marginBottom: 15,
  },
  seleccionarArchivoButtonText: {
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
  modalAbrirButton: {
    backgroundColor: '#0984E3',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalAbrirButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
});

export default MapaKMZ;