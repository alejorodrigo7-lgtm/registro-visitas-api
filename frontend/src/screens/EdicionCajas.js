import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EdicionCajas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [fecha, setFecha] = useState('');
  const [zona, setZona] = useState('TOLA');
  const [cajaEncontrada, setCajaEncontrada] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState({
    saldoInicial: '',
    cobroOficina: '',
    cobroCoordinador: '',
    egresos: [],
  });

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];

  const buscarCaja = async () => {
    if (!fecha) {
      Alert.alert('Error', 'Ingresa una fecha para buscar');
      return;
    }

    setBuscando(true);
    try {
      const response = await api.get(`/cajas/buscar?fecha=${fecha}&zona=${zona}`);
      if (response.data.success && response.data.data.length > 0) {
        const caja = response.data.data[0];
        setCajaEncontrada(caja);
        setEditData({
          saldoInicial: caja.saldoInicial?.toString() || '0',
          cobroOficina: caja.cobroOficina?.toString() || '0',
          cobroCoordinador: caja.cobroCoordinador?.toString() || '0',
          egresos: caja.egresos || [],
        });
        Alert.alert('Éxito', 'Caja encontrada');
      } else {
        setCajaEncontrada(null);
        Alert.alert('No encontrada', 'No se encontró una caja para esta fecha y zona');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al buscar la caja');
    } finally {
      setBuscando(false);
    }
  };

  const abrirModalEdicion = () => {
    if (!cajaEncontrada) {
      Alert.alert('Error', 'Primero busca una caja');
      return;
    }
    setModalVisible(true);
  };

  const guardarEdicion = async () => {
    setLoading(true);
    try {
      const dataToSend = {
        saldoInicial: parseFloat(editData.saldoInicial) || 0,
        cobroOficina: parseFloat(editData.cobroOficina) || 0,
        cobroCoordinador: parseFloat(editData.cobroCoordinador) || 0,
        egresos: editData.egresos,
      };

      await api.put(`/cajas/${cajaEncontrada._id}`, dataToSend);
      Alert.alert('Éxito', 'Caja actualizada correctamente');
      setModalVisible(false);
      buscarCaja(); // Recargar datos
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar la caja');
    } finally {
      setLoading(false);
    }
  };

  const agregarEgreso = () => {
    Alert.prompt(
      'Agregar Egreso',
      'Ingresa la descripción y el valor',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Agregar',
          onPress: (text) => {
            if (text) {
              const partes = text.split(';');
              if (partes.length === 2) {
                const descripcion = partes[0].trim();
                const valor = parseFloat(partes[1].trim());
                if (!isNaN(valor) && valor > 0) {
                  setEditData(prev => ({
                    ...prev,
                    egresos: [...prev.egresos, { descripcion, valor, imagen: '' }],
                  }));
                } else {
                  Alert.alert('Error', 'Valor inválido');
                }
              } else {
                Alert.alert('Error', 'Formato: "Descripción;Valor"');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'Descripción;Valor'
    );
  };

  const eliminarEgreso = (index) => {
    setEditData(prev => ({
      ...prev,
      egresos: prev.egresos.filter((_, i) => i !== index),
    }));
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const isAdmin = user?.rol === 'Admin';

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>⛔</Text>
          <Text style={styles.deniedTitle}>Acceso Denegado</Text>
          <Text style={styles.deniedText}>Solo Administradores pueden acceder a esta sección</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✏️ Edición de Cajas</Text>
        <Text style={styles.subtitle}>Buscar y editar cajas existentes</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Buscador */}
        <View style={styles.buscadorContainer}>
          <Text style={styles.label}>Fecha</Text>
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.label}>Zona</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={zona}
              onValueChange={setZona}
              style={styles.picker}
            >
              {zonas.map((z) => (
                <Picker.Item key={z} label={z} value={z} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={styles.buscarButton} onPress={buscarCaja} disabled={buscando}>
            {buscando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buscarButtonText}>🔍 Buscar Caja</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Resultados */}
        {cajaEncontrada && (
          <View style={styles.cajaCard}>
            <Text style={styles.cajaTitle}>📋 Caja Encontrada</Text>
            <View style={styles.cajaInfo}>
              <Text style={styles.cajaInfoText}>📅 Fecha: {formatFecha(cajaEncontrada.fecha)}</Text>
              <Text style={styles.cajaInfoText}>📍 Zona: {cajaEncontrada.zona}</Text>
              <Text style={styles.cajaInfoText}>💰 Saldo Inicial: ${cajaEncontrada.saldoInicial?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.cajaInfoText}>🏢 Cobro Oficina: ${cajaEncontrada.cobroOficina?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.cajaInfoText}>👤 Cobro Coordinador: ${cajaEncontrada.cobroCoordinador?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.cajaInfoText}>📤 Egresos: {cajaEncontrada.egresos?.length || 0}</Text>
              <Text style={styles.cajaInfoTotal}>💰 Saldo Final: ${cajaEncontrada.saldoFinal?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.cajaInfoCreador}>👤 Creado por: {cajaEncontrada.creadoPor?.nombre || 'Desconocido'}</Text>
            </View>

            <TouchableOpacity style={styles.editarButton} onPress={abrirModalEdicion}>
              <Text style={styles.editarButtonText}>✏️ Editar Caja</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de Edición */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Editar Caja</Text>

            <Text style={styles.modalLabel}>Saldo Inicial</Text>
            <TextInput
              style={styles.modalInput}
              value={editData.saldoInicial}
              onChangeText={(text) => setEditData(prev => ({ ...prev, saldoInicial: text }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Cobro Oficina</Text>
            <TextInput
              style={styles.modalInput}
              value={editData.cobroOficina}
              onChangeText={(text) => setEditData(prev => ({ ...prev, cobroOficina: text }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Cobro Coordinador</Text>
            <TextInput
              style={styles.modalInput}
              value={editData.cobroCoordinador}
              onChangeText={(text) => setEditData(prev => ({ ...prev, cobroCoordinador: text }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Egresos</Text>
            {editData.egresos.map((egreso, index) => (
              <View key={index} style={styles.modalEgresoItem}>
                <Text style={styles.modalEgresoText}>
                  {egreso.descripcion} - ${egreso.valor?.toFixed(2) || '0.00'}
                </Text>
                <TouchableOpacity onPress={() => eliminarEgreso(index)}>
                  <Text style={styles.modalEgresoDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.modalAddEgreso} onPress={agregarEgreso}>
              <Text style={styles.modalAddEgresoText}>➕ Agregar Egreso</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={guardarEdicion}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>💾 Guardar</Text>
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
  content: {
    padding: 15,
  },
  buscadorContainer: {
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
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DFE6E9',
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
  buscarButton: {
    backgroundColor: '#6C5CE7',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cajaCard: {
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
  cajaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 10,
  },
  cajaInfo: {
    marginBottom: 10,
  },
  cajaInfoText: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  cajaInfoTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00B894',
    marginVertical: 5,
  },
  cajaInfoCreador: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 5,
    fontStyle: 'italic',
  },
  editarButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deniedIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  deniedText: {
    fontSize: 16,
    color: '#636E72',
    textAlign: 'center',
    marginTop: 10,
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
    color: '#2D3436',
    marginTop: 10,
    marginBottom: 5,
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
  modalEgresoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  modalEgresoText: {
    fontSize: 14,
    color: '#2D3436',
  },
  modalEgresoDelete: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalAddEgreso: {
    backgroundColor: '#00B894',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  modalAddEgresoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
});

export default EdicionCajas;