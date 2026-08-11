const Transferencia = require('../models/Transferencia');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');

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
// 📤 SUBIR TRANSFERENCIA
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

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      console.log('❌ Responsable no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

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
      imagenComprobante: imagenComprobante || null,
      estado: 'SUBIDA',
    });

    const adminsJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
    });

    for (const usuario of adminsJefes) {
      await enviarNotificacionTransferencia(
        usuario._id,
        '💰 Nueva Transferencia',
        `Nueva transferencia de ${nombreUsuario} por $${parseFloat(valor).toFixed(2)}`,
        {
          transferenciaId: transferencia._id,
          nombreUsuario,
          valor: parseFloat(valor),
          estado: 'SUBIDA',
        }
      );
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

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .limit(100);

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
// ✅ CONFIRMAR TRANSFERENCIA
// ============================================
exports.confirmarTransferencia = async (req, res) => {
  console.log('✅ confirmarTransferencia - INICIO');
  console.log(`✅ ID: ${req.params.id}`);
  console.log(`✅ Estado: ${req.body.estado}`);

  try {
    const { id } = req.params;
    const { estado } = req.body;

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

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ Transferencia ${estado}`);

    const titulo = estado === 'CONFIRMADA' ? '✅ Transferencia Confirmada' : '❌ Transferencia Denegada';
    const mensaje = estado === 'CONFIRMADA' 
      ? `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido confirmada`
      : `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido denegada`;

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
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

    const query = {
      $or: [
        { nombreUsuario: { $regex: search, $options: 'i' } },
        { codigoIdentificador: { $regex: search, $options: 'i' } },
      ],
    };

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .limit(100);

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
// 📋 OBTENER TRANSFERENCIAS POR ESTADO (OPTIMIZADO CON ÍNDICE)
// ============================================
exports.getTransferenciasByEstado = async (req, res) => {
  console.log('🔍 getTransferenciasByEstado - INICIO');
  
  try {
    const { estado } = req.params;
    console.log(`📊 Estado: ${estado}`);
    console.log(`📊 Usuario: ${req.user?.email}, Rol: ${req.user?.rol}`);

    // Validar estado
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

    // Construir query
    let query = { estado };
    
    if (req.user && ['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    console.log('📊 Usando índice createdAt_-1 para ordenar...');
    
    // 👇 USANDO EL ÍNDICE createdAt_-1
    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 }) // ✅ Usa el índice que ya tienes
      .limit(100); // 👈 Límite por seguridad

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