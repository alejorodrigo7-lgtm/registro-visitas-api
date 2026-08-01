import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const NotificacionesScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [total, setTotal] = useState(0);
  const { user, unreadCount, refreshUnreadCount } = useAuth();

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifResponse, countResponse] = await Promise.all([
        notificationService.getNotifications({ limit: 50 }),
        notificationService.getUnreadCount(),
      ]);
      
      setNotificaciones(notifResponse.data.data || []);
      setTotal(notifResponse.data.total || 0);
      
      // Actualizar el contador en el contexto
      if (refreshUnreadCount) {
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('❌ Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotificaciones(prev =>
        prev.map(n => n._id === id ? { ...n, leida: true } : n)
      );
      if (refreshUnreadCount) {
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('❌ Error marcando como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true }))
      );
      if (refreshUnreadCount) {
        await refreshUnreadCount();
      }
      Alert.alert('Éxito', 'Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('❌ Error marcando todas:', error);
      Alert.alert('Error', 'No se pudieron marcar todas');
    }
  };

  const deleteNotification = async (id) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que quieres eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(id);
              setNotificaciones(prev => prev.filter(n => n._id !== id));
              setTotal(prev => prev - 1);
            } catch (error) {
              console.error('❌ Error eliminando:', error);
              Alert.alert('Error', 'No se pudo eliminar la notificación');
            }
          },
        },
      ]
    );
  };

  const getIcon = (tipo) => {
    const icons = {
      'visita': '📋',
      'asistencia': '📍',
      'alerta_horario': '⏰',
      'transferencia': '📤',
      'servicio': '🛠️',
      'sistema': '🔔',
    };
    return icons[tipo] || '🔔';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.leida && styles.unread]}
      onPress={() => !item.leida && markAsRead(item._id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getIcon(item.tipo)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.titulo}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.mensaje}
        </Text>
        <Text style={styles.notificationDate}>
          {new Date(item.fecha).toLocaleString()}
        </Text>
      </View>
      {!item.leida && <View style={styles.unreadDot} />}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(item._id)}
      >
        <Ionicons name="close" size={20} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando notificaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🔔 Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {notificaciones.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={60} color="#CCC" />
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
          <Text style={styles.emptySubText}>
            Las notificaciones aparecerán aquí cuando las recibas
          </Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  badge: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unread: {
    backgroundColor: '#F0EDFF',
    borderLeftWidth: 4,
    borderLeftColor: '#6C5CE7',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  notificationDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C5CE7',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#636E72',
  },
});

export default NotificacionesScreen;