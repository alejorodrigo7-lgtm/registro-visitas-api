import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { fileService } from '../services/fileService';

const SubirRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  
  // ✅ Estados para múltiples archivos PDF (máximo 3)
  const [archivos, setArchivos] = useState([]);
  const [archivosBase64, setArchivosBase64] = useState([]);
  const [archivosNombre, setArchivosNombre] = useState([]);

  const [mensajeError, setMensajeError] = useState('');

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/solicitudes-recibo?estado=SOLICITADO');
      
      if (response.data.success) {
        setSolicitudes(response.data.data || []);
        setFilteredSolicitudes(response.data.data || []);
        console.log(`📋 ${response.data.data?.length || 0} solicitudes pendientes`);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSolicitudes(solicitudes);
    } else {
      const filtered = solicitudes.filter(s =>
        s.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSolicitudes(filtered);
    }
  }, [searchTerm, solicitudes]);

  const openModal = (solicitud) => {
    setSelectedSolicitud(solicitud);
    setArchivos([]);
    setArchivosBase64([]);
    setArchivosNombre([]);
    setMensajeError('');
    setModalVisible(true);
  };

  // ============================================
  // 📎 FUNCIONES PARA PDF (MÓVIL Y WEB)
  // ============================================

  const handleSelectFile = async () => {
    if (archivos.length >= 3) {
      Alert.alert('Límite alcanzado', 'Máximo 3 archivos PDF por solicitud');
      return;
    }

    try {
      console.log('📄 Abriendo selector de PDF...');
      console.log('📱 Plataforma:', Platform.OS);

      let result;

      // ✅ USAR fileService para WEB y MÓVIL
      if (Platform.OS === 'web') {
        // En web, usamos el fileService
        result = await fileService.pickFile({ type: 'pdf' });
        
        if (!result) {
          console.log('❌ Usuario canceló la selección');
          return;
        }

        console.log('✅ PDF seleccionado (web):', result.name);
        console.log('📁 Base64 length:', result.base64?.length || 0);

        // Para web, el base64 ya viene en el resultado
        agregarArchivo(result.uri, result.base64, result.name, result.mimeType || 'application/pdf');

      } else {
        // ✅ Móvil: usar DocumentPicker
        const pickerResult = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
        });

        console.log('📄 Resultado DocumentPicker:', JSON.stringify(pickerResult, null, 2));

        if (pickerResult.canceled === true) {
          console.log('❌ Usuario canceló la selección');
          return;
        }

        if (pickerResult.assets && pickerResult.assets.length > 0) {
          const file = pickerResult.assets[0];
          console.log('✅ PDF seleccionado (móvil):', file.name);
          
          // Leer el archivo y convertir a Base64
          const fileContent = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('✅ Base64 generado. Tamaño:', fileContent.length);
          
          agregarArchivo(file.uri, fileContent, file.name, 'application/pdf');
        }
      }

    } catch (error) {
      console.error('❌ Error seleccionando PDF:', error);
      Alert.alert('Error', 'No se pudo seleccionar el PDF: ' + error.message);
    }
  };

  const agregarArchivo = (uri, base64, nombre, mimeType) => {
    if (archivos.length >= 3) {
      Alert.alert('Límite alcanzado', 'Máximo 3 archivos por solicitud');
      return;
    }

    setArchivos([...archivos, { uri, nombre, mimeType }]);
    setArchivosBase64([...archivosBase64, base64]);
    setArchivosNombre([...archivosNombre, nombre]);
    
    console.log(`📎 Archivo PDF agregado: ${nombre} (${archivos.length + 1}/3)`);
  };

  const eliminarArchivo = (index) => {
    const nuevosArchivos = [...archivos];
    nuevosArchivos.splice(index, 1);
    setArchivos(nuevosArchivos);

    const nuevosBase64 = [...archivosBase64];
    nuevosBase64.splice(index, 1);
    setArchivosBase64(nuevosBase64);

    const nuevosNombres = [...archivosNombre];
    nuevosNombres.splice(index, 1);
    setArchivosNombre(nuevosNombres);
  };

  // ============================================
  // ENVIAR RECIBO CON MÚLTIPLES PDF
  // ============================================

  const handleEnviar = async () => {
    if (archivos.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un archivo PDF');
      return;
    }

    setUploading(true);
    setMensajeError('');
    
    try {
      console.log('📤 ===== INICIANDO ENVÍO =====');
      console.log('📤 Solicitud ID:', selectedSolicitud._id);
      console.log(`📤 Archivos PDF: ${archivos.length}`);
      console.log('📱 Plataforma:', Platform.OS);

      // ✅ Enviar múltiples archivos
      const payload = {
        archivosNombre: archivosNombre,
        archivosBase64: archivosBase64,
        archivosPublicId: archivos.map((_, index) => 
          `recibo_${selectedSolicitud._id}_${Date.now()}_${index}`
        ),
      };

      console.log('📤 Payload keys:', Object.keys(payload));
      console.log(`📤 archivosBase64: ${archivosBase64.length} archivos`);
      console.log('📤 archivosBase64 length (primeros 50 chars):', 
        archivosBase64[0]?.substring(0, 50) || 'vacío');

      const response = await api.put(
        `/solicitudes-recibo/${selectedSolicitud._id}/aprobar`,
        payload
      );

      console.log('📡 Respuesta status:', response.status);

      if (response.data.success) {
        Alert.alert(
          '✅ Recibo Enviado',
          `El recibo se ha enviado exitosamente con ${archivos.length} PDF(s)`,
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                setArchivos([]);
                setArchivosBase64([]);
                setArchivosNombre([]);
                fetchSolicitudes();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Error al enviar el recibo');
      }
    } catch (error) {
      console.error('❌ Error en la petición:', error);
      if (error.response) {
        console.error('📡 Error respuesta status:', error.response.status);
        Alert.alert('Error', error.response.data?.message || 'Error al procesar la solicitud');
      } else if (error.request) {
        Alert.alert('Error', 'No se pudo conectar con el servidor');
      } else {
        Alert.alert('Error', error.message || 'Error al procesar la solicitud');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDenegar = async () => {
    Alert.alert(
      '⚠️ Denegar Solicitud',
      '¿Estás seguro de que deseas denegar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denegar',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const response = await api.put(`/solicitudes-recibo/${selectedSolicitud._id}/denegar`);
              
              if (response.data.success) {
                Alert.alert('✅ Solicitud Denegada', 'La solicitud ha sido denegada');
                setModalVisible(false);
                fetchSolicitudes();
              } else {
                Alert.alert('Error', response.data.message || 'Error al denegar');
              }
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'Error al denegar la solicitud');
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // RENDER
  // ============================================

  const renderArchivoPreview = (archivo, index) => {
    const esPDF = archivo.mimeType === 'application/pdf' || archivo.nombre?.toLowerCase().endsWith('.pdf');

    return (
      <View key={index} style={styles.archivoItem}>
        <View style={styles.pdfPreview}>
          <Ionicons name="document-text" size={40} color="#FF6B6B" />
          <Text style={styles.pdfNombre} numberOfLines={2}>{archivo.nombre}</Text>
          <Text style={styles.pdfSize}>
            {archivo.size ? fileService.getFileSize(archivo.size) : 'PDF'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.btnEliminarArchivo}
          onPress={() => eliminarArchivo(index)}
        >
          <Ionicons name="close-circle" size={24} color="#FF6B6B" />
        </TouchableOpacity>
        
        <Text style={styles.archivoIndex}>#{index + 1}</Text>
      </View>
    );
  };

  const renderSolicitud = ({ item }) => (
    <View style={styles.solicitudCard}>
      <View style={styles.solicitudHeader}>
        <View style={styles.clienteInfo}>
          <Text style={styles.clienteNombre}>{item.cliente.nombre}</Text>
          <Text style={styles.clienteCodigo}>Código: {item.cliente.codigo}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>⏳ PENDIENTE</Text>
        </View>
      </View>

      {item.observaciones && (
        <View style={styles.observacionesContainer}>
          <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
          <Text style={styles.observacionesText} numberOfLines={2}>
            {item.observaciones}
          </Text>
        </View>
      )}

      <View style={styles.fechaInfo}>
        <Text style={styles.fechaText}>
          Solicitado: {new Date(item.fechaSolicitud).toLocaleDateString('es-EC')}
        </Text>
        <Text style={styles.solicitanteText}>
          Por: {item.solicitadoPor.nombre}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.uploadButtonFull}
        onPress={() => openModal(item)}
        disabled={uploading}
      >
        <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
        <Text style={styles.uploadButtonFullText}>Subir Recibo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="inbox-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay solicitudes pendientes</Text>
      <Text style={styles.emptySubtitle}>
        Todas las solicitudes han sido procesadas
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subir Recibo</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchSolicitudes}
        >
          <Ionicons name="refresh-outline" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSolicitudes}
          renderItem={renderSolicitud}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* MODAL CON SELECCIÓN DE PDF (MÓVIL Y WEB) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Subir Recibo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {selectedSolicitud && (
              <View style={styles.modalClienteInfo}>
                <Text style={styles.modalClienteNombre}>{selectedSolicitud.cliente.nombre}</Text>
                <Text style={styles.modalClienteCodigo}>Código: {selectedSolicitud.cliente.codigo}</Text>
              </View>
            )}

            {/* 📎 Sección de archivos PDF */}
            <Text style={styles.archivosLabel}>
              📄 Archivos PDF ({archivos.length}/3)
            </Text>
            <Text style={styles.helperText}>
              Puedes subir hasta 3 archivos PDF
            </Text>

            {archivos.length < 3 && (
              <TouchableOpacity
                style={styles.selectFileButton}
                onPress={handleSelectFile}
                disabled={uploading}
              >
                <Ionicons name="document-attach" size={24} color="#4CAF50" />
                <Text style={styles.selectFileButtonText}>
                  📄 Seleccionar PDF ({archivos.length}/3)
                </Text>
                {Platform.OS === 'web' && (
                  <Text style={styles.webHintText}> (Navegador)</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Vista previa de archivos PDF */}
            {archivos.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.archivosScrollView}
              >
                {archivos.map((archivo, index) => renderArchivoPreview(archivo, index))}
              </ScrollView>
            )}

            {mensajeError ? (
              <Text style={styles.errorText}>{mensajeError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.denyModalButton]}
                onPress={handleDenegar}
                disabled={uploading}
              >
                <Text style={styles.modalButtonText}>Denegar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  archivos.length > 0 ? styles.uploadModalButton : styles.disabledModalButton
                ]}
                onPress={handleEnviar}
                disabled={archivos.length === 0 || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    📤 Enviar ({archivos.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Indicador de plataforma */}
            <Text style={styles.platformIndicator}>
              {Platform.OS === 'web' ? '🌐 Modo Web' : '📱 Modo Móvil'}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF1'
  },
  backButton: { padding: 5, width: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  refreshButton: { padding: 5, width: 40, alignItems: 'flex-end' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 45
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#2C3E50', paddingVertical: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  solicitudCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  solicitudHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  clienteInfo: { flex: 1 },
  clienteNombre: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
  clienteCodigo: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  statusBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#F57C00' },
  observacionesContainer: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  observacionesLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  observacionesText: { fontSize: 14, color: '#333' },
  fechaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  fechaText: { fontSize: 12, color: '#666' },
  solicitanteText: { fontSize: 12, color: '#666' },
  uploadButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 10,
    gap: 8
  },
  uploadButtonFullText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalClienteInfo: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, marginBottom: 16 },
  modalClienteNombre: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  modalClienteCodigo: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  
  // Archivos PDF
  archivosLabel: { fontSize: 14, fontWeight: '600', color: '#2C3E50', marginBottom: 4 },
  helperText: { fontSize: 12, color: '#999', marginBottom: 10 },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectFileButtonText: { fontSize: 14, color: '#2C3E50' },
  webHintText: { fontSize: 12, color: '#999' },
  archivosScrollView: { maxHeight: 160, marginVertical: 10 },
  archivoItem: {
    width: 100,
    height: 110,
    marginRight: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  pdfNombre: {
    fontSize: 9,
    color: '#2D3436',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 80,
  },
  pdfSize: {
    fontSize: 8,
    color: '#999',
    marginTop: 2,
  },
  btnEliminarArchivo: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  archivoIndex: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  errorText: { color: '#F44336', fontSize: 13, marginTop: 8, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', marginTop: 10, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  uploadModalButton: { backgroundColor: '#4CAF50' },
  disabledModalButton: { backgroundColor: '#BDBDBD' },
  denyModalButton: { backgroundColor: '#F44336' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  platformIndicator: { 
    textAlign: 'center', 
    fontSize: 11, 
    color: '#999', 
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
});

export default SubirRecibo;