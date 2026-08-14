import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const SolicitarReciboMenu = ({ navigation }) => {
  const { user } = useAuth();
  const isAdminOrJefe = ['Admin', 'Jefe'].includes(user?.rol);

  const options = [
    {
      title: '📝 Solicitar Recibo',
      subtitle: 'Solicita un nuevo recibo para tu cliente',
      icon: 'create-outline',
      screen: 'SolicitarRecibo',
      visible: true
    },
    {
      title: '📤 Subir Recibo',
      subtitle: 'Administra las solicitudes de recibos',
      icon: 'cloud-upload-outline',
      screen: 'SubirRecibo',
      visible: isAdminOrJefe
    },
    {
      title: '📥 Descargar Recibo',
      subtitle: 'Descarga los recibos aprobados',
      icon: 'download-outline',
      screen: 'DescargarRecibo',
      visible: true
    }
  ];

  const visibleOptions = options.filter(opt => opt.visible);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Recibo</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>📋 Módulo de Recibos</Text>
          <Text style={styles.greetingSubtext}>
            Solicita, sube o descarga recibos de tus clientes
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {visibleOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionCard}
              onPress={() => navigation.navigate(option.screen)}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name={option.icon} size={32} color="#4CAF50" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ Información</Text>
          <Text style={styles.infoText}>
            • Todos los usuarios pueden solicitar y descargar recibos
          </Text>
          <Text style={styles.infoText}>
            • Solo Administradores y Jefes pueden aprobar solicitudes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
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
  backButton: {
    padding: 5,
    width: 40
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50'
  },
  headerRight: {
    width: 40
  },
  content: {
    flex: 1,
    padding: 20
  },
  greetingContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    alignItems: 'center'
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff'
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#E8F5E9',
    marginTop: 5,
    textAlign: 'center'
  },
  optionsContainer: {
    marginBottom: 25
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  optionTextContainer: {
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50'
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginTop: 10
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#0D47A1',
    marginBottom: 5
  }
});

export default SolicitarReciboMenu;