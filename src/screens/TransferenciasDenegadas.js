import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    Image,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TransferenciasDenegadas = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [transferencias, setTransferencias] = useState([]);
    const [transferenciasFiltradas, setTransferenciasFiltradas] = useState([]);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    
    const [modalVisible, setModalVisible] = useState(false);
    const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);
    const [modalFotoVisible, setModalFotoVisible] = useState(false);
    const [fotoAmpliada, setFotoAmpliada] = useState(null);

    // Validar imagen (soporta Cloudinary y Base64)
    const validarImagen = (item) => {
        try {
            if (!item) return null;
            let imagen = item.imagenComprobante || item.soporte || null;
            if (!imagen || typeof imagen !== 'string') return null;
            if (imagen.startsWith('http')) return imagen;
            if (imagen.startsWith('data:image')) return imagen;
            if (imagen.length < 100) return null;
            const base64Regex = /^[A-Za-z0-9+/=]+$/;
            if (base64Regex.test(imagen.substring(0, 100))) {
                return `data:image/jpeg;base64,${imagen}`;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        cargarTransferenciasDenegadas();
    }, []);

    const cargarTransferenciasDenegadas = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔍 Cargando transferencias denegadas...');
            
            const response = await api.get('/transferencias/estado/DENEGADA');
            
            let datos = [];
            if (Array.isArray(response.data)) {
                datos = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                datos = response.data.data;
            } else if (response.data?.transferencias && Array.isArray(response.data.transferencias)) {
                datos = response.data.transferencias;
            }
            
            const itemsSeguros = datos.map(item => {
                const imagenValida = validarImagen(item);
                return {
                    _id: item._id || Math.random().toString(),
                    nombreUsuario: item.nombreUsuario || 'Sin nombre',
                    codigoIdentificador: item.codigoIdentificador || 'N/A',
                    numeroDocumento: item.numeroDocumento || 'N/A',
                    valor: typeof item.valor === 'number' ? item.valor : 0,
                    estado: item.estado || 'DENEGADA',
                    responsable: item.responsable || 'N/A',
                    fechaTransferencia: item.fechaTransferencia || null,
                    zonaSector: item.zonaSector || 'N/A',
                    barrio: item.barrio || 'N/A',
                    bancoCuenta: item.bancoCuenta || 'N/A',
                    imagenComprobante: imagenValida,
                    tieneImagen: imagenValida !== null,
                    notaDenegacion: item.notaDenegacion || 'Sin nota',
                    denegadoPor: item.denegadoPor || 'N/A',
                    fechaDenegacion: item.fechaDenegacion || null,
                };
            });
            
            setTransferencias(itemsSeguros);
            setTransferenciasFiltradas(itemsSeguros);
            console.log('✅ Cargadas denegadas:', itemsSeguros.length);
            
        } catch (error) {
            console.error('❌ Error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        cargarTransferenciasDenegadas();
    };

    useEffect(() => {
        if (!transferencias || transferencias.length === 0) {
            setTransferenciasFiltradas([]);
            return;
        }
        let filtradas = [...transferencias];
        if (searchText.trim() !== '') {
            const texto = searchText.trim().toLowerCase();
            filtradas = filtradas.filter(t => {
                return (
                    (t.nombreUsuario || '').toLowerCase().includes(texto) ||
                    (t.codigoIdentificador || '').toLowerCase().includes(texto) ||
                    (t.numeroDocumento || '').toLowerCase().includes(texto) ||
                    (t.notaDenegacion || '').toLowerCase().includes(texto)
                );
            });
        }
        setTransferenciasFiltradas(filtradas);
    }, [searchText, transferencias]);

    const getEstadoColor = (estado) => {
        const colors = {
            'SUBIDA': '#FDCB6E',
            'CONFIRMADA': '#00B894',
            'DENEGADA': '#FF6B6B',
            'INGRESADA': '#0984E3',
            'EN_REVISION': '#E17055',
        };
        return colors[estado] || '#636E72';
    };

    const formatFecha = (fecha) => {
        try {
            if (!fecha) return 'Sin fecha';
            const d = new Date(fecha);
            if (isNaN(d.getTime())) return 'Fecha inválida';
            return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return 'Fecha inválida'; }
    };

    const formatValor = (valor) => {
        try {
            if (valor === undefined || valor === null) return '$0.00';
            return `$${Number(valor).toFixed(2)}`;
        } catch (e) { return '$0.00'; }
    };

    const abrirFotoAmpliada = (imagen) => {
        if (imagen) {
            setFotoAmpliada(imagen);
            setModalFotoVisible(true);
        }
    };

    const abrirDetalle = (item) => {
        setTransferenciaSeleccionada(item);
        setModalVisible(true);
    };

    const renderImagen = (item) => {
        if (!item || !item.tieneImagen || !item.imagenComprobante) return null;
        return (
            <TouchableOpacity 
                style={styles.imagenContainer}
                onPress={() => {
                    const img = item.imagenComprobante;
                    if (img) abrirFotoAmpliada(img);
                }}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.imagenComprobante }}
                    style={styles.imagenMiniatura}
                    resizeMode="cover"
                    resizeMethod="resize"
                    fadeDuration={0}
                    onError={() => console.log('⚠️ Error cargando imagen')}
                />
                <View style={styles.imagenBadge}>
                    <Text style={styles.imagenBadgeText}>📷 Tocar para ampliar</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text style={styles.loadingText}>Cargando transferencias denegadas...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={cargarTransferenciasDenegadas}>
                    <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>❌ Transferencias Denegadas</Text>
                    <Text style={styles.subtitle}>
                        {transferenciasFiltradas.length} transferencia{transferenciasFiltradas.length !== 1 ? 's' : ''} denegada{transferenciasFiltradas.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nombre, código, documento o nota..."
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholderTextColor="#B2BEC3"
                    />
                    {searchText !== '' && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView 
                style={styles.listaContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {transferenciasFiltradas.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>✅</Text>
                        <Text style={styles.emptyText}>
                            {searchText !== '' ? 'No hay coincidencias' : 'No hay transferencias denegadas'}
                        </Text>
                        <Text style={styles.emptySubtext}>
                            Las transferencias denegadas aparecerán aquí
                        </Text>
                    </View>
                ) : (
                    transferenciasFiltradas.map((item) => (
                        <TouchableOpacity 
                            key={item._id} 
                            style={styles.transferenciaCard}
                            onPress={() => abrirDetalle(item)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.transferenciaHeader}>
                                <Text style={styles.transferenciaCodigo}>{item.codigoIdentificador || 'N/A'}</Text>
                                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
                                    <Text style={styles.estadoBadgeText}>DENEGADA</Text>
                                </View>
                            </View>

                            <Text style={styles.transferenciaNombre}>{item.nombreUsuario || 'Sin nombre'}</Text>
                            <Text style={styles.transferenciaDocumento}>📄 Documento: {item.numeroDocumento || 'N/A'}</Text>

                            <View style={styles.transferenciaFooter}>
                                <Text style={styles.transferenciaInfo}>💰 {formatValor(item.valor)}</Text>
                                <Text style={styles.transferenciaInfo}>📅 {formatFecha(item.fechaTransferencia)}</Text>
                            </View>

                            {/* 📝 Nota de denegación */}
                            <View style={styles.notaContainer}>
                                <Text style={styles.notaLabel}>📝 Motivo de denegación:</Text>
                                <Text style={styles.notaText} numberOfLines={2}>
                                    {item.notaDenegacion || 'Sin nota'}
                                </Text>
                            </View>

                            {renderImagen(item)}

                            <View style={styles.footerCard}>
                                <Text style={styles.footerCardText}>
                                    Denegado: {formatFecha(item.fechaDenegacion)}
                                </Text>
                                <Text style={styles.footerCardText}>
                                    Por: {item.denegadoPor || 'N/A'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={styles.footerSpacer} />
            </ScrollView>

            {/* MODAL DE DETALLE */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📋 Detalle de Transferencia Denegada</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {transferenciaSeleccionada && (
                            <View>
                                <Text style={styles.modalLabel}>Código:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.codigoIdentificador || 'N/A'}</Text>

                                <Text style={styles.modalLabel}>Nombre:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.nombreUsuario || 'Sin nombre'}</Text>

                                <Text style={styles.modalLabel}>Documento:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.numeroDocumento || 'N/A'}</Text>

                                <Text style={styles.modalLabel}>Valor:</Text>
                                <Text style={styles.modalValue}>{formatValor(transferenciaSeleccionada.valor)}</Text>

                                <Text style={styles.modalLabel}>Zona:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.zonaSector || 'N/A'} - {transferenciaSeleccionada.barrio || 'N/A'}</Text>

                                <Text style={styles.modalLabel}>Banco:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.bancoCuenta || 'N/A'}</Text>

                                <Text style={styles.modalLabel}>Fecha de transferencia:</Text>
                                <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaTransferencia)}</Text>

                                <Text style={styles.modalLabel}>Responsable:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.responsable || 'N/A'}</Text>

                                {/* 📝 Nota de denegación destacada */}
                                <View style={styles.modalNotaContainer}>
                                    <Text style={styles.modalNotaLabel}>📝 Motivo de denegación:</Text>
                                    <Text style={styles.modalNotaText}>
                                        {transferenciaSeleccionada.notaDenegacion || 'Sin nota'}
                                    </Text>
                                </View>

                                <Text style={styles.modalLabel}>Denegado por:</Text>
                                <Text style={styles.modalValue}>{transferenciaSeleccionada.denegadoPor || 'N/A'}</Text>

                                <Text style={styles.modalLabel}>Fecha de denegación:</Text>
                                <Text style={styles.modalValue}>{formatFecha(transferenciaSeleccionada.fechaDenegacion)}</Text>

                                <Text style={styles.modalLabel}>Estado:</Text>
                                <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(transferenciaSeleccionada.estado), alignSelf: 'flex-start' }]}>
                                    <Text style={styles.estadoBadgeText}>DENEGADA</Text>
                                </View>

                                {transferenciaSeleccionada.tieneImagen && transferenciaSeleccionada.imagenComprobante && (
                                    <View style={styles.modalImagenContainer}>
                                        <Text style={styles.modalLabel}>📷 Comprobante:</Text>
                                        <TouchableOpacity onPress={() => {
                                            if (transferenciaSeleccionada.imagenComprobante) {
                                                abrirFotoAmpliada(transferenciaSeleccionada.imagenComprobante);
                                            }
                                        }}>
                                            <Image
                                                source={{ uri: transferenciaSeleccionada.imagenComprobante }}
                                                style={styles.modalImagen}
                                                resizeMode="contain"
                                                resizeMethod="resize"
                                                fadeDuration={0}
                                                onError={() => console.log('⚠️ Error en imagen modal')}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity 
                                    style={styles.modalCerrarBtn} 
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCerrarBtnText}>Cerrar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* MODAL DE FOTO AMPLIADA */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalFotoVisible}
                onRequestClose={() => setModalFotoVisible(false)}
            >
                <View style={styles.fotoModalOverlay}>
                    <TouchableOpacity 
                        style={styles.fotoModalClose}
                        onPress={() => setModalFotoVisible(false)}
                    >
                        <Text style={styles.fotoModalCloseText}>✕ Cerrar</Text>
                    </TouchableOpacity>
                    {fotoAmpliada && (
                        <Image
                            source={{ uri: fotoAmpliada }}
                            style={styles.fotoAmpliada}
                            resizeMode="contain"
                            resizeMethod="resize"
                            fadeDuration={0}
                            onError={() => console.log('⚠️ Error en foto ampliada')}
                        />
                    )}
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
        paddingTop: 40,
        backgroundColor: '#FF6B6B',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerCenter: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    searchContainer: {
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#2D3436',
        paddingVertical: 4,
    },
    clearIcon: {
        fontSize: 18,
        color: '#FF6B6B',
        fontWeight: 'bold',
        paddingHorizontal: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        color: '#636E72',
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 15,
    },
    errorText: {
        fontSize: 16,
        color: '#FF6B6B',
        textAlign: 'center',
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: '#FF6B6B',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listaContainer: {
        flex: 1,
        padding: 15,
    },
    transferenciaCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B6B',
    },
    transferenciaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    transferenciaCodigo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    transferenciaNombre: {
        fontSize: 16,
        color: '#2D3436',
        marginBottom: 4,
        fontWeight: '500',
    },
    transferenciaDocumento: {
        fontSize: 14,
        color: '#636E72',
        marginBottom: 6,
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
    transferenciaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    transferenciaInfo: {
        fontSize: 13,
        color: '#636E72',
        marginTop: 2,
    },
    notaContainer: {
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        padding: 10,
        marginTop: 6,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#FF6B6B',
    },
    notaLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF6B6B',
        marginBottom: 4,
    },
    notaText: {
        fontSize: 14,
        color: '#2D3436',
        lineHeight: 20,
    },
    footerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    footerCardText: {
        fontSize: 12,
        color: '#636E72',
    },
    imagenContainer: {
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
        position: 'relative',
    },
    imagenMiniatura: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
    },
    imagenBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imagenBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#636E72',
        marginTop: 8,
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
        width: '95%',
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#636E72',
        fontWeight: 'bold',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#636E72',
        marginTop: 8,
    },
    modalValue: {
        fontSize: 16,
        color: '#2D3436',
        marginBottom: 4,
    },
    modalNotaContainer: {
        backgroundColor: '#FFF5F5',
        borderRadius: 10,
        padding: 14,
        marginTop: 10,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B6B',
    },
    modalNotaLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginBottom: 6,
    },
    modalNotaText: {
        fontSize: 15,
        color: '#2D3436',
        lineHeight: 22,
    },
    modalImagenContainer: {
        marginTop: 10,
    },
    modalImagen: {
        width: '100%',
        height: 350,
        borderRadius: 10,
        backgroundColor: '#F0F0F0',
        marginTop: 4,
    },
    modalCerrarBtn: {
        marginTop: 15,
        padding: 14,
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalCerrarBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    fotoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fotoModalClose: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fotoModalCloseText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    fotoAmpliada: {
        width: '100%',
        height: '80%',
    },
});

export default TransferenciasDenegadas;