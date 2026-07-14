import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Reportes = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('visitas');
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showFechaInicio, setShowFechaInicio] = useState(false);
  const [showFechaFin, setShowFechaFin] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const tiposReporte = [
    { value: 'visitas', label: '📋 Visitas' },
    { value: 'transferencias', label: '💰 Transferencias' },
    { value: 'servicios', label: '🛠️ Servicios' },
    { value: 'cajas', label: '💰 Cajas' },
    { value: 'depositos', label: '🏦 Depósitos' },
    { value: 'usuarios', label: '👥 Usuarios' },
    { value: 'monserrath', label: '📋 Monserrath' },
  ];

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];
  const estadosVisita = ['Pendiente', 'Completada', 'Cancelada'];
  const estadosTransferencia = ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'];
  const estadosServicio = ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'];
  const estadosMonserrath = ['Pendiente', 'Completado', 'Cancelado'];

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const generarReporte = async () => {
    const fechaInicioStr = formatDate(fechaInicio);
    const fechaFinStr = formatDate(fechaFin);

    if (!fechaInicioStr || !fechaFinStr) {
      Alert.alert('Error', 'Selecciona las fechas');
      return;
    }

    setLoading(true);
    try {
      let url = '';
      
      // 🔥 CONSTRUIR URL SEGÚN TIPO DE REPORTE
      if (tipoReporte === 'monserrath') {
        url = `/monserrath/reporte-excel?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`;
        if (filtroEstado) url += `&estado=${filtroEstado}`;
        if (filtro) url += `&tecnico=${filtro}`;
      } else {
        url = `/reportes/${tipoReporte}?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}`;
        if (filtro) url += `&${getFiltroParam()}=${filtro}`;
        if (filtroZona) url += `&zona=${filtroZona}`;
        if (filtroEstado) url += `&estado=${filtroEstado}`;
      }

      console.log('📡 URL:', url);

      const response = await api.get(url, {
        responseType: 'arraybuffer',
      });

      // Crear archivo
      const fileName = `${tipoReporte}_${fechaInicioStr}_${fechaFinStr}.xlsx`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      // Escribir el archivo correctamente
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Descargar Reporte',
        });
      } else {
        Alert.alert(
          '✅ Reporte Generado',
          `El archivo ${fileName} se ha guardado correctamente.`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error al generar reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getFiltroParam = () => {
    const params = {
      'visitas': 'tecnico',
      'transferencias': 'responsable',
      'servicios': 'tecnico',
      'cajas': 'zona',
      'depositos': 'zona',
      'usuarios': 'rol',
      'monserrath': 'tecnico',
    };
    return params[tipoReporte] || '';
  };

  const onChangeFechaInicio = (event, selectedDate) => {
    setShowFechaInicio(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaInicio(selectedDate);
    }
  };

  const onChangeFechaFin = (event, selectedDate) => {
    setShowFechaFin(Platform.OS === 'ios');
    if (selectedDate) {
      setFechaFin(selectedDate);
    }
  };

  const renderFiltros = () => {
    if (tipoReporte === 'cajas' || tipoReporte === 'depositos') {
      return (
        <View>
          <Text style={styles.label}>Zona</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroZona}
              onValueChange={setFiltroZona}
              style={styles.picker}
            >
              <Picker.Item label="Todas" value="" />
              {zonas.map((z) => (
                <Picker.Item key={z} label={z} value={z} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (tipoReporte === 'visitas') {
      return (
        <View>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroEstado}
              onValueChange={setFiltroEstado}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {estadosVisita.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (tipoReporte === 'transferencias') {
      return (
        <View>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroEstado}
              onValueChange={setFiltroEstado}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {estadosTransferencia.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (tipoReporte === 'servicios') {
      return (
        <View>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroEstado}
              onValueChange={setFiltroEstado}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {estadosServicio.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    if (tipoReporte === 'monserrath') {
      return (
        <View>
          <Text style={styles.label}>Estado</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filtroEstado}
              onValueChange={setFiltroEstado}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="" />
              {estadosMonserrath.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    return null;
  };

  // Botón para ir al reporte detallado de Monserrath
  const irAReporteMonserrath = () => {
    navigation.navigate('ReporteMonserrath');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Reportes</Text>
        <Text style={styles.subtitle}>Genera reportes en Excel</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Tipo de Reporte *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={tipoReporte}
              onValueChange={setTipoReporte}
              style={styles.picker}
            >
              {tiposReporte.map((t) => (
                <Picker.Item key={t.value} label={t.label} value={t.value} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Fecha Inicio *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowFechaInicio(true)}
          >
            <Text style={styles.dateText}>{formatDate(fechaInicio)}</Text>
          </TouchableOpacity>
          {showFechaInicio && (
            <DateTimePicker
              value={fechaInicio}
              mode="date"
              display="default"
              onChange={onChangeFechaInicio}
            />
          )}

          <Text style={styles.label}>Fecha Fin *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowFechaFin(true)}
          >
            <Text style={styles.dateText}>{formatDate(fechaFin)}</Text>
          </TouchableOpacity>
          {showFechaFin && (
            <DateTimePicker
              value={fechaFin}
              mode="date"
              display="default"
              onChange={onChangeFechaFin}
            />
          )}

          {renderFiltros()}

          <TouchableOpacity
            style={styles.generarButton}
            onPress={generarReporte}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.generarButtonText}>📥 Generar Reporte Excel</Text>
            )}
          </TouchableOpacity>

          {/* Botón para reporte detallado Monserrath */}
          {tipoReporte === 'monserrath' && (
            <TouchableOpacity
              style={[styles.generarButton, styles.monserrathButton]}
              onPress={irAReporteMonserrath}
            >
              <Text style={styles.generarButtonText}>📋 Ver Reporte Detallado</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>
            • Los reportes se generan en formato Excel (.xlsx)
          </Text>
          <Text style={styles.infoText}>
            • Puedes filtrar por fechas y otros criterios
          </Text>
          <Text style={styles.infoText}>
            • El archivo se descarga automáticamente
          </Text>
          <Text style={styles.infoText}>
            • Solo disponible para Admin y Jefe
          </Text>
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
  content: {
    flex: 1,
    padding: 15,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
    marginBottom: 5,
  },
  dateInput: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#2D3436',
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
  generarButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  monserrathButton: {
    backgroundColor: '#9C27B0',
    marginTop: 10,
  },
  generarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 3,
    lineHeight: 20,
  },
});

export default Reportes;