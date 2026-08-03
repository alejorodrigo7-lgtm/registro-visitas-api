import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PedirAusenciaScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    tipo: 'Entrada',
    motivo: '',
    observaciones: '',
    documento: null,
    documentoNombre: null,
  });

  const tiposAusencia = ['Entrada', 'Inicio Almuerzo', 'Fin Almuerzo', 'Salida'];

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/pedir-ausencia/mis-solicitudes');
      setSolicitudes(response.data.data || []);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarDocumento = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (result.type === 'success') {
        const fileContent = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setFormData({
          ...formData,
          documento: fileContent,
          documentoNombre: result.name,
        });

        Alert.alert('✅ Documento seleccionado', result.name);
      }
    } catch (error) {
      console.error('Error seleccionando documento:', error);
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  };

  const handleSubmit = async () => {
    if (!formData.tipo) {
      Alert.alert('Error', 'Selecciona un tipo');
      return;
    }
    if (!formData.motivo.trim()) {
      Alert.alert('Error', 'El motivo es obligatorio');
      return;
    }

    setLoading(true);
    try {
      await api.post('/pedir-ausencia', formData);
      Alert.alert('✅ Éxito', 'Solicitud enviada correctamente');
      setFormData({
        tipo: 'Entrada',
        motivo: '',
        observaciones: '',
        documento: null,
        documentoNombre: null,
      });
      setMostrarFormulario(false);
      cargarSolicitudes();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al enviar solicitud');
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
        <Text style={styles.title}>📝 Pedir Ausencia</Text>
        <Text style={styles.subtitle}>Solicita justificación para tu ausencia</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Botón Nueva Solicitud */}
        <TouchableOpacity
          style={styles.nuevoButton}
          onPress={() => setMostrarFormulario(!mostrarFormulario)}
        >
          <Ionicons name={mostrarFormulario ? 'chevron-up' : 'add-circle-outline'} size={24} color="#FFFFFF" />
          <Text style={styles.nuevoButtonText}>
            {mostrarFormulario ? 'Cerrar formulario' : 'Nueva Solicitud'}
          </Text>
        </TouchableOpacity>

        {/* Formulario */}
        {mostrarFormulario && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>📋 Nueva Solicitud</Text>

            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                style={styles.picker}
              >
                {tiposAusencia.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Motivo *</Text>
            <TextInput
              style={styles.input}
              value={formData.motivo}
              onChangeText={(text) => setFormData({ ...formData, motivo: text })}
              placeholder="Describe el motivo de tu ausencia"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Observaciones</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.observaciones}
              onChangeText={(text) => setFormData({ ...formData, observaciones: text })}
              placeholder="Observaciones adicionales..."
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Documento (opcional)</Text>
            <TouchableOpacity style={styles.documentoButton} onPress={seleccionarDocumento}>
              <Ionicons name="document-attach-outline" size={24} color="#6C5CE7" />
              <Text style={styles.documentoButtonText}>
                {formData.documentoNombre ? `📎 ${formData.documentoNombre}` : 'Adjuntar documento'}
              </Text>
            </TouchableOpacity>

            {formData.documentoNombre && (
              <TouchableOpacity
                style={styles.eliminarDocumentoButton}
                onPress={() => setFormData({ ...formData, documento: null, documentoNombre: null })}
              >
                <Text style={styles.eliminarDocumentoText}>✕ Eliminar documento</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.enviarButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.enviarButtonText}>📤 Enviar Solicitud</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Solicitudes */}
        <View style={styles.listaContainer}>
          <Text style={styles.listaTitle}>📋 Mis Solicitudes</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#6C5CE7" />
          ) : solicitudes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No tienes solicitudes</Text>
              <Text style={styles.emptySubText}>Crea una nueva solicitud de ausencia</Text>
            </View>
          ) : (
            solicitudes.map((item, index) => (
              <View key={item._id} style={styles.solicitudCard}>
                <View style={styles.solicitudHeader}>
                  <Text style={styles.solicitudTipo}>{item.tipo}</Text>
                  <View style={[styles.solicitudEstado, { backgroundColor: getEstadoColor(item.estado) }]}>
                    <Ionicons name={getEstadoIcon(item.estado)} size={14} color="#FFFFFF" />
                    <Text style={styles.solicitudEstadoText}>{item.estado}</Text>
                  </View>
                </View>

                <Text style={styles.solicitudFecha}>📅 {item.fechaStr}</Text>
                <Text style={styles.solicitudMotivo}>📝 {item.motivo}</Text>

                {item.observaciones && (
                  <Text style={styles.solicitudObservaciones}>{item.observaciones}</Text>
                )}

                {item.documentoNombre && (
                  <Text style={styles.solicitudDocumento}>📎 {item.documentoNombre}</Text>
                )}

                {item.estado !== 'Pendiente' && item.aprobadoPorNombre && (
                  <Text style={styles.solicitudAprobado}>
                    {item.estado === 'Aprobado' ? '✅' : '❌'} {item.aprobadoPorNombre}
                    {item.fechaAprobacion && ` - ${new Date(item.fechaAprobacion).toLocaleDateString('es-ES')}`}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#E17055',
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
  content: {
    flex: 1,
    padding: 15,
  },
  nuevoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E17055',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    gap: 8,
  },
  nuevoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  documentoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
    gap: 8,
  },
  documentoButtonText: {
    fontSize: 14,
    color: '#6C5CE7',
  },
  eliminarDocumentoButton: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 15,
  },
  eliminarDocumentoText: {
    color: '#FF6B6B',
    fontSize: 12,
  },
  enviarButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  enviarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listaContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
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
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  solicitudTipo: {
    fontSize: 14,
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
  solicitudFecha: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  solicitudMotivo: {
    fontSize: 13,
    color: '#2D3436',
    marginBottom: 4,
  },
  solicitudObservaciones: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  solicitudDocumento: {
    fontSize: 12,
    color: '#0984E3',
    marginBottom: 4,
  },
  solicitudAprobado: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
});

export default PedirAusenciaScreen;