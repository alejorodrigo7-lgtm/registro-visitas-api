import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
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

const RevisarDepositos = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [depositos, setDepositos] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroCuenta, setFiltroCuenta] = useState('');
  const [filtroZona, setFiltroZona] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [depositoSeleccionado, setDepositoSeleccionado] = useState(null);

  const zonas = ['TOLA', 'MAGDALENA', 'CHILIBULO'];
  const cuentas = [
    '4738408100 MARY CORDOBA',
    '27230428 ISABELA CORDOBA',
    '27212641 ISABELA CORDOBA',
    'OTROS',
  ];

  const cargarDepositos = async () => {
    try {
      let url = '/cajas/depositos/revisar?';
      if (filtroFecha) url += `fecha=${filtroFecha}&`;
      if (filtroCuenta) url += `cuenta=${filtroCuenta}&`;
      if (filtroZona) url += `zona=${filtroZona}&`;

      const response = await api.get(url);
      setDepositos(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar depósitos:', error);
      Alert.alert('Error', 'No se pudieron cargar los depósitos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDepositos();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDepositos();
  };

  const buscarDepositos = () => {
    setLoading(true);
    cargarDepositos();
  };

  const marcarRevisado = async (id) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de marcar este depósito como revisado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar Revisado',
          onPress: async () => {
            try {
              await api.put(`/cajas/depositos/${id}/revisar`);
              Alert.alert('Éxito', 'Depósito marcado como revisado');
              cargarDepositos();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Error al marcar revisado');
            }
          },
        },
      ]
    );
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES');
  };

  const getEstadoColor = (estado) => {
    return estado === 'REVISADO' ? '#00B894' : '#FDCB6E';
  };

  const getEstadoLabel = (estado) => {
    return estado === 'REVISADO' ? '✅ Revisado' : '📤 Subido';
  };

  const renderDeposito = (item) => {
    return (
      <TouchableOpacity
        key={item._id}
        style={styles.depositoCard}
        onPress={() => {
          setDepositoSeleccionado(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.depositoHeader}>
          <Text style={styles.depositoNombre}>{item.nombre}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoBadgeText}>{getEstadoLabel(item.estado)}</Text>
          </View>
        </View>

        <Text style={styles.depositoInfo}>📍 {item.zona}</Text>
        <Text style={styles.depositoInfo}>🏦 {item.cuenta}</Text>
        <Text style={styles.depositoInfo}>📅 {formatFecha(item.fecha)}</Text>
        <Text style={styles.depositoInfo}>👤 {item.creadoPor?.nombre || 'Desconocido'}</Text>

        {item.estado === 'SUBIDO' && (
          <TouchableOpacity
            style={styles.revisarButton}
            onPress={() => marcarRevisado(item._id)}
          >
            <Text style={styles.revisarButtonText}>✅ Marcar Revisado</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando depósitos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Revisar Depósitos</Text>
        <Text style={styles.subtitle}>Buscar y revisar depósitos</Text>
      </View>

      <View style={styles.filtrosContainer}>
        <TextInput
          style={styles.filtroInput}
          value={filtroFecha}
          onChangeText={setFiltroFecha}
          placeholder="Fecha (YYYY-MM-DD)"
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filtroCuenta}
            onValueChange={setFiltroCuenta}
            style={styles.picker}
          >
            <Picker.Item label="Todas las cuentas" value="" />
            {cuentas.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filtroZona}
            onValueChange={setFiltroZona}
            style={styles.picker}
          >
            <Picker.Item label="Todas las zonas" value="" />
            {zonas.map((z) => (
              <Picker.Item key={z} label={z} value={z} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.buscarButton} onPress={buscarDepositos}>
          <Text style={styles.buscarButtonText}>🔍 Buscar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {depositos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay depósitos</Text>
            <Text style={styles.emptySubText}>
              {filtroFecha || filtroCuenta || filtroZona
                ? 'No se encontraron depósitos con esos filtros'
                : 'No hay depósitos registrados'}
            </Text>
          </View>
        ) : (
          depositos.map(renderDeposito)
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Modal de Detalle */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Detalle del Depósito</Text>

            {depositoSeleccionado && (
              <View>
                <Text style={styles.modalLabel}>Zona:</Text>
                <Text style={styles.modalValue}>{depositoSeleccionado.zona}</Text>

                <Text style={styles.modalLabel}>Fecha:</Text>
                <Text style={styles.modalValue}>{formatFecha(depositoSeleccionado.fecha)}</Text>

                <Text style={styles.modalLabel}>Nombre:</Text>
                <Text style={styles.modalValue}>{depositoSeleccionado.nombre}</Text>

                <Text style={styles.modalLabel}>Cuenta:</Text>
                <Text style={styles.modalValue}>{depositoSeleccionado.cuenta}</Text>

                <Text style={styles.modalLabel}>Observaciones:</Text>
                <Text style={styles.modalValue}>{depositoSeleccionado.observaciones || 'Ninguna'}</Text>

                <Text style={styles.modalLabel}>Estado:</Text>
                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(depositoSeleccionado.estado), alignSelf: 'flex-start' }]}>
                  <Text style={styles.estadoBadgeText}>{getEstadoLabel(depositoSeleccionado.estado)}</Text>
                </View>

                <Text style={styles.modalLabel}>Creado por:</Text>
                <Text style={styles.modalValue}>{depositoSeleccionado.creadoPor?.nombre || 'Desconocido'}</Text>

                <Text style={styles.modalLabel}>Fecha creación:</Text>
                <Text style={styles.modalValue}>{formatFecha(depositoSeleccionado.createdAt)}</Text>

                {depositoSeleccionado.imagen && (
                  <View>
                    <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                    <Image
                      source={{
                        uri: depositoSeleccionado.imagen.startsWith('data:image')
                          ? depositoSeleccionado.imagen
                          : `data:image/jpeg;base64,${depositoSeleccionado.imagen}`
                      }}
                      style={styles.modalImagen}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {depositoSeleccionado.estado === 'SUBIDO' && (
                  <TouchableOpacity
                    style={styles.modalRevisarButton}
                    onPress={() => {
                      setModalVisible(false);
                      marcarRevisado(depositoSeleccionado._id);
                    }}
                  >
                    <Text style={styles.modalRevisarButtonText}>✅ Marcar Revisado</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCerrar}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCerrarText}>Cerrar</Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  filtrosContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroInput: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buscarButton: {
    backgroundColor: '#6C5CE7',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buscarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listaContainer: {
    flex: 1,
    padding: 15,
  },
  depositoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  depositoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  depositoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  depositoInfo: {
    fontSize: 14,
    color: '#636E72',
    marginVertical: 2,
  },
  revisarButton: {
    backgroundColor: '#00B894',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  revisarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  emptySubText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
  },
  footerSpacer: {
    height: 20,
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
    color: '#636E72',
    marginTop: 10,
    marginBottom: 5,
  },
  modalValue: {
    fontSize: 16,
    color: '#2D3436',
    marginBottom: 4,
  },
  modalImagen: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 5,
  },
  modalRevisarButton: {
    backgroundColor: '#00B894',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  modalRevisarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalCerrar: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#DFE6E9',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCerrarText: {
    color: '#2D3436',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RevisarDepositos;