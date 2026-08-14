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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const DescargarRecibo = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [descargando, setDescargando] = useState(null);

  const fetchSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📥 Cargando recibos aprobados...');
      
      const response = await api.get('/solicitudes-recibo?estado=APROBADO');
      
      console.log('📥 Respuesta:', response.status);
      
      if (response.data.success) {
        setSolicitudes(response.data.data || []);
        setFilteredSolicitudes(response.data.data || []);
        console.log(`✅ ${response.data.data?.length || 0} recibos aprobados`);
        
        // ✅ Verificar los archivos
        response.data.data.forEach((s, i) => {
          if (s.archivo && s.archivo.url) {
            const url = s.archivo.url;
            const esBase64 = url.length > 100 && !url.startsWith('http') && !url.startsWith('file://');
            const esFile = url.startsWith('file://');
            console.log(`📄 Recibo ${i+1}: ${s.archivo.nombre} - ${esBase64 ? 'Base64' : esFile ? 'FILE' : 'URL'} (${url.length} chars)`);
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
      } else {
        Alert.alert('Error', 'No se pudieron cargar los recibos');
      }
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

  // ✅ DESCARGAR ARCHIVO - SOPORTE PARA Base64, URL y FILE
  const handleDownload = async (solicitud) => {
    if (!solicitud.archivo || !solicitud.archivo.url) {
      Alert.alert('Error', 'Este recibo no tiene archivo adjunto');
      return;
    }

    const url = solicitud.archivo.url;
    const fileName = solicitud.archivo.nombre || `recibo_${solicitud.cliente.codigo}.pdf`;
    const fileUri = FileSystem.documentDirectory + fileName;

    console.log('📥 === INICIANDO DESCARGA ===');
    console.log('📥 Archivo:', fileName);
    console.log('📥 URL length:', url.length);
    console.log('📥 URL primeros 50 chars:', url.substring(0, 50));

    setDescargando(solicitud._id);

    try {
      // ✅ CASO 1: Es Base64 (string largo, > 1000 caracteres, no empieza con http ni file)
      if (url.length > 1000 && !url.startsWith('http') && !url.startsWith('file://')) {
        console.log('✅ Guardando como Base64...');
        await FileSystem.writeAsStringAsync(fileUri, url, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      // ✅ CASO 2: Es URL HTTP/HTTPS
      else if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('✅ Descargando desde URL HTTP...');
        const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
        const result = await downloadResumable.downloadAsync();
        if (!result || !result.uri) {
          throw new Error('Error al descargar el archivo');
        }
      }
      // ✅ CASO 3: Es file:// (error - el archivo no se subió correctamente)
      else if (url.startsWith('file://')) {
        console.log('⚠️ El archivo es file:// - no se subió correctamente');
        Alert.alert(
          '⚠️ Archivo no disponible',
          'Este recibo no se subió correctamente. Por favor, sube el archivo nuevamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                setDescargando(null);
                navigation.goBack();
              }
            }
          ]
        );
        return;
      }
      // ✅ CASO 4: String corto (posiblemente Base64 incompleto o mal guardado)
      else {
        console.log('⚠️ Formato desconocido, intentando como Base64...');
        try {
          await FileSystem.writeAsStringAsync(fileUri, url, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (e) {
          console.error('❌ Error al guardar como Base64:', e);
          Alert.alert('Error', 'Formato de archivo no soportado');
          setDescargando(null);
          return;
        }
      }

      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        Alert.alert(
          '✅ Descarga Completa',
          `El recibo "${fileName}" se ha descargado correctamente`,
          [
            {
              text: '📂 Abrir',
              onPress: async () => {
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri, {
                      mimeType: 'application/pdf',
                      dialogTitle: `Recibo - ${solicitud.cliente.nombre}`,
                      UTI: 'com.adobe.pdf'
                    });
                  } else {
                    Alert.alert('Información', `Archivo guardado en:\n${fileUri}`);
                  }
                } catch (shareError) {
                  console.error('Error al abrir:', shareError);
                  Alert.alert('Información', `Archivo guardado en:\n${fileUri}`);
                }
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'El archivo no se pudo guardar correctamente');
      }
    } catch (error) {
      console.error('❌ Error al descargar:', error);
      Alert.alert('Error', 'No se pudo descargar el archivo: ' + error.message);
    } finally {
      setDescargando(null);
    }
  };

  const renderSolicitud = ({ item }) => (
    <View style={styles.solicitudCard}>
      <View style={styles.solicitudHeader}>
        <View style={styles.clienteInfo}>
          <Text style={styles.clienteNombre}>{item.cliente.nombre}</Text>
          <Text style={styles.clienteCodigo}>Código: {item.cliente.codigo}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✅ APROBADO</Text>
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
          Aprobado: {item.aprobadoPor ? new Date(item.aprobadoPor.fecha).toLocaleDateString('es-EC') : 'N/A'}
        </Text>
        <Text style={styles.solicitanteText}>
          Por: {item.aprobadoPor ? item.aprobadoPor.nombre : 'N/A'}
        </Text>
      </View>

      {item.archivo && item.archivo.nombre && (
        <View style={styles.archivoInfo}>
          <Ionicons name="document-text" size={16} color="#4CAF50" />
          <Text style={styles.archivoNombre} numberOfLines={1}>
            📄 {item.archivo.nombre}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.downloadButton, descargando === item._id && styles.downloadingButton]}
        onPress={() => handleDownload(item)}
        disabled={descargando === item._id}
      >
        {descargando === item._id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.downloadButtonText}>Descargar Recibo</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No hay recibos aprobados</Text>
      <Text style={styles.emptySubtitle}>
        Los recibos aprobados aparecerán aquí para su descarga
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Descargar Recibo</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchSolicitudes}>
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
          <Text style={styles.loadingText}>Cargando recibos...</Text>
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
  statusBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32' },
  observacionesContainer: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginTop: 8, borderLeftWidth: 3, borderLeftColor: '#4CAF50' },
  observacionesLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  observacionesText: { fontSize: 14, color: '#333' },
  fechaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  fechaText: { fontSize: 12, color: '#666' },
  solicitanteText: { fontSize: 12, color: '#666' },
  archivoInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 8, backgroundColor: '#F8F9FA', borderRadius: 6 },
  archivoNombre: { fontSize: 13, color: '#555', marginLeft: 6, flex: 1 },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8
  },
  downloadingButton: { backgroundColor: '#66BB6A' },
  downloadButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }
});

export default DescargarRecibo;