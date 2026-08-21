import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SubirTransferencia = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [soporteBase64, setSoporteBase64] = useState(null);

    // ========== Estado para búsqueda de clientes ==========
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [clientesEncontrados, setClientesEncontrados] = useState([]);
    const [mostrarResultadosBusqueda, setMostrarResultadosBusqueda] = useState(false);
    const [buscandoClientes, setBuscandoClientes] = useState(false);

    // ========== Estado para validación de documento ==========
    const [documentoValido, setDocumentoValido] = useState(null);
    const [validandoDocumento, setValidandoDocumento] = useState(false);
    const [mensajeDocumento, setMensajeDocumento] = useState('');

    const [formData, setFormData] = useState({
        responsable: user?.nombre || '',
        fechaTransferencia: new Date(),
        codigoIdentificador: '',
        nombreUsuario: '',
        numeroDocumento: '',
        valor: '',
        zonaSector: 'TOLA',
        barrio: '',
        bancoCuenta: '',
        soporte: null,
    });

    const zonasSector = ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'];

    const barriosPorZona = {
        'TOLA': ['TOLA 1', 'TOLA 2', 'EL DORADO', 'LOMA GRANDE'],
        'SAN JOSE DE CHILIBULO': ['SAN JOSE DE CHILIBULO'],
        'MAGDALENA': ['MAGDALENA', 'ATAHUALPA OCCIDENTAL', 'SANTA ANA'],
    };

    const bancosCuentas = [
        'Nº 4738408100 Banco Pichincha de Mary Luz Cordoba',
        'DE UNA PICHINCHA',
        'Nº 440777713 Banco Internacional de mary luz cordoba',
        'Nº 1062290134 Banco Pacifico de Mary Luz Cordoba',
        'Nº 0002883320 Banco Guayaquil de Mary Luz Córdoba',
        'Nº 12673124431 Produbanco de Isabela Cordoba',
        'Nº 10686771544 Banco Pacifico de Isabela Cordoba',
        'Nº 00027212641 Banco Guayaquil de Isabela Córdoba',
        'Nº 2213045031 Banco Pichincha de Mary Luz Cordoba',
        'WRIVERA',
    ];

    // Actualizar barrio cuando cambia la zona
    useEffect(() => {
        const barriosDisponibles = barriosPorZona[formData.zonaSector] || [];
        setFormData(prev => ({
            ...prev,
            barrio: barriosDisponibles[0] || '',
        }));
    }, [formData.zonaSector]);

    // ============================================
    // 🔍 BUSCAR CLIENTES POR CÓDIGO O NOMBRE
    // ============================================
    const buscarClientes = async () => {
        if (!busquedaCliente || busquedaCliente.length < 2) {
            Alert.alert('Advertencia', 'Ingresa al menos 2 caracteres para buscar');
            return;
        }

        setBuscandoClientes(true);
        setMostrarResultadosBusqueda(true);

        try {
            console.log('🔍 Buscando clientes con término:', busquedaCliente);
            const response = await api.get(`/clientes/buscar?termino=${encodeURIComponent(busquedaCliente)}`);
            console.log('📡 Respuesta:', response.data);

            if (response.data.success && response.data.data && response.data.data.length > 0) {
                setClientesEncontrados(response.data.data);
                console.log(`✅ ${response.data.data.length} clientes encontrados`);
            } else {
                setClientesEncontrados([]);
                Alert.alert('Sin resultados', 'No se encontraron clientes con ese término');
            }
        } catch (error) {
            console.error('❌ Error al buscar clientes:', error);
            Alert.alert('Error', error.response?.data?.message || 'Error al buscar clientes');
            setClientesEncontrados([]);
        } finally {
            setBuscandoClientes(false);
        }
    };

    // ============================================
    // 📝 SELECCIONAR CLIENTE DE RESULTADOS
    // ============================================
    const seleccionarCliente = (cliente) => {
        setFormData(prev => ({
            ...prev,
            codigoIdentificador: cliente.codigo || cliente.identificador || '',
            nombreUsuario: cliente.nombre || '',
            numeroDocumento: '',
        }));
        setBusquedaCliente(cliente.nombre || cliente.codigo || '');
        setMostrarResultadosBusqueda(false);
        setClientesEncontrados([]);
        setDocumentoValido(null);
        setMensajeDocumento('');
    };

    // ============================================
    // ✅ VALIDAR NÚMERO DE DOCUMENTO - CORREGIDO
    // ============================================
    const validarDocumento = async () => {
        const documento = formData.numeroDocumento.trim();

        if (!documento) {
            Alert.alert('Error', 'Ingresa un número de documento para validar');
            return;
        }

        if (documento.length < 5) {
            Alert.alert('Error', 'El número de documento debe tener al menos 5 dígitos');
            return;
        }

        setValidandoDocumento(true);

        try {
            console.log('✅ Validando documento:', documento);
            
            // 🔥 OBTENER TODAS LAS TRANSFERENCIAS y buscar manualmente
            const response = await api.get('/transferencias');
            console.log('📡 Transferencias obtenidas:', response.data?.length || 0);

            let documentoExiste = false;
            
            // Verificar si el response es un array
            if (Array.isArray(response.data) && response.data.length > 0) {
                documentoExiste = response.data.some(t => 
                    t.numeroDocumento && t.numeroDocumento.trim() === documento
                );
            }
            // Si el response tiene formato { success: true, data: [...] }
            else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                documentoExiste = response.data.data.some(t => 
                    t.numeroDocumento && t.numeroDocumento.trim() === documento
                );
            }

            console.log(`📋 Documento existe en transferencias: ${documentoExiste}`);

            if (documentoExiste) {
                setDocumentoValido(false);
                setMensajeDocumento('❌ Número ya registrado - No se puede subir transferencia');
                Alert.alert('Documento registrado', 'Este número de documento ya está registrado en el sistema. No puedes continuar.');
            } else {
                setDocumentoValido(true);
                setMensajeDocumento('✅ Documento válido - Puedes continuar');
            }
        } catch (error) {
            console.error('❌ Error al validar documento:', error);
            Alert.alert('Error', 'Error al validar el documento');
            setDocumentoValido(null);
        } finally {
            setValidandoDocumento(false);
        }
    };

    // ============================================
    // 📤 SUBIR IMAGEN A CLOUDINARY (NUEVO)
    // ============================================
    const subirImagenACloudinary = async (base64Image) => {
        try {
            setLoading(true);
            
            const response = await api.post('/upload/subir', {
                imagenBase64: base64Image,
                carpeta: 'transferencias'
            });

            if (response.data.success) {
                console.log('✅ Imagen subida a Cloudinary:', response.data.url);
                return response.data.url;
            }
            throw new Error('Error al subir imagen a Cloudinary');
        } catch (error) {
            console.error('❌ Error al subir imagen:', error);
            Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
            return null;
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // 📸 SOPORTE - TOMAR/SELECCIONAR FOTO
    // ============================================
    const tomarSoporte = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setFormData(prev => ({ ...prev, soporte: asset.uri }));
                setSoporteBase64(asset.base64);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo tomar la foto');
        }
    };

    const seleccionarSoporte = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setFormData(prev => ({ ...prev, soporte: asset.uri }));
                setSoporteBase64(asset.base64);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        }
    };

    // ============================================
    // 📤 SUBIR TRANSFERENCIA (MODIFICADO CON CLOUDINARY)
    // ============================================
    const handleSubmit = async () => {
        const camposObligatorios = [
            { key: 'codigoIdentificador', label: 'Código/Identificador' },
            { key: 'nombreUsuario', label: 'Nombre del Usuario' },
            { key: 'numeroDocumento', label: 'Número de Documento' },
            { key: 'valor', label: 'Valor' },
            { key: 'zonaSector', label: 'Zona/Sector' },
            { key: 'barrio', label: 'Barrio' },
            { key: 'bancoCuenta', label: 'Banco y Cuenta' },
        ];

        for (const campo of camposObligatorios) {
            if (!formData[campo.key] || formData[campo.key].trim() === '') {
                Alert.alert('Error', `El campo ${campo.label} es obligatorio`);
                return;
            }
        }

        if (documentoValido !== true) {
            Alert.alert('Error', 'Debes validar el número de documento primero. Presiona el botón "Validar Documento"');
            return;
        }

        if (!soporteBase64) {
            Alert.alert('Error', 'Debes subir un soporte de transferencia');
            return;
        }

        if (parseFloat(formData.valor) <= 0) {
            Alert.alert('Error', 'El valor debe ser mayor a 0');
            return;
        }

        // ============================================
        // 🔥 NUEVO: SUBIR IMAGEN A CLOUDINARY
        // ============================================
        let imagenUrl = null;
        if (soporteBase64) {
            imagenUrl = await subirImagenACloudinary(soporteBase64);
            if (!imagenUrl) {
                Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
                return;
            }
        } else {
            Alert.alert('Error', 'Debes subir un soporte de transferencia');
            return;
        }

        setLoading(true);
        try {
            const dataToSend = {
                fechaTransferencia: fechaSeleccionada.toISOString(),
                codigoIdentificador: formData.codigoIdentificador,
                nombreUsuario: formData.nombreUsuario,
                numeroDocumento: formData.numeroDocumento,
                valor: parseFloat(formData.valor),
                zonaSector: formData.zonaSector,
                barrio: formData.barrio,
                bancoCuenta: formData.bancoCuenta,
                soporte: 'Soporte adjunto',
                imagenComprobante: imagenUrl, // ← URL DE CLOUDINARY
            };

            console.log('📤 Enviando transferencia...');
            const response = await api.post('/transferencias/subir', dataToSend);
            console.log('✅ Transferencia subida:', response.data);

            Alert.alert(
                'Éxito',
                'Transferencia subida correctamente',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setFormData({
                                responsable: user?.nombre || '',
                                fechaTransferencia: new Date(),
                                codigoIdentificador: '',
                                nombreUsuario: '',
                                numeroDocumento: '',
                                valor: '',
                                zonaSector: 'TOLA',
                                barrio: '',
                                bancoCuenta: '',
                                soporte: null,
                            });
                            setSoporteBase64(null);
                            setDocumentoValido(null);
                            setMensajeDocumento('');
                            setBusquedaCliente('');
                            setClientesEncontrados([]);
                            navigation.goBack();
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('❌ Error al subir transferencia:', error);
            Alert.alert('Error', error.response?.data?.message || 'Error al subir la transferencia');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.title}>📤 Subir Transferencia</Text>

                <Text style={styles.label}>Responsable *</Text>
                <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.responsable}
                    editable={false}
                />

                <Text style={styles.label}>Fecha de Transferencia *</Text>
                <TouchableOpacity
                    style={styles.fechaButton}
                    onPress={() => setMostrarCalendario(true)}
                >
                    <Text style={styles.fechaButtonText}>
                        {fechaSeleccionada.toLocaleDateString('es-ES')}
                    </Text>
                </TouchableOpacity>

                {mostrarCalendario && (
                    <DateTimePicker
                        value={fechaSeleccionada}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setMostrarCalendario(false);
                            if (selectedDate) {
                                setFechaSeleccionada(selectedDate);
                                setFormData(prev => ({ ...prev, fechaTransferencia: selectedDate }));
                            }
                        }}
                    />
                )}

                {/* ========== BÚSQUEDA DE CLIENTES ========== */}
                <Text style={styles.label}>Buscar Cliente *</Text>
                <View style={styles.busquedaContainer}>
                    <TextInput
                        style={[styles.input, styles.busquedaInput]}
                        value={busquedaCliente}
                        onChangeText={(text) => {
                            setBusquedaCliente(text);
                            if (text.length === 0) {
                                setMostrarResultadosBusqueda(false);
                                setClientesEncontrados([]);
                            }
                        }}
                        placeholder="Buscar por código o nombre"
                    />
                    <TouchableOpacity
                        style={styles.buscarButton}
                        onPress={buscarClientes}
                        disabled={buscandoClientes}
                    >
                        <Text style={styles.buscarButtonText}>
                            {buscandoClientes ? '⏳' : '🔍'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Modal de resultados de búsqueda */}
                <Modal
                    visible={mostrarResultadosBusqueda}
                    transparent={true}
                    animationType="slide"
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Resultados de Búsqueda</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setMostrarResultadosBusqueda(false);
                                        setClientesEncontrados([]);
                                    }}
                                >
                                    <Text style={styles.modalClose}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {buscandoClientes ? (
                                <View style={styles.modalLoading}>
                                    <ActivityIndicator size="large" color="#6C5CE7" />
                                    <Text style={styles.modalLoadingText}>Buscando clientes...</Text>
                                </View>
                            ) : clientesEncontrados.length === 0 ? (
                                <View style={styles.modalEmpty}>
                                    <Text style={styles.modalEmptyText}>No se encontraron clientes</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={clientesEncontrados}
                                    keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.clienteItem}
                                            onPress={() => seleccionarCliente(item)}
                                        >
                                            <Text style={styles.clienteNombre}>{item.nombre}</Text>
                                            <Text style={styles.clienteDetalle}>
                                                Código: {item.codigo || item.identificador || 'N/A'} | 
                                                Dirección: {item.direccion || 'N/A'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                <Text style={styles.label}>Código/Identificador *</Text>
                <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.codigoIdentificador}
                    editable={false}
                    placeholder="Se autocompleta con la búsqueda"
                />

                <Text style={styles.label}>Nombre del Usuario *</Text>
                <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={formData.nombreUsuario}
                    editable={false}
                    placeholder="Se autocompleta con la búsqueda"
                />

                {/* ========== VALIDACIÓN DE DOCUMENTO ========== */}
                <Text style={styles.label}>Número de Documento *</Text>
                <View style={styles.documentoContainer}>
                    <TextInput
                        style={[styles.input, styles.documentoInput]}
                        value={formData.numeroDocumento}
                        onChangeText={(text) => {
                            const soloNumeros = text.replace(/[^0-9]/g, '');
                            setFormData(prev => ({ ...prev, numeroDocumento: soloNumeros }));
                            setDocumentoValido(null);
                            setMensajeDocumento('');
                        }}
                        placeholder="Solo números"
                        keyboardType="numeric"
                    />
                    <TouchableOpacity
                        style={[
                            styles.validarButton,
                            documentoValido === true && styles.validarButtonSuccess,
                            documentoValido === false && styles.validarButtonError,
                        ]}
                        onPress={validarDocumento}
                        disabled={validandoDocumento}
                    >
                        <Text style={styles.validarButtonText}>
                            {validandoDocumento ? '⏳' : '✓ Validar'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Mensaje de validación */}
                {mensajeDocumento ? (
                    <View style={[
                        styles.mensajeValidacion,
                        documentoValido === true ? styles.mensajeExito : styles.mensajeError
                    ]}>
                        <Text style={styles.mensajeValidacionText}>{mensajeDocumento}</Text>
                    </View>
                ) : null}

                <Text style={styles.label}>Valor (USD) *</Text>
                <TextInput
                    style={styles.input}
                    value={formData.valor}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, valor: text.replace(/[^0-9.]/g, '') }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Zona/Sector *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={formData.zonaSector}
                        onValueChange={(itemValue) =>
                            setFormData(prev => ({ ...prev, zonaSector: itemValue }))
                        }
                        style={styles.picker}
                    >
                        {zonasSector.map((zona) => (
                            <Picker.Item key={zona} label={zona} value={zona} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Barrio *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={formData.barrio}
                        onValueChange={(itemValue) =>
                            setFormData(prev => ({ ...prev, barrio: itemValue }))
                        }
                        style={styles.picker}
                        enabled={formData.zonaSector !== 'SAN JOSE DE CHILIBULO'}
                    >
                        {(barriosPorZona[formData.zonaSector] || []).map((barrio) => (
                            <Picker.Item key={barrio} label={barrio} value={barrio} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Banco y Cuenta *</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={formData.bancoCuenta}
                        onValueChange={(itemValue) =>
                            setFormData(prev => ({ ...prev, bancoCuenta: itemValue }))
                        }
                        style={styles.picker}
                    >
                        {bancosCuentas.map((banco) => (
                            <Picker.Item key={banco} label={banco} value={banco} />
                        ))}
                    </Picker>
                </View>

                <Text style={styles.label}>Soporte de Transferencia *</Text>
                <View style={styles.soporteContainer}>
                    <TouchableOpacity style={styles.soporteButton} onPress={tomarSoporte}>
                        <Text style={styles.soporteButtonText}>📷 Tomar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.soporteButton} onPress={seleccionarSoporte}>
                        <Text style={styles.soporteButtonText}>🖼️ Galería</Text>
                    </TouchableOpacity>
                </View>

                {formData.soporte && (
                    <View style={styles.soportePreviewContainer}>
                        <Image source={{ uri: formData.soporte }} style={styles.soportePreview} />
                        <TouchableOpacity
                            style={styles.eliminarSoporteButton}
                            onPress={() => {
                                setFormData(prev => ({ ...prev, soporte: null }));
                                setSoporteBase64(null);
                            }}
                        >
                            <Text style={styles.eliminarSoporteText}>✕ Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        documentoValido !== true && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={loading || documentoValido !== true}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>📤 Subir Transferencia</Text>
                    )}
                </TouchableOpacity>

                {documentoValido !== true && (
                    <Text style={styles.advertenciaTexto}>
                        ⚠️ Debes validar el número de documento para continuar
                    </Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    form: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2D3436',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#2D3436',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#DFE6E9',
        marginBottom: 15,
    },
    inputDisabled: {
        backgroundColor: '#F0F0F0',
        color: '#636E72',
    },
    fechaButton: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#DFE6E9',
        marginBottom: 15,
    },
    fechaButtonText: {
        fontSize: 16,
        color: '#2D3436',
    },
    pickerContainer: {
        backgroundColor: '#FFFFFF',
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

    // ========== ESTILOS DE BÚSQUEDA ==========
    busquedaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    busquedaInput: {
        flex: 1,
        marginBottom: 0,
    },
    buscarButton: {
        backgroundColor: '#6C5CE7',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        height: 50,
    },
    buscarButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },

    // ========== ESTILOS DEL MODAL ==========
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    modalClose: {
        fontSize: 24,
        color: '#636E72',
        fontWeight: 'bold',
    },
    modalLoading: {
        padding: 40,
        alignItems: 'center',
    },
    modalLoadingText: {
        marginTop: 10,
        color: '#636E72',
    },
    modalEmpty: {
        padding: 40,
        alignItems: 'center',
    },
    modalEmptyText: {
        color: '#636E72',
        fontSize: 16,
    },
    clienteItem: {
        padding: 15,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    clienteNombre: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3436',
    },
    clienteDetalle: {
        fontSize: 14,
        color: '#636E72',
        marginTop: 4,
    },
    separator: {
        height: 1,
        backgroundColor: '#DFE6E9',
    },

    // ========== ESTILOS DE VALIDACIÓN ==========
    documentoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    documentoInput: {
        flex: 1,
        marginBottom: 0,
    },
    validarButton: {
        backgroundColor: '#6C5CE7',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 50,
    },
    validarButtonSuccess: {
        backgroundColor: '#00B894',
    },
    validarButtonError: {
        backgroundColor: '#FF6B6B',
    },
    validarButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    mensajeValidacion: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    mensajeExito: {
        backgroundColor: '#D4EDDA',
        borderWidth: 1,
        borderColor: '#155724',
    },
    mensajeError: {
        backgroundColor: '#F8D7DA',
        borderWidth: 1,
        borderColor: '#721C24',
    },
    mensajeValidacionText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },

    // ========== ESTILOS DE SOPORTE ==========
    soporteContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    soporteButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#6C5CE7',
        alignItems: 'center',
    },
    soporteButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    soportePreviewContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    soportePreview: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        resizeMode: 'cover',
    },
    eliminarSoporteButton: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
    },
    eliminarSoporteText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },

    // ========== ESTILOS DEL BOTÓN SUBMIT ==========
    submitButton: {
        backgroundColor: '#6C5CE7',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    submitButtonDisabled: {
        backgroundColor: '#BDBDBD',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    advertenciaTexto: {
        color: '#E74C3C',
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default SubirTransferencia;