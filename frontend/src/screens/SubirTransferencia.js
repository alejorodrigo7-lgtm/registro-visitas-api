// ============================================
// 📤 SUBIR TRANSFERENCIA
// ============================================
const handleSubmit = async () => {
  // Validar campos obligatorios
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

  if (!soporteBase64) {
    Alert.alert('Error', 'Debes subir un soporte de transferencia');
    return;
  }

  if (parseFloat(formData.valor) <= 0) {
    Alert.alert('Error', 'El valor debe ser mayor a 0');
    return;
  }

  setLoading(true);
  try {
    // 👈 CAMBIO IMPORTANTE AQUÍ
    const dataToSend = {
      fechaTransferencia: fechaSeleccionada.toISOString(),
      codigoIdentificador: formData.codigoIdentificador,
      nombreUsuario: formData.nombreUsuario,
      numeroDocumento: formData.numeroDocumento,
      valor: parseFloat(formData.valor),
      zonaSector: formData.zonaSector,
      barrio: formData.barrio,
      bancoCuenta: formData.bancoCuenta,
      soporte: 'Soporte adjunto',  // Campo de texto (requerido por el modelo)
      imagenComprobante: soporteBase64,  // 👈 La imagen en base64
    };

    console.log('📤 Enviando transferencia:', { ...dataToSend, imagenComprobante: 'BASE64_OMITIDO' });
    const response = await api.post('/transferencias/subir', dataToSend);
    console.log('✅ Transferencia subida:', response.data);

    Alert.alert(
      'Éxito',
      'Transferencia subida correctamente',
      [
        {
          text: 'OK',
          onPress: () => {
            // Resetear formulario
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