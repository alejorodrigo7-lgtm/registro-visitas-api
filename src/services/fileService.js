import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

/**
 * Servicio unificado para manejo de archivos (móvil y web)
 */
export const fileService = {
  /**
   * Seleccionar un archivo PDF
   * @param {Object} options - Opciones
   * @param {string} options.type - Tipo de archivo ('pdf', 'image', 'all')
   * @returns {Promise<Object>} - Archivo seleccionado
   */
  async pickFile(options = {}) {
    const { type = 'pdf' } = options;

    // Mapear tipos MIME
    const mimeTypes = {
      pdf: ['application/pdf'],
      image: ['image/jpeg', 'image/png', 'image/jpg'],
      all: ['*/*'],
    };

    try {
      // En Web, usamos input nativo de HTML
      if (Platform.OS === 'web') {
        return this.pickFileWeb(mimeTypes[type] || ['*/*']);
      }

      // En móvil, usamos DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes[type] || ['*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
        file: asset.file,
      };
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
      throw error;
    }
  },

  /**
   * Seleccionar archivo en Web (usando input nativo)
   */
  pickFileWeb(mimeTypes) {
    return new Promise((resolve, reject) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = mimeTypes.join(',');

        input.onchange = (event) => {
          const file = event.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }

          // Leer archivo como base64
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              uri: URL.createObjectURL(file),
              name: file.name,
              size: file.size,
              mimeType: file.type,
              base64: e.target.result,
              file: file,
            });
          };
          reader.onerror = (error) => {
            reject(error);
          };
          reader.readAsDataURL(file);
        };

        input.oncancel = () => {
          resolve(null);
        };

        // Simular clic para abrir selector de archivos
        input.click();
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Obtener URL del archivo (para vista previa)
   */
  getFileUrl(fileData) {
    if (!fileData) return null;
    if (fileData.uri) return fileData.uri;
    if (fileData.base64) return fileData.base64;
    return null;
  },

  /**
   * Convertir archivo a FormData para subir al servidor
   */
  async toFormData(fileData, fieldName = 'file') {
    const formData = new FormData();

    if (Platform.OS === 'web' && fileData.file) {
      // En web, usamos el archivo directamente
      formData.append(fieldName, fileData.file);
    } else if (fileData.uri) {
      // En móvil, usamos la URI
      const uriParts = fileData.uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const fileName = fileData.name || `archivo.${fileType}`;

      formData.append(fieldName, {
        uri: fileData.uri,
        name: fileName,
        type: fileData.mimeType || `application/${fileType}`,
      });
    } else if (fileData.base64) {
      // Fallback: convertir base64 a blob
      const blob = this.base64ToBlob(fileData.base64);
      formData.append(fieldName, blob, fileData.name || 'archivo.pdf');
    }

    return formData;
  },

  /**
   * Convertir base64 a Blob (para web)
   */
  base64ToBlob(base64, mimeType = 'application/pdf') {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  },

  /**
   * Validar que el archivo sea PDF
   */
  isValidPDF(fileData) {
    if (!fileData) return false;
    const name = fileData.name || '';
    const mimeType = fileData.mimeType || '';
    return name.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
  },

  /**
   * Obtener tamaño del archivo en formato legible
   */
  getFileSize(size) {
    if (!size) return '0 KB';
    if (size < 1024) return size + ' B';
    if (size < 1048576) return (size / 1024).toFixed(1) + ' KB';
    return (size / 1048576).toFixed(1) + ' MB';
  },
};