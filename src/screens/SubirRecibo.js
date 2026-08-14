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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SubirRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(false);
  const [archivoNombre, setArchivoNombre] = useState('');
  const [base64Content, setBase64Content] = useState('');
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
    setSelectedFile(null);
    setArchivoSeleccionado(false);
    setArchivoNombre('');
    setBase64Content('');
    setMensajeError('');
    setModalVisible(true);
  };

  const handleSelectFile = async () => {
    try {
      setMensajeError('');
      console.log('📄 Abriendo selector de archivos...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      console.log('📄 Resultado:', JSON.stringify(result, null, 2));

      if (result.canceled === true) {
        console.log('❌ Usuario canceló la selección');
        setMensajeError('Selección cancelada');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('✅ Archivo seleccionado:', file.name);
        console.log('📁 URI:', file.uri);
        console.log('📊 Tamaño:', file.size, 'bytes');
        
        console.log('🔄 Leyendo archivo y convirtiendo a Base64...');
        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('✅ Base64 generado. Tamaño:', fileContent.length);
        console.log('✅ Base64 primeros 50 chars:', fileContent.substring(0, 50));
        
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          size: file.size,
          base64: fileContent
        });
        setBase64Content(fileContent);
        setArchivoSeleccionado(true);
        setArchivoNombre(file.name);
        
        Alert.alert('✅ Éxito', `Archivo "${file.name}" seleccionado (${(file.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log('❌ No se encontraron archivos en el resultado');
        setMensajeError('No se seleccionó ningún archivo');
      }
    } catch (error) {
      console.error('❌ Error seleccionando archivo:', error);
      setMensajeError('Error: ' + error.message);
      Alert.alert('Error', 'No se pudo seleccionar el archivo: ' + error.message);
    }
  };

  // ✅ ENVIAR RECIBO CON BASE64 - CORREGIDO CON LOGS
  const handleEnviar = async () => {
    if (!selectedFile || !base64Content) {
      Alert.alert('Error', 'Selecciona un archivo PDF');
      return;
    }

    setUploading(true);
    setMensajeError('');
    
    try {
      console.log('📤 ===== INICIANDO ENVÍO =====');
      console.log('📤 Solicitud ID:', selectedSolicitud._id);
      console.log('📤 Archivo:', selectedFile.name);
      console.log('📤 base64Content length:', base64Content.length);
      console.log('📤 base64Content primeros 50 chars:', base64Content.substring(0, 50));

      // ✅ ENVIAR archivoBase64
      const payload = {
        archivoNombre: selectedFile.name,
        archivoBase64: base64Content,
        archivoPublicId: `recibo_${selectedSolicitud._id}_${Date.now()}`
      };

      console.log('📤 Payload keys:', Object.keys(payload));
      console.log('📤 archivoBase64 length en payload:', payload.archivoBase64.length);

      const response = await api.put(
        `/solicitudes-recibo/${selectedSolicitud._id}/aprobar`,
        payload
      );

      console.log('📡 Respuesta status:', response.status);
      console.log('📡 Respuesta data:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        Alert.alert(
          '✅ Recibo Enviado',
          'El recibo se ha enviado exitosamente',
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                setSelectedFile(null);
                setArchivoSeleccionado(false);
                setBase64Content('');
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
        console.error('📡 Error datos:', error.response.data);
        Alert.alert('Error', error.response.data?.message || 'Error al procesar la solicitud');
      } else if (error.request) {
        console.error('📡 No hubo respuesta del servidor');
        Alert.alert('Error', 'No se pudo conectar con el servidor');
      } else {
        console.error('📡 Error:', error.message);
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

            <TouchableOpacity
              style={[
                styles.selectFileButton,
                archivoSeleccionado && styles.selectFileButtonSuccess
              ]}
              onPress={handleSelectFile}
            >
              <Ionicons 
                name={archivoSeleccionado ? "checkmark-circle" : "document-attach-outline"} 
                size={24} 
                color={archivoSeleccionado ? "#2E7D32" : "#4CAF50"} 
              />
              <Text style={[
                styles.selectFileButtonText,
                archivoSeleccionado && styles.selectFileButtonTextSuccess
              ]}>
                {archivoSeleccionado ? `✅ ${archivoNombre}` : '📎 Seleccionar PDF'}
              </Text>
            </TouchableOpacity>

            {archivoSeleccionado && (
              <View style={styles.fileInfoContainer}>
                <Text style={styles.fileInfoText}>
                  📄 {(selectedFile?.size / 1024).toFixed(1)} KB - ✅ Listo
                </Text>
              </View>
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
                  archivoSeleccionado ? styles.uploadModalButton : styles.disabledModalButton
                ]}
                onPress={handleEnviar}
                disabled={!archivoSeleccionado || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {archivoSeleccionado ? '📤 Enviar' : '📎 Subir'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  modalClienteInfo: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, marginBottom: 16 },
  modalClienteNombre: { fontSize: 16, fontWeight: '600', color: '#2C3E50' },
  modalClienteCodigo: { fontSize: 13, color: '#7F8C8D', marginTop: 2 },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    gap: 8
  },
  selectFileButtonSuccess: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32', borderStyle: 'solid' },
  selectFileButtonText: { fontSize: 14, color: '#2C3E50' },
  selectFileButtonTextSuccess: { color: '#2E7D32', fontWeight: '600' },
  fileInfoContainer: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  fileInfoText: { fontSize: 13, color: '#2E7D32', fontWeight: '500' },
  errorText: { color: '#F44336', fontSize: 13, marginTop: 8, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  uploadModalButton: { backgroundColor: '#4CAF50' },
  disabledModalButton: { backgroundColor: '#BDBDBD' },
  denyModalButton: { backgroundColor: '#F44336' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});

export default SubirRecibo;