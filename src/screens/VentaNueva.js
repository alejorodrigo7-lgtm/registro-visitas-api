// ra2p-nuevo/src/screens/VentaNueva.js
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
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const VentaNueva = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [formData, setFormData] = useState({
    fecha: new Date(),
    usuario: user?._id || '',
    cedulaDelantera: '',
    cedulaTrasera: '',
    fotoDomicilio: '',
    selfieCedula: '',
    direccionCompleta: '',
    telefono1: '',
    telefono2: '',
    email: '',
    plan: '',
  });

  const [fotos, setFotos] = useState({
    cedulaDelantera: null,
    cedulaTrasera: null,
    fotoDomicilio: null,
    selfieCedula: null,
  });

  const tomarFoto = async (campo) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFotos(prev => ({ ...prev, [campo]: result.assets[0].uri }));
        setFormData(prev => ({ ...prev, [campo]: base64 }));
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarGaleria = async (campo) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFotos(prev => ({ ...prev, [campo]: result.assets[0].uri }));
        setFormData(prev => ({ ...prev, [campo]: base64 }));
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const mostrarOpcionesFoto = (campo) => {
    Alert.alert(
      'Seleccionar Foto',
      '¿Cómo deseas obtener la foto?',
      [
        { text: 'Cámara', onPress: () => tomarFoto(campo) },
        { text: 'Galería', onPress: () => seleccionarGaleria(campo) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const validarFormulario = () => {
    const campos = [
      { key: 'cedulaDelantera', label: 'Cédula Delantera' },
      { key: 'cedulaTrasera', label: 'Cédula Trasera' },
      { key: 'fotoDomicilio', label: 'Foto Domicilio' },
      { key: 'selfieCedula', label: 'Selfie con Cédula' },
      { key: 'direccionCompleta', label: 'Dirección Completa' },
      { key: 'telefono1', label: 'Teléfono 1' },
      { key: 'telefono2', label: 'Teléfono 2' },
      { key: 'email', label: 'Email' },
      { key: 'plan', label: 'Plan' },
    ];

    for (const campo of campos) {
      if (!formData[campo.key] || formData[campo.key].trim() === '') {
        Alert.alert('Error', `El campo "${campo.label}" es obligatorio`);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Email no válido');
      return false;
    }

    if (formData.telefono1.length < 10 || formData.telefono2.length < 10) {
      Alert.alert('Error', 'Los teléfonos deben tener al menos 10 dígitos');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/ventas/venta`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      Alert.alert(
        '✅ Éxito',
        'Venta registrada correctamente',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error al guardar venta:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar la venta');
    } finally {
      setLoading(false);
    }
  };

  const camposFotos = [
    { key: 'cedulaDelantera', label: 'Cédula Delantera', icon: 'id-card' },
    { key: 'cedulaTrasera', label: 'Cédula Trasera', icon: 'id-card' },
    { key: 'fotoDomicilio', label: 'Foto Domicilio', icon: 'home' },
    { key: 'selfieCedula', label: 'Selfie con Cédula', icon: 'person' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#D4A574" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venta Nueva</Text>
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
          {/* Fecha */}
          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.label}>📅 Fecha *</Text>
            <View style={styles.dateInput}>
              <Text style={styles.dateText}>
                {formData.fecha.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#D4A574" />
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={formData.fecha}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, fecha: selectedDate });
                  }
                }}
              />
            )}
          </TouchableOpacity>

          {/* Usuario (no modificable) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>👤 Usuario *</Text>
            <View style={styles.inputDisabled}>
              <Text style={styles.inputDisabledText}>
                {user?.nombre || 'Usuario no identificado'}
              </Text>
            </View>
          </View>

          {/* Fotos */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>📸 Fotos Obligatorias</Text>
            <Text style={styles.sectionSubtitle}>Toca para tomar o seleccionar foto</Text>
            
            {camposFotos.map((campo) => (
              <View key={campo.key} style={styles.photoContainer}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => mostrarOpcionesFoto(campo.key)}
                >
                  <Ionicons name={campo.icon} size={22} color="#D4A574" />
                  <Text style={styles.photoButtonText}>{campo.label}</Text>
                  <Ionicons name="camera-outline" size={18} color="#666" />
                </TouchableOpacity>
                {fotos[campo.key] && (
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: fotos[campo.key] }} style={styles.photoPreview} />
                    <TouchableOpacity 
                      style={styles.photoRemove}
                      onPress={() => {
                        setFotos(prev => ({ ...prev, [campo.key]: null }));
                        setFormData(prev => ({ ...prev, [campo.key]: '' }));
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Datos personales */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>📍 Dirección Completa *</Text>
            <TextInput
              style={styles.input}
              value={formData.direccionCompleta}
              onChangeText={(text) => setFormData({ ...formData, direccionCompleta: text })}
              placeholder="Ingrese la dirección completa"
              placeholderTextColor="#444"
              multiline
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <Text style={styles.label}>📱 Teléfono 1 *</Text>
              <TextInput
                style={styles.input}
                value={formData.telefono1}
                onChangeText={(text) => setFormData({ ...formData, telefono1: text })}
                placeholder="Teléfono 1"
                placeholderTextColor="#444"
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>
            <View style={[styles.inputContainer, styles.half