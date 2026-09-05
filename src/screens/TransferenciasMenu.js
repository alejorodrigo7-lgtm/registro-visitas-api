import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TransferenciasMenu = ({ navigation }) => {
  const { user } = useAuth();
  
  const isTecnico = user?.rol === 'Tecnico';
  const isCoordinador = user?.rol === 'Coordinador';
  const showConfirmacionIngreso = !isTecnico && !isCoordinador;

  console.log('🔍 [TransferenciasMenu] Usuario:', user?.rol);
  console.log('🔍 [TransferenciasMenu] showConfirmacionIngreso:', showConfirmacionIngreso);

  // ✅ Función para navegar usando el Stack Navigator padre
  const navegarA = (screen) => {
    console.log(`📤 Navegando a ${screen}`);
    
    try {
      // Obtener el estado de navegación
      const state = navigation.getState();
      console.log('🔍 Estado de navegación:', state);
      
      // Intentar obtener el Stack Navigator padre
      let parent = navigation.getParent();
      
      // Si no hay padre, buscar el navigator raíz
      if (!parent) {
        console.log('⚠️ No hay parent directo, buscando navigator raíz...');
        // Buscar el navigator raíz (el Stack principal)
        let current = navigation;
        let lastNavigator = current;
        
        while (current.getParent) {
          const nextParent = current.getParent();
          if (!nextParent) break;
          lastNavigator = nextParent;
          current = nextParent;
        }
        parent = lastNavigator;
        console.log('✅ Navigator raíz encontrado');
      }
      
      // Navegar usando el navigator encontrado
      if (parent) {
        console.log(`✅ Navegando con parent a ${screen}`);
        parent.navigate(screen);
      } else {
        console.log(`⚠️ Fallback: navigation directo a ${screen}`);
        navigation.navigate(screen);
      }
    } catch (error) {
      console.error(`❌ Error navegando a ${screen}:`, error);
      navigation.navigate(screen);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Transferencias</Text>
        <Text style={styles.subtitle}>Selecciona una opción</Text>
      </View>

      <View style={styles.menuContainer}>
        {/* 1. SUBIR TRANSFERENCIA - SIEMPRE VISIBLE */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navegarA('SubirTransferencia')}
        >
          <View style={styles.menuItemContent}>
            <View style={[styles.iconContainer, styles.iconUpload]}>
              <Icon name="cloud-upload" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>📤 Subir Transferencia</Text>
              <Text style={styles.menuDescription}>Subir una nueva transferencia con comprobante</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#B2BEC3" />
        </TouchableOpacity>

        {/* 2. TRANSFERENCIAS DENEGADAS - SIEMPRE VISIBLE PARA TODOS */}
        <TouchableOpacity 
          style={[styles.menuItem, styles.menuItemDenegadas]} 
          onPress={() => navegarA('TransferenciasDenegadas')}
        >
          <View style={styles.menuItemContent}>
            <View style={[styles.iconContainer, styles.iconDenegadas]}>
              <Icon name="cancel" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={[styles.menuText, { color: '#FF6B6B', fontWeight: 'bold' }]}>❌ Transferencias Denegadas</Text>
              <Text style={styles.menuDescription}>Ver transferencias denegadas con sus notas</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#B2BEC3" />
        </TouchableOpacity>

        {/* 3. SOLO PARA ADMIN/JEFE: Confirmación e Ingreso */}
        {showConfirmacionIngreso && (
          <>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navegarA('ConfirmacionTransferencias')}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.iconContainer, styles.iconConfirm]}>
                  <Icon name="check-circle" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>✅ Confirmación Transferencias</Text>
                  <Text style={styles.menuDescription}>Aprobar o denegar transferencias pendientes</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#B2BEC3" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => navegarA('IngresoTransferencias')}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.iconContainer, styles.iconIngreso]}>
                  <Icon name="payment" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>💰 Ingreso Transferencias</Text>
                  <Text style={styles.menuDescription}>Registrar el ingreso de transferencias aprobadas</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#B2BEC3" />
            </TouchableOpacity>
          </>
        )}

        {/* 4. REVISIÓN TRANSFERENCIAS - SIEMPRE VISIBLE */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => navegarA('RevisionTransferencias')}
        >
          <View style={styles.menuItemContent}>
            <View style={[styles.iconContainer, styles.iconRevision]}>
              <Icon name="search" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>🔍 Revisión Transferencias</Text>
              <Text style={styles.menuDescription}>Revisar el historial de transferencias</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#B2BEC3" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 30,
    backgroundColor: '#0984E3',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 5,
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemDenegadas: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconUpload: {
    backgroundColor: '#4A90D9',
  },
  iconConfirm: {
    backgroundColor: '#00B894',
  },
  iconDenegadas: {
    backgroundColor: '#FF6B6B',
  },
  iconIngreso: {
    backgroundColor: '#FDCB6E',
  },
  iconRevision: {
    backgroundColor: '#6C5CE7',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  menuDescription: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
});

export default TransferenciasMenu;