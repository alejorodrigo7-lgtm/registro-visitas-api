import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Alertas = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [filtro, setFiltro] = useState('todas');

  const cargarAlertas = async () => {
    try {
      const response = await api.get('/notificaciones');
      setAlertas(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
      setAlertas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarAlertas();
  };

  const marcarComoLeida = async (id) => {
    try {
      await api.put(`/notificaciones/${id}/leer`);
      cargarAlertas();
    } catch (error) {
      setAlertas(alertas.map(a => 
        a._id === id ? { ...a, leida: true } : a
      ));
    }
  };

  const eliminarAlerta = async (id) => {
    Alert.alert(
      'Eliminar Alerta',
      '¿Estás seguro de eliminar esta alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/notificaciones/${id}`);
              cargarAlertas();
            } catch (error) {
              setAlertas(alertas.filter(a => a._id !== id));
            }
          },
        },
      ]
    );
  };

  const marcarTodasComoLeidas = async () => {
    try {
      await api.put('/notificaciones/leer-todas');
      cargarAlertas();
    } catch (error) {
      setAlertas(alertas.map(a => ({ ...a, leida: true })));
    }
  };

  const getAlertasFiltradas = () => {
    if (filtro === 'no_leidas') {
      return alertas.filter(a => !a.leida);
    } else if (filtro === 'leidas') {
      return alertas.filter(a => a.leida);
    }
    return alertas;
  };

  const getIconForTipo = (tipo) => {
    const icons = {
      'visita': '📋',
      'servicio': '🛠️',
      'transferencia': '💰',
      'sistema': '⚙️',
      'alerta_horario': '⏰',
    };
    return icons[tipo] || '📌';
  };

  const getColorForTipo = (tipo) => {
    const colors = {
      'visita': '#6C5CE7',
      'servicio': '#00B894',
      'transferencia': '#FDCB6E',
      'sistema': '#0984E3',
      'alerta_horario': '#E17055',
    };
    return colors[tipo] || '#636E72';
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Hace ' + diff + 's';
    if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + 'm';
    if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + 'h';
    return date.toLocaleDateString('es-ES');
  };

  const alertasFiltradas = getAlertasFiltradas();
  const noLeidas = alertas.filter(a => !a.leida).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Cargando alertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Alertas</Text>
        {noLeidas > 0 && (
          <TouchableOpacity
            style={styles.marcarLeidasButton}
            onPress={marcarTodasComoLeidas}
          >
            <Text style={styles.marcarLeidasText}>✓ Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroButton, filtro === 'todas' && styles.filtroActivo]}
          onPress={() => setFiltro('todas')}
        >
          <Text style={[styles.filtroText, filtro === 'todas' && styles.filtroTextActivo]}>
            Todas ({alertas.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroButton, filtro === 'no_leidas' && styles.filtroActivo]}
          onPress={() => setFiltro('no_leidas')}
        >
          <Text style={[styles.filtroText, filtro === 'no_leidas' && styles.filtroTextActivo]}>
            No leídas ({noLeidas})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroButton, filtro === 'leidas' && styles.filtroActivo]}
          onPress={() => setFiltro('leidas')}
        >
          <Text style={[styles.filtroText, filtro === 'leidas' && styles.filtroTextActivo]}>
            Leídas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.listaContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {alertasFiltradas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>No hay alertas</Text>
            <Text style={styles.emptySubText}>Todas las alertas están leídas o no hay notificaciones</Text>
          </View>
        ) : (
          alertasFiltradas.map((alerta) => (
            <TouchableOpacity
              key={alerta._id}
              style={[
                styles.alertaCard,
                !alerta.leida && styles.alertaNoLeida,
              ]}
              onPress={() => !alerta.leida && marcarComoLeida(alerta._id)}
              onLongPress={() => eliminarAlerta(alerta._id)}
            >
              <View style={styles.alertaHeader}>
                <View style={styles.alertaTituloContainer}>
                  <Text style={styles.alertaIcon}>
                    {getIconForTipo(alerta.tipo)}
                  </Text>
                  <Text style={[styles.alertaTitulo, !alerta.leida && styles.alertaTituloNoLeida]}>
                    {alerta.titulo}
                  </Text>
                </View>
                {!alerta.leida && <View style={styles.puntoNoLeido} />}
              </View>

              <Text style={styles.alertaMensaje}>{alerta.mensaje}</Text>

              <View style={styles.alertaFooter}>
                <View style={[styles.tipoBadge, { backgroundColor: getColorForTipo(alerta.tipo) }]}>
                  <Text style={styles.tipoBadgeText}>{alerta.tipo}</Text>
                </View>
                <Text style={styles.alertaFecha}>{formatFecha(alerta.fecha)}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#6C5CE7',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  marcarLeidasButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  marcarLeidasText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  filtrosContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filtroButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  filtroActivo: { backgroundColor: '#6C5CE7' },
  filtroText: { fontSize: 13, color: '#636E72' },
  filtroTextActivo: { color: '#FFFFFF', fontWeight: '500' },
  listaContainer: { flex: 1, padding: 15 },
  alertaCard: {
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
  alertaNoLeida: { borderLeftWidth: 4, borderLeftColor: '#6C5CE7' },
  alertaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertaTituloContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  alertaIcon: { fontSize: 18, marginRight: 8 },
  alertaTitulo: { fontSize: 16, fontWeight: '600', color: '#2D3436', flex: 1 },
  alertaTituloNoLeida: { fontWeight: '700' },
  puntoNoLeido: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6C5CE7', marginLeft: 8 },
  alertaMensaje: { fontSize: 14, color: '#636E72', marginBottom: 10, lineHeight: 20 },
  alertaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  tipoBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '500' },
  alertaFecha: { fontSize: 12, color: '#B2BEC3' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#636E72' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#2D3436' },
  emptySubText: { fontSize: 14, color: '#636E72', marginTop: 5 },
  footerSpacer: { height: 20 },
});

export default Alertas;