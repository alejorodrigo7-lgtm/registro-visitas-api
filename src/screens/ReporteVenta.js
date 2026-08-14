// ra2p-nuevo/src/screens/ReporteVenta.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Picker } from '@react-native-picker/picker';

const ReporteVenta = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    fechaVenta: new Date(),
    codigo: '',
    cedula: '',
    usuario: user?._id || '',
    producto: 'TV',
    valorPagar: '',
    ventaAsociada: '',
  });

  const [ventasDisponibles, setVentasDisponibles] = useState([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);

  useEffect(() => {
    cargarVentasNoIngresadas();
  }, []);

  const cargarVentasNoIngresadas = async () => {
    try {
      setCargandoVentas(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/ventas/ventas?ingresada=false`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setVentasDisponibles(response.data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setCargandoVentas(false);
    }
  };

  const validarFormulario = () => {
    const campos = [
      { key: 'codigo', label: 'Código' },
      { key: 'cedula', label: 'Cédula' },
      { key: 'producto', label: 'Producto' },
      { key: 'valorPagar', label: 'Valor a Pagar' },
    ];

    for (const campo of campos) {
      if (!formData[campo.key] || formData[campo.key].trim() === '') {
        Alert.alert('Error', `El campo "${campo.label}" es obligatorio`);
        return false;
      }
    }

    if (isNaN(Number(formData.valorPagar)) || Number(formData.valorPagar) <= 0) {
      Alert.alert('Error', 'El valor a pagar debe ser un número positivo');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const dataToSend = {
        ...formData,
        valorPagar: Number(formData.valorPagar),
        ventaAsociada: formData.ventaAsociada || null,
      };

      const response = await axios.post(
        `${API_URL}/api/ventas/reporte`,
        dataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      Alert.alert(
        '✅ Éxito',
        'Reporte de venta creado correctamente',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setFormData({
                ...formData,
                codigo: '',
                cedula: '',
                producto: 'TV',
                valorPagar: '',
                ventaAsociada: '',
              });
              cargarVentasNoIngresadas();
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Error al crear reporte:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al crear el reporte');
    } finally {
      setLoading(false);
    }
  };

  const productos = ['TV', 'Internet', 'Duo'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D4A574" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reporte de Venta</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Fecha de Venta */}
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.label}>📅 Fecha de Venta *</Text>
            <View style={styles.dateInput}>
              <Text style={styles.dateText}>
                {formData.fechaVenta.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#D4A574" />
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={formData.fechaVenta}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, fechaVenta: selectedDate });
                  }
                }}
              />
            )}
          </TouchableOpacity>

          {/* Código */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>📝 Código *</Text>
            <TextInput
              style={styles.input}
              value={formData.codigo}
              onChangeText={(text) => setFormData({ ...formData, codigo: text })}
              placeholder="Ingrese el código"
              placeholderTextColor="#444"
              autoCapitalize="characters"
            />
          </View>

          {/* Cédula */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>🪪 Cédula *</Text>
            <TextInput
              style={styles.input}
              value={formData.cedula}
              onChangeText={(text) => setFormData({ ...formData, cedula: text })}
              placeholder="Ingrese la cédula del cliente"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />
          </View>

          {/* Usuario (no modificable) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>👤 Usuario *</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputDisabledText}>
                {user?.nombre || 'Usuario no identificado'}
              </Text>
            </View>
          </View>

          {/* Producto */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>📦 Producto *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.producto}
                onValueChange={(itemValue) => setFormData({ ...formData, producto: itemValue })}
                style={styles.picker}
                dropdownIconColor="#D4A574"
                itemStyle={styles.pickerItem}
              >
                {productos.map((producto) => (
                  <Picker.Item key={producto} label={producto} value={producto} color="#FFF" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Valor a Pagar */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>💰 Valor a Pagar *</Text>
            <TextInput
              style={styles.input}
              value={formData.valorPagar}
              onChangeText={(text) => setFormData({ ...formData, valorPagar: text })}
              placeholder="0.00"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />
          </View>

          {/* Venta Asociada (opcional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>🔗 Venta Asociada (Opcional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.ventaAsociada}
                onValueChange={(itemValue) => setFormData({ ...formData, ventaAsociada: itemValue })}
                style={styles.picker}
                dropdownIconColor="#D4A574"
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Ninguna" value="" color="#888" />
                {ventasDisponibles.map((venta) => (
                  <Picker.Item 
                    key={venta._id} 
                    label={`${venta.usuario?.nombre || 'Usuario'} - ${venta.plan}`} 
                    value={venta._id} 
                    color="#FFF"
                  />
                ))}
              </Picker>
            </View>
            {cargandoVentas && (
              <ActivityIndicator size="small" color="#2196F3" style={styles.loadingSmall} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Crear Reporte</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#1A1A2E',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,165,116,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CCC',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputDisabled: {
    backgroundColor: '#0D0D1A',
    borderRadius: 10,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputDisabledText: {
    color: '#666',
    fontSize: 16,
  },
  dateInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateText: {
    color: '#FFF',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  picker: {
    color: '#FFF',
    height: 50,
  },
  pickerItem: {
    color: '#FFF',
    backgroundColor: '#1A1A2E',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingSmall: {
    marginTop: 8,
  },
});

export default ReporteVenta;