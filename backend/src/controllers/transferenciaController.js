const Transferencia = require('../models/Transferencia');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');

// ✅ SHARP PARA COMPRIMIR IMÁGENES
const sharp = require('sharp');

// ============================================
// 📸 COMPRIMIR IMAGEN (SOPORTA CLOUDINARY Y BASE64)
// ============================================
const comprimirImagen = async (imagen) => {
    try {
        // ✅ Si es URL de Cloudinary (empieza con http)
        if (imagen && imagen.startsWith('http')) {
            console.log('✅ Imagen es URL de Cloudinary, no se comprime');
            return imagen;
        }

        // ✅ Si es base64 con prefijo
        if (imagen && imagen.startsWith('data:image')) {
            let base64Data = imagen.split(',')[1];
            
            // Validar que sea base64 válido
            if (!/^[A-Za-z0-9+/=]+$/.test(base64Data.substring(0, 100))) {
                return imagen; // Devolver original si no es válido
            }

            // Comprimir con sharp
            const buffer = Buffer.from(base64Data, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60 })
                .toBuffer();

            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        }

        // ✅ Si es base64 sin prefijo
        if (imagen && imagen.length > 100) {
            // Validar que sea base64 válido
            if (!/^[A-Za-z0-9+/=]+$/.test(imagen.substring(0, 100))) {
                return `data:image/jpeg;base64,${imagen}`;
            }

            // Comprimir con sharp
            const buffer = Buffer.from(imagen, 'base64');
            const compressedBuffer = await sharp(buffer)
                .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 60 })
                .toBuffer();

            return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
        }

        // Si no hay imagen o es null
        console.log('⚠️ No hay imagen para comprimir');
        return imagen;
    } catch (error) {
        console.error('❌ Error comprimiendo imagen:', error.message);
        return imagen; // Devolver la imagen original si falla la compresión
    }
};

// ============================================
// 📲 ENVIAR NOTIFICACIÓN DE TRANSFERENCIA
// ============================================
const enviarNotificacionTransferencia = async (usuarioId, titulo, mensaje, data = {}) => {
  try {
    await Notificacion.create({
      titulo,
      mensaje,
      tipo: 'transferencia',
      usuario: usuarioId,
      datos: data,
    });

    try {
      await pushService.enviarNotificacionPush(usuarioId, {
        title: titulo,
        body: mensaje,
        data: { ...data, tipo: 'transferencia' },
      });
    } catch (pushError) {
      console.error('❌ Error al enviar push de transferencia:', pushError.message);
    }

    console.log(`✅ Notificación de transferencia enviada a usuario ${usuarioId}`);
  } catch (error) {
    console.error('❌ Error en enviarNotificacionTransferencia:', error.message);
  }
};

// ============================================
// 📤 SUBIR TRANSFERENCIA (CON COMPRESIÓN)
// ============================================
exports.subirTransferencia = async (req, res) => {
  console.log('📤 subirTransferencia - INICIO');
  console.log(`📤 Usuario: ${req.user?.email}`);

  try {
    const {
      fechaTransferencia,
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor,
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante,
    } = req.body;

    if (!fechaTransferencia || !codigoIdentificador || !nombreUsuario || 
        !numeroDocumento || !valor || !zonaSector || !barrio || 
        !bancoCuenta || !soporte) {
      console.log('❌ Error: Campos faltantes');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    // ✅ VALIDACIÓN: VERIFICAR DOCUMENTO DUPLICADO
    const documentoExistente = await Transferencia.findOne({ 
      numeroDocumento: numeroDocumento.trim() 
    });
    
    if (documentoExistente) {
      console.log(`❌ Documento duplicado: ${numeroDocumento}`);
      return res.status(400).json({
        success: false,
        message: `El número de documento ${numeroDocumento} ya está registrado en otra transferencia`,
        campo: 'numeroDocumento',
        transferenciaExistente: {
          id: documentoExistente._id,
          fecha: documentoExistente.fechaTransferencia,
          nombre: documentoExistente.nombreUsuario
        }
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      console.log('❌ Responsable no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

    // ✅ COMPRIMIR IMAGEN ANTES DE GUARDAR
    const imagenComprimida = await comprimirImagen(imagenComprobante);

    const transferencia = await Transferencia.create({
      responsable: responsable.nombre,
      responsableId: req.user._id,
      fechaTransferencia: new Date(fechaTransferencia),
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor: parseFloat(valor),
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante: imagenComprimida,
      estado: 'SUBIDA',
    });

    // 1. Crear notificacion en CAMPANA para TODOS los usuarios (incluyendo al que sube)
    const todosLosUsuarios = await User.find({
      activo: true,
    });

    console.log(`📢 Creando notificacion en campana para ${todosLosUsuarios.length} usuarios`);

    for (const usuario of todosLosUsuarios) {
      await Notificacion.create({
        titulo: '💰 Nueva Transferencia',
        mensaje: `${responsable.nombre} subio la transferencia de ${nombreUsuario} por $${parseFloat(valor).toFixed(2)}`,
        tipo: 'transferencia',
        usuario: usuario._id,
        datos: {
          transferenciaId: transferencia._id,
          nombreUsuario,
          valor: parseFloat(valor),
          estado: 'SUBIDA',
          tipo: 'NUEVA_TRANSFERENCIA',
          screen: 'RevisionTransferencias',
        },
      });
    }

    // 2. Enviar PUSH solo a otros usuarios (excepto al que sube)
    const usuariosConPush = await User.find({
      _id: { $ne: req.user._id },
      activo: true,
      expoPushToken: { $exists: true, $nin: [null, ''] },
    });

    console.log(`📲 Enviando push a ${usuariosConPush.length} usuarios`);

    for (const usuario of usuariosConPush) {
      try {
        await pushService.enviarNotificacionPush(usuario._id, {
          title: '💰 Nueva Transferencia',
          body: `${responsable.nombre} subio la transferencia de ${nombreUsuario} por $${parseFloat(valor).toFixed(2)}`,
          data: {
            transferenciaId: transferencia._id,
            nombreUsuario,
            valor: parseFloat(valor),
            estado: 'SUBIDA',
            tipo: 'NUEVA_TRANSFERENCIA',
            screen: 'RevisionTransferencias',
          },
        });
      } catch (pushError) {
        console.error(`❌ Error enviando push a ${usuario.email}:`, pushError.message);
      }
    }

    console.log(`✅ Transferencia creada: ${transferencia._id}`);
    res.status(201).json({
      success: true,
      message: 'Transferencia subida correctamente',
      data: transferencia,
    });
  } catch (error) {
    console.error('❌ Error en subirTransferencia:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER TODAS LAS TRANSFERENCIAS
// ============================================
exports.getTransferencias = async (req, res) => {
  try {
    const { estado } = req.query;
    let query = {};

    if (estado) {
      query.estado = estado;
    }

    // ✅ TODOS los roles ven TODAS las transferencias
    // (Sin filtro por responsableId)

    // ✅ Límite dinámico: CONFIRMADA/SUBIDA/EN_REVISION sin límite (pendientes),
    // INGRESADA/DENEGADA máximo 100 (ya son finales)
    const esEstadoPendiente = estado === 'CONFIRMADA' || estado === 'SUBIDA' || estado === 'EN_REVISION';
    const limite = esEstadoPendiente ? 1000 : 100;

    console.log(`📊 Límite aplicado: ${limite} (${esEstadoPendiente ? 'pendiente' : 'final'})`);

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .limit(limite);

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    console.error('❌ Error en getTransferencias:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER UNA TRANSFERENCIA
// ============================================
exports.getTransferencia = async (req, res) => {
  try {
    const { id } = req.params;
    const transferencia = await Transferencia.findById(id)
      .populate('responsableId', 'nombre email rol');

    if (!transferencia) {
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    res.json({
      success: true,
      data: transferencia,
    });
  } catch (error) {
    console.error('❌ Error en getTransferencia:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ✅ CONFIRMAR TRANSFERENCIA (CON NOTA DE DENEGACIÓN)
// ============================================
exports.confirmarTransferencia = async (req, res) => {
  console.log('✅ confirmarTransferencia - INICIO');
  console.log(`✅ ID: ${req.params.id}`);
  console.log(`✅ Estado: ${req.body.estado}`);
  console.log(`✅ Nota: ${req.body.notaDenegacion}`);

  try {
    const { id } = req.params;
    const { estado, notaDenegacion, imagenComprobante } = req.body;

    if (!['CONFIRMADA', 'DENEGADA'].includes(estado)) {
      console.log('❌ Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser CONFIRMADA o DENEGADA',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'SUBIDA') {
      console.log(`❌ Error: Estado actual ${transferencia.estado} no es SUBIDA`);
      return res.status(400).json({
        success: false,
        message: `La transferencia ya está en estado ${transferencia.estado}`,
      });
    }

    // ✅ VALIDACIÓN: VERIFICAR DOCUMENTO DUPLICADO AL CONFIRMAR
    if (estado === 'CONFIRMADA') {
      const documentoExistente = await Transferencia.findOne({
        numeroDocumento: transferencia.numeroDocumento,
        _id: { $ne: id },
        estado: { $in: ['CONFIRMADA', 'INGRESADA'] }
      });
      
      if (documentoExistente) {
        console.log(`❌ Documento duplicado al confirmar: ${transferencia.numeroDocumento}`);
        return res.status(400).json({
          success: false,
          message: `El número de documento ${transferencia.numeroDocumento} ya está confirmado en otra transferencia`,
          campo: 'numeroDocumento',
          transferenciaExistente: {
            id: documentoExistente._id,
            fecha: documentoExistente.fechaTransferencia,
            nombre: documentoExistente.nombreUsuario
          }
        });
      }
    }

    // ✅ ACTUALIZAR SEGÚN EL ESTADO
    if (estado === 'CONFIRMADA') {
      transferencia.estado = 'CONFIRMADA';
      transferencia.fechaConfirmacion = new Date();
      transferencia.confirmadoPor = req.user._id;
      console.log(`✅ Transferencia CONFIRMADA`);
    } else if (estado === 'DENEGADA') {
      transferencia.estado = 'DENEGADA';
      transferencia.notaDenegacion = notaDenegacion || 'Sin nota';
      transferencia.denegadoPor = req.user._id;
      transferencia.fechaDenegacion = new Date();
      
      if (imagenComprobante) {
        transferencia.imagenComprobante = imagenComprobante;
      }
      console.log(`✅ Transferencia DENEGADA - Nota: ${transferencia.notaDenegacion}`);
    }

    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ Transferencia guardada con estado ${transferencia.estado}`);

    // ✅ ENVIAR NOTIFICACIÓN AL RESPONSABLE
    const titulo = estado === 'CONFIRMADA' ? '✅ Transferencia Confirmada' : '❌ Transferencia Denegada';
    const mensaje = estado === 'CONFIRMADA' 
      ? `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido confirmada`
      : `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido denegada. Motivo: ${transferencia.notaDenegacion}`;

    await enviarNotificacionTransferencia(
      transferencia.responsableId,
      titulo,
      mensaje,
      {
        transferenciaId: transferencia._id,
        nombreUsuario: transferencia.nombreUsuario,
        valor: transferencia.valor,
        estado: transferencia.estado,
        notaDenegacion: transferencia.notaDenegacion,
      }
    );

    res.json({
      success: true,
      message: `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.error('❌ Error en confirmarTransferencia:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 💰 INGRESAR TRANSFERENCIA
// ============================================
exports.ingresarTransferencia = async (req, res) => {
  console.log('💰 ingresarTransferencia - INICIO');
  console.log(`💰 ID: ${req.params.id}`);
  console.log(`💰 Estado: ${req.body.estado}`);

  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['INGRESADA', 'EN_REVISION'].includes(estado)) {
      console.log('❌ Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser INGRESADA o EN_REVISION',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'CONFIRMADA') {
      console.log(`❌ Error: Estado actual ${transferencia.estado} no es CONFIRMADA`);
      return res.status(400).json({
        success: false,
        message: `La transferencia debe estar CONFIRMADA. Estado actual: ${transferencia.estado}`,
      });
    }

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ Transferencia ${estado}`);

    const titulo = estado === 'INGRESADA' ? '💰 Transferencia Ingresada' : '📋 Transferencia en Revisión';
    const mensaje = estado === 'INGRESADA'
      ? `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido ingresada`
      : `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} está en revisión`;

    await enviarNotificacionTransferencia(
      transferencia.responsableId,
      titulo,
      mensaje,
      {
        transferenciaId: transferencia._id,
        nombreUsuario: transferencia.nombreUsuario,
        valor: transferencia.valor,
        estado: transferencia.estado,
      }
    );

    res.json({
      success: true,
      message: `Transferencia ${estado === 'INGRESADA' ? 'ingresada' : 'en revisión'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.error('❌ Error en ingresarTransferencia:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 🔍 BUSCAR TRANSFERENCIAS PARA REVISIÓN
// ============================================
exports.buscarTransferenciasRevision = async (req, res) => {
  try {
    const { search, zona, estado, banco, fechaInicio, fechaFin } = req.query;

    // Construir query
    const query = {};

    // Busqueda por texto (nombre, codigo, documento)
    if (search && search.trim() !== '') {
      query.$or = [
        { nombreUsuario: { $regex: search, $options: 'i' } },
        { codigoIdentificador: { $regex: search, $options: 'i' } },
        { numeroDocumento: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtro por zona
    if (zona && zona !== 'TODAS') {
      query.zonaSector = zona;
    }

    // Filtro por estado
    if (estado && estado !== 'TODOS') {
      query.estado = estado;
    }

    // Filtro por banco
    if (banco && banco !== 'TODOS') {
      query.bancoCuenta = banco;
    }

    // Filtro por fecha
    if (fechaInicio || fechaFin) {
      query.fechaTransferencia = {};
      if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        inicio.setHours(0, 0, 0, 0);
        query.fechaTransferencia.$gte = inicio;
      }
      if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59, 999);
        query.fechaTransferencia.$lte = fin;
      }
    }

    // SIN LIMITE - buscar en TODA la base de datos
    console.log('🔍 Buscando transferencias:', JSON.stringify(query));

    const esEstadoPendiente = estado === 'CONFIRMADA' || estado === 'SUBIDA' || estado === 'EN_REVISION';
    const limite = esEstadoPendiente ? 1000 : 100;

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ fechaTransferencia: -1 })
      .lean();

    console.log(`✅ Encontradas: ${transferencias.length}`);

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    console.error('❌ Error en buscarTransferenciasRevision:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER TRANSFERENCIAS POR ESTADO
// ============================================
exports.getTransferenciasByEstado = async (req, res) => {
  console.log('🔍 getTransferenciasByEstado - INICIO');
  
  try {
    const { estado } = req.params;
    console.log(`📊 Estado: ${estado}`);
    console.log(`📊 Usuario: ${req.user?.email}, Rol: ${req.user?.rol}`);

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado'
      });
    }

    const estadosValidos = ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`
      });
    }

    let query = { estado };
    
    // ✅ TODOS los roles ven TODAS las transferencias
    // (Sin filtro por responsableId)

    console.log('📊 Usando índice createdAt_-1 para ordenar...');
    
    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .limit(limite);

    console.log(`✅ Encontradas: ${transferencias.length}`);
    
    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });

  } catch (error) {
    console.error('❌ Error en getTransferenciasByEstado:', error.message);
    console.error('📚 Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transferencias por estado',
      error: error.message
    });
  }
};

console.log('✅ Controlador de transferencias cargado correctamente');