import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fileService } from '../services/fileService';

/**
 * Componente para seleccionar archivos PDF (funciona en móvil y web)
 */
const PDFPicker = ({
  onFileSelected,
  onFileRemoved,
  label = 'Seleccionar PDF',
  icon = 'document-text-outline',
  acceptTypes = ['pdf'],
  maxSize = 5, // MB
  initialFile = null,
}) => {
  const [selectedFile, setSelectedFile] = useState(initialFile);
  const [loading, setLoading] = useState(false);

  const handlePickFile = async () => {
    try {
      setLoading(true);

      const result = await fileService.pickFile({
        type: 'pdf',
      });

      if (!result) {
        // Usuario canceló
        return;
      }

      // Validar que sea PDF
      if (!fileService.isValidPDF(result)) {
        Alert.alert('Error', 'Por favor, selecciona un archivo PDF válido');
        return;
      }

      // Validar tamaño
      const sizeMB = result.size / 1048576;
      if (sizeMB > maxSize) {
        Alert.alert('Error', `El archivo excede el tamaño máximo de ${maxSize} MB`);
        return;
      }

      setSelectedFile(result);
      if (onFileSelected) {
        onFileSelected(result);
      }

      console.log('✅ Archivo seleccionado:', result.name);
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (onFileRemoved) {
      onFileRemoved();
    }
  };

  // Vista previa del archivo
  const renderFilePreview = () => {
    if (!selectedFile) return null;

    const fileName = selectedFile.name || 'archivo.pdf';
    const fileSize = fileService.getFileSize(selectedFile.size);

    return (
      <View style={styles.filePreview}>
        <View style={styles.fileInfo}>
          <Ionicons name="document" size={24} color="#6C5CE7" />
          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
            </Text>
            <Text style={styles.fileSize}>{fileSize}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRemoveFile} style={styles.removeButton}>
          <Ionicons name="close-circle" size={22} color="#E74C3C" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pickerButton, selectedFile && styles.hasFile]}
        onPress={handlePickFile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#6C5CE7" />
        ) : (
          <>
            <Ionicons name={icon} size={24} color={selectedFile ? '#2ECC71' : '#6C5CE7'} />
            <Text style={[styles.pickerText, selectedFile && styles.hasFileText]}>
              {selectedFile ? 'Cambiar archivo' : label}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {renderFilePreview()}

      {selectedFile && Platform.OS === 'web' && (
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            const url = fileService.getFileUrl(selectedFile);
            if (url) {
              window.open(url, '_blank');
            }
          }}
        >
          <Text style={styles.viewButtonText}>👁️ Ver PDF</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6C5CE7',
    borderStyle: 'dashed',
    gap: 8,
  },
  hasFile: {
    borderColor: '#2ECC71',
    backgroundColor: '#F0FFF4',
  },
  pickerText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  hasFileText: {
    color: '#2ECC71',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8ECF1',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D3436',
  },
  fileSize: {
    fontSize: 11,
    color: '#636E72',
  },
  removeButton: {
    padding: 4,
  },
  viewButton: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PDFPicker;