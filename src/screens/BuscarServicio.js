import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BuscarServicio = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultados, setResultados] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);

  const buscarServicios = async () => {
    if (!searchTerm.trim()) {
      Alert.alert('Error', 'Ingresa un término de búsqueda');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Buscando servicios con término:', searchTerm);
      const response = await api.get(`/servicios/buscar?search=${encodeURIComponent(searchTerm.trim())}`);
      
      console.log('📋 Respuesta:', response.data);
      
      if (response.data?.data) {
        setResultados(response.data.data);
        if (response.data.data.length === 0) {
          setError('No se encontraron servicios');
        }
      } else {
        setResultados([]);
        setError('No se encontraron servicios');
      }
    } catch (error) {
      console.error('❌ Error buscando servicios:', error);
      setError('Error al buscar servicios');
      Alert.alert('Error', 'No se pudieron buscar los servicios');
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = (servicio) => {
    setServicioSeleccionado(servicio);
    setModalVisible(true);
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'TOMADO': '#FDCB6E',
      'EJECUTADO': '#00B894',
      'PENDIENTE': '#FF6B6B',
      'RETROALIMENTADO': '#0984E3',
    };
    return colores[estado] || '#636E72';
  };

  // ✅ Función para mostrar materiales
  const renderMateriales = (materiales) => {
    if (!materiales || materiales.length === 0) {
      return 'No se reportaron materiales';
    }
    
    return materiales.map((m, i) => {
      const nombre = typeof m === 'object' ? m.nombre : m;
      const cantidad = typeof m === 'object' ? m.cantidad : 1;
      return `${i+1}. ${nombre} x${cantidad}`;
    }).join('\n');
  };

  // ✅ Función para mostrar observaciones de ejecución
  const getObservacionesEjecucion = (ejecucion) => {
    if (!ejecucion) return 'Sin observaciones';
    return ejecucion.observaciones || 'Sin observaciones';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Buscar Servicios</Text>
        <Text style={styles.subtitle}>Busca por cliente o código de identificación</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#636E72" />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Buscar por cliente o código..."
            placeholderTextColor="#B2BEC3"
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={buscarServicios}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color="#636E72" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={buscarServicios}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Buscando servicios...</Text>
        </View>
      ) : (
        <ScrollView style={styles.resultadosContainer} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#B2BEC3" />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : resultados.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#B2BEC3" />
              <Text style={styles.emptyText}>Ingresa un término de búsqueda</Text>
              <Text style={styles.emptySubText}>Ej: nombre del cliente o código</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultadosCount}>
                {resultados.length} servicio{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
              </Text>
              {resultados.map((servicio) => (
                <TouchableOpacity
                  key={servicio._id}
                  style={[styles.servicioCard, { borderLeftColor: getEstadoColor(servicio.estado) }]}
                  onPress={() => verDetalle(servicio)}
                  activeOpacity={0.7}
                >
                  <View style={styles.servicioHeader}>
                    <Text style={styles.servicioCliente} numberOfLines={1}>{servicio.cliente}</Text>
                    <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(servicio.estado) }]}>
                      <Text style={styles.estadoBadgeText}>{servicio.estado}</Text>
                    </View>
                  </View>

                  <Text style={styles.servicioInfo}>📋 {servicio.codigoIdentificador}</Text>
                  <Text style={styles.servicioInfo}>🔧 {servicio.nombreServicio}</Text>
                  <Text style={styles.servicioInfo}>📍 {servicio.direccion}</Text>

                  {servicio.imagen && (
                    <View style={styles.imagenContainer}>
                      <Image 
                        source={{ uri: servicio.imagen }} 
                        style={styles.imagenMiniatura}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View style={styles.servicioFooter}>
                    <Text style={styles.servicioTecnico}>
                      👤 {servicio.tecnicoAsignado?.nombre || 'Sin técnico'}
                    </Text>
                    <Ionicons name="chevron-forward-outline" size={20} color="#B2BEC3" />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ✅ MODAL DE DETALLES DEL SERVICIO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Detalle del Servicio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            {servicioSeleccionado && (
              <>
                {/* ✅ INFORMACIÓN GENERAL */}
                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>👤 Cliente</Text>
                  <Text style={styles.detalleValue}>{servicioSeleccionado.cliente}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📋 Código</Text>
                  <Text style={styles.detalleValue}>{servicioSeleccionado.codigoIdentificador}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>🔧 Servicio</Text>
                  <Text style={styles.detalleValue}>{servicioSeleccionado.nombreServicio}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📍 Dirección</Text>
                  <Text style={styles.detalleValue}>{servicioSeleccionado.direccion}</Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📞 Teléfonos</Text>
                  <Text style={styles.detalleValue}>
                    {servicioSeleccionado.telefonos?.join(', ') || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📌 Estado</Text>
                  <View style={[styles.estadoBadgeDetalle, { backgroundColor: getEstadoColor(servicioSeleccionado.estado) }]}>
                    <Text style={styles.estadoBadgeText}>{servicioSeleccionado.estado}</Text>
                  </View>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>👤 Técnico Asignado</Text>
                  <Text style={styles.detalleValue}>
                    {servicioSeleccionado.tecnicoAsignado?.nombre || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>👔 Jefe Asignado</Text>
                  <Text style={styles.detalleValue}>
                    {servicioSeleccionado.jefeAsignado?.nombre || 'N/A'}
                  </Text>
                </View>

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📝 Observaciones</Text>
                  <Text style={styles.detalleValue}>
                    {servicioSeleccionado.observaciones || 'Sin observaciones'}
                  </Text>
                </View>

                {/* ✅ MATERIALES USADOS (SOLO PARA EJECUTADO) */}
                {servicioSeleccionado.estado === 'EJECUTADO' && (
                  <View style={styles.materialesContainer}>
                    <Text style={styles.materialesTitle}>📦 Materiales Usados:</Text>
                    <Text style={styles.materialesLista}>
                      {renderMateriales(servicioSeleccionado.ejecucion?.materiales)}
                    </Text>
                    {servicioSeleccionado.ejecucion?.responsableEjecucion && (
                      <Text style={styles.materialesEjecutadoPor}>
                        ✅ Ejecutado por: {servicioSeleccionado.ejecucion.responsableEjecucion}
                      </Text>
                    )}
                    {servicioSeleccionado.ejecucion?.fechaEjecucion && (
                      <Text style={styles.materialesFecha}>
                        📅 {new Date(servicioSeleccionado.ejecucion.fechaEjecucion).toLocaleString('es-ES')}
                      </Text>
                    )}
                    <Text style={styles.materialesObservaciones}>
                      📝 {getObservacionesEjecucion(servicioSeleccionado.ejecucion)}
                    </Text>
                  </View>
                )}

                {/* ✅ MOSTRAR IMAGEN EN EL MODAL */}
                {servicioSeleccionado.imagen && (
                  <View style={styles.modalImagenContainer}>
                    <Text style={styles.detalleLabel}>🖼️ Foto del Servicio</Text>
                    <Image 
                      source={{ uri: servicioSeleccionado.imagen }} 
                      style={styles.modalImagen}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* ✅ RETROALIMENTACIÓN */}
                {servicioSeleccionado.estado === 'RETROALIMENTADO' && (
                  <View style={styles.detalleSection}>
                    <Text style={styles.detalleLabel}>💬 Retroalimentación</Text>
                    <Text style={styles.detalleValue}>
                      {servicioSeleccionado.retroalimentacion?.observaciones || 'Sin retroalimentación'}
                    </Text>
                    {servicioSeleccionado.retroalimentacion?.responsable && (
                      <Text style={styles.detalleSubValue}>
                        por {servicioSeleccionado.retroalimentacion.responsable}
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.detalleSection}>
                  <Text style={styles.detalleLabel}>📅 Creado</Text>
                  <Text style={styles.detalleValue}>
                    {new Date(servicioSeleccionado.createdAt).toLocaleString('es-ES')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.cerrarModalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cerrarModalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
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
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#2D3436',
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
    fontSize: 16,
  },
  resultadosContainer: {
    flex: 1,
    padding: 15,
  },
  resultadosCount: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
  },
  servicioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
    marginRight: 8,
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  servicioInfo: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  servicioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  servicioTecnico: {
    fontSize: 12,
    color: '#636E72',
    flex: 1,
  },
  imagenContainer: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  imagenMiniatura: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  detalleSection: {
    marginBottom: 12,
  },
  detalleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 2,
  },
  detalleValue: {
    fontSize: 15,
    color: '#2D3436',
  },
  detalleSubValue: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
    fontStyle: 'italic',
  },
  estadoBadgeDetalle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  materialesContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  materialesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  materialesLista: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 20,
  },
  materialesEjecutadoPor: {
    fontSize: 13,
    color: '#00B894',
    marginTop: 6,
    fontWeight: '500',
  },
  materialesFecha: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  materialesObservaciones: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalImagenContainer: {
    marginVertical: 8,
  },
  modalImagen: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 4,
  },
  cerrarModalButton: {
    backgroundColor: '#6C5CE7',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  cerrarModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BuscarServicio;