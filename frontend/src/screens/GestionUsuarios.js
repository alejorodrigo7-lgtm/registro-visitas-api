import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const GestionUsuarios = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'Tecnico',
    telefono: '',
    especialidad: '',
  });

  // Cargar lista de usuarios
  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/usuarios');
      console.log('Usuarios cargados:', response.data);
      setUsuarios(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Crear usuario
  const handleCrearUsuario = async () => {
    if (!formData.nombre || !formData.email || !formData.password) {
      Alert.alert('Error', 'Nombre, Email y Contraseña son obligatorios');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      Alert.alert('Éxito', 'Usuario creado correctamente');
      setFormData({ nombre: '', email: '', password: '', rol: 'Tecnico', telefono: '', especialidad: '' });
      cargarUsuarios();
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario
  const eliminarUsuario = async (id, nombre) => {
    if (!id) {
      Alert.alert('Error', 'ID de usuario no válido');
      return;
    }

    Alert.alert(
      'Eliminar Usuario',
      `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Eliminando usuario con ID:', id);
              await api.delete(`/auth/usuarios/${id}`);
              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              cargarUsuarios();
            } catch (error) {
              console.error('Error al eliminar:', error);
              Alert.alert('Error', error.response?.data?.message || 'Error al eliminar el usuario');
            }
          },
        },
      ]
    );
  };

  // Desactivar/Activar usuario
  const toggleActivarUsuario = async (id, nombre, activo) => {
    if (!id) {
      Alert.alert('Error', 'ID de usuario no válido');
      return;
    }

    const accion = activo ? 'desactivar' : 'activar';
    Alert.alert(
      `${activo ? 'Desactivar' : 'Activar'} Usuario`,
      `¿Estás seguro de ${accion} a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: activo ? 'Desactivar' : 'Activar',
          onPress: async () => {
            try {
              console.log(`Toggle usuario ID: ${id}, nuevo estado: ${!activo}`);
              await api.put(`/auth/usuarios/${id}/toggle`, { activo: !activo });
              Alert.alert('Éxito', `Usuario ${activo ? 'desactivado' : 'activado'} correctamente`);
              cargarUsuarios();
            } catch (error) {
              console.error('Error al toggle:', error);
              Alert.alert('Error', error.response?.data?.message || `Error al ${accion} el usuario`);
            }
          },
        },
      ]
    );
  };

  // Renderizar cada usuario
  const renderUsuario = (item) => {
    if (!item || !item._id) {
      console.warn('Usuario sin ID:', item);
      return null;
    }

    const esAdmin = user?._id === item._id;
    const rolColors = {
      Admin: '#FF6B6B',
      Jefe: '#4ECDC4',
      Coordinador: '#45B7D1',
      Tecnico: '#96CEB4',
    };

    const isActivo = item.activo !== false;

    return (
      <View key={item._id} style={styles.usuarioCard}>
        <View style={styles.usuarioHeader}>
          <View style={styles.usuarioInfo}>
            <Text style={styles.usuarioNombre}>{item.nombre || 'Sin nombre'}</Text>
            <Text style={styles.usuarioEmail}>{item.email || 'Sin email'}</Text>
          </View>
          <View style={[styles.rolBadge, { backgroundColor: rolColors[item.rol] || '#636E72' }]}>
            <Text style={styles.rolBadgeText}>{item.rol || 'Sin rol'}</Text>
          </View>
        </View>

        <View style={styles.usuarioFooter}>
          <Text style={[styles.usuarioEstado, isActivo ? styles.activo : styles.inactivo]}>
            {isActivo ? '🟢 Activo' : '🔴 Inactivo'}
          </Text>
          <View style={styles.usuarioAcciones}>
            {!esAdmin && (
              <>
                <TouchableOpacity
                  style={[styles.accionButton, isActivo ? styles.accionActivar : styles.accionDesactivar]}
                  onPress={() => toggleActivarUsuario(item._id, item.nombre, isActivo)}
                >
                  <Text style={styles.accionButtonText}>
                    {isActivo ? '🔴 Desactivar' : '🟢 Activar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.accionButton, styles.accionEliminar]}
                  onPress={() => eliminarUsuario(item._id, item.nombre)}
                >
                  <Text style={styles.accionButtonText}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              </>
            )}
            {esAdmin && (
              <Text style={styles.usuarioActual}>👤 Tú</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Gestión de Usuarios</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>➕ Nuevo Usuario</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listaContainer}>
          {usuarios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          ) : (
            usuarios.map(renderUsuario)
          )}
        </ScrollView>
      )}

      {/* Modal para crear usuario */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👤 Nuevo Usuario</Text>

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
              placeholder="Nombre completo"
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
            />

            <Text style={styles.label}>Rol *</Text>
            <View style={styles.rolesContainer}>
              {['Admin', 'Jefe', 'Coordinador', 'Tecnico'].map((rol) => (
                <TouchableOpacity
                  key={rol}
                  style={[
                    styles.rolButton,
                    formData.rol === rol && styles.rolButtonSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, rol })}
                >
                  <Text
                    style={[
                      styles.rolButtonText,
                      formData.rol === rol && styles.rolButtonTextSelected,
                    ]}
                  >
                    {rol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              value={formData.telefono}
              onChangeText={(text) => setFormData({ ...formData, telefono: text })}
              placeholder="0987654321"
              keyboardType="phone-pad"
            />

            {formData.rol === 'Tecnico' && (
              <>
                <Text style={styles.label}>Especialidad (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.especialidad}
                  onChangeText={(text) => setFormData({ ...formData, especialidad: text })}
                  placeholder="Ej: Instalaciones eléctricas"
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleCrearUsuario}
              >
                <Text style={styles.modalButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#6C5CE7',
    fontWeight: 'bold',
    fontSize: 14,
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
  listaContainer: {
    padding: 15,
  },
  usuarioCard: {
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
  usuarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  usuarioEmail: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  rolBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  usuarioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  usuarioEstado: {
    fontSize: 12,
    fontWeight: '500',
  },
  activo: {
    color: '#00B894',
  },
  inactivo: {
    color: '#FF6B6B',
  },
  usuarioAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  accionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
  },
  accionActivar: {
    backgroundColor: '#45B7D1',
  },
  accionDesactivar: {
    backgroundColor: '#FF6B6B',
  },
  accionEliminar: {
    backgroundColor: '#FF6B6B',
  },
  accionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  usuarioActual: {
    color: '#6C5CE7',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#636E72',
    fontSize: 16,
  },
  // Modal
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
  label: {
    fontSize: 14,
    color: '#2D3436',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    marginBottom: 12,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  rolButton: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE6E9',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  rolButtonSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  rolButtonText: {
    fontSize: 12,
    color: '#2D3436',
  },
  rolButtonTextSelected: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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

export default GestionUsuarios;