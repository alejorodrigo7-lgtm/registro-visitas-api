import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// 📋 LISTA DE MATERIALES PREDEFINIDOS
const MATERIALES_PREDEFINIDOS = [
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

const AsignarMaterial = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [bodegas, setBodegas] = useState([]);
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [nuevoMaterial, setNuevoMaterial] = useState({
    nombre: '',
    cantidad: '',
    minimo: '',
  });

  useEffect(() => {
    cargarBodegas();
  }, []);

  const cargarBodegas = async () => {
    setCargando(true);
    try {
      const response = await api.get('/bodegas');
      if (response.data.success) {
        const bodegasActivas = response.data.data.filter(b => b.estado === 'ACTIVA');
        setBodegas(bodegasActivas);
        if (bodegasActivas.length > 0) {
          setBodegaSeleccionada(bodegasActivas[0]._id);
        }
      }
    } catch (error) {
      console.error('Error al cargar bodegas:', error);
      Alert.alert('Error', 'No se pudieron cargar las bodegas');
    } finally {
      setCargando(false);
    }
  };

  const agregarMaterial = () => {
    if (!nuevoMaterial.nombre) {
      Alert.alert('Error', 'Debes seleccionar un material');
      return;
    }
    if (!nuevoMaterial.cantidad || parseFloat(nuevoMaterial.cantidad) <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    const existe = materiales.some(
      m => m.nombre === nuevoMaterial.nombre
    );

    if (existe) {
      Alert.alert('Error', 'Este material ya está en la lista.');
      return;
    }

    setMateriales([
      ...materiales,
      {
        nombre: nuevoMaterial.nombre,
        cantidad: parseFloat(nuevoMaterial.cantidad),
        minimo: nuevoMaterial.minimo ? parseFloat(nuevoMaterial.minimo) : 0,
      },
    ]);

    setNuevoMaterial({
      nombre: '',
      cantidad: '',
      minimo: '',
    });
  };

  const eliminarMaterial = (index) => {
    const nuevosMateriales = [...materiales];
    nuevosMateriales.splice(index, 1);
    setMateriales(nuevosMateriales);
  };

  const handleSubmit = async () => {
    if (materiales.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un material');
      return;
    }
    if (!bodegaSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar una bodega');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/bodegas/${bodegaSeleccionada}/asignar-material`, {
        materiales,
      });

      Alert.alert(
        '✅ Éxito',
        'Materiales asignados correctamente',
        [
          {
            text: 'OK',
            onPress: () => {
              setMateriales([]);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al asignar materiales');
    } finally {
      setLoading(false);
    }
  };

  const bodegaSeleccionadaData = bodegas.find(b => b._id === bodegaSeleccionada);

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando bodegas...</Text>
      </View>
    );
  }

  if (bodegas.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No hay bodegas disponibles</Text>
          <Text style={styles.emptySubText}>
            Crea una bodega primero en "Crear Bodega"
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>📦 Asignar Material</Text>
          <Text style={styles.subtitle}>Asignar materiales a una bodega</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Seleccionar Bodega *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={bodegaSeleccionada}
              onValueChange={setBodegaSeleccionada}
              style={styles.picker}
            >
              {bodegas.map((b) => (
                <Picker.Item
                  key={b._id}
                  label={`${b.nombre} - ${b.usuarioNombre}`}
                  value={b._id}
                />
              ))}
            </Picker>
          </View>

          {bodegaSeleccionadaData && (
            <View style={styles.bodegaInfo}>
              <Text style={styles.bodegaInfoText}>
                📍 {bodegaSeleccionadaData.nombre}
              </Text>
              <Text style={styles.bodegaInfoSub}>
                👤 {bodegaSeleccionadaData.usuarioNombre}
              </Text>
            </View>
          )}

          <View style={styles.divider}>
            <Text style={styles.dividerText}>Agregar Material</Text>
          </View>

          <Text style={styles.label}>Seleccionar Material *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={nuevoMaterial.nombre}
              onValueChange={(value) => setNuevoMaterial(prev => ({ ...prev, nombre: value }))}
              style={styles.picker}
            >
              <Picker.Item label="-- Selecciona un material --" value="" />
              {MATERIALES_PREDEFINIDOS.map((material) => (
                <Picker.Item key={material} label={material} value={material} />
              ))}
            </Picker>
          </View>

          {nuevoMaterial.nombre && (
            <View style={styles.materialSeleccionado}>
              <Text style={styles.materialSeleccionadoText}>
                📌 Material seleccionado: {nuevoMaterial.nombre}
              </Text>
            </View>
          )}

          <Text style={styles.label}>Cantidad *</Text>
          <TextInput
            style={styles.input}
            value={nuevoMaterial.cantidad}
            onChangeText={(text) => setNuevoMaterial(prev => ({ ...prev, cantidad: text }))}
            placeholder="Ej: 2000"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Cantidad Mínima (Alerta Push)</Text>
          <TextInput
            style={styles.input}
            value={nuevoMaterial.minimo}
            onChangeText={(text) => setNuevoMaterial(prev => ({ ...prev, minimo: text }))}
            placeholder="Ej: 100"
            keyboardType="decimal-pad"
          />
          <Text style={styles.minimoHint}>
            ⚠️ Cuando el stock llegue a esta cantidad, se enviará una alerta push
          </Text>

          <TouchableOpacity style={styles.addButton} onPress={agregarMaterial}>
            <Text style={styles.addButtonText}>➕ Agregar Material</Text>
          </TouchableOpacity>

          {materiales.length > 0 && (
            <View style={styles.materialesLista}>
              <Text style={styles.materialesListaTitle}>
                📋 Materiales agregados ({materiales.length})
              </Text>
              {materiales.map((m, index) => (
                <View key={index} style={styles.materialItem}>
                  <View style={styles.materialItemInfo}>
                    <Text style={styles.materialItemNombre}>{m.nombre}</Text>
                    <Text style={styles.materialItemDetalle}>
                      Cantidad: {m.cantidad}
                      {m.minimo > 0 && ` | Mínimo: ${m.minimo} ⚠️`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.materialItemDelete}
                    onPress={() => eliminarMaterial(index)}
                  >
                    <Text style={styles.materialItemDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>📦 Asignar Materiales</Text>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
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
  form: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 15,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
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
  bodegaInfo: {
    backgroundColor: '#E8F0FE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0984E3',
  },
  bodegaInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0984E3',
  },
  bodegaInfoSub: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  materialSeleccionado: {
    backgroundColor: '#DFF6DD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00B894',
  },
  materialSeleccionadoText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6E9',
    marginVertical: 15,
    paddingBottom: 5,
  },
  dividerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  addButton: {
    backgroundColor: '#00B894',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  materialesLista: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DFE6E9',
  },
  materialesListaTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  materialItemInfo: {
    flex: 1,
  },
  materialItemNombre: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3436',
  },
  materialItemDetalle: {
    fontSize: 12,
    color: '#636E72',
  },
  materialItemDelete: {
    padding: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    marginLeft: 10,
  },
  materialItemDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  minimoHint: {
    fontSize: 12,
    color: '#636E72',
    fontStyle: 'italic',
    marginTop: -10,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
  },
});

export default AsignarMaterial;