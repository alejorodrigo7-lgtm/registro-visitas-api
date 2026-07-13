const Transferencia = require('../models/Transferencia');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');

// ============================================
// 📲 ENVIAR NOTIFICACIÓN DE TRANSFERENCIA
// ============================================
const enviarNotificacionTransferencia = async (usuarioId, titulo, mensaje, data = {}) => {
  try {
    // Guardar en base de datos
    await Notificacion.create({
      titulo,
      mensaje,
      tipo: 'transferencia',
      usuario: usuarioId,
      datos: data,
    });

    // Enviar push
    try {
      await pushService.enviarNotificacionPush(usuarioId, {
        title: titulo,
        body: mensaje,
        data: { ...data, tipo: 'transferencia' },
      });
    } catch (pushError) {
      console.error('Error al enviar push de transferencia:', pushError);
    }

    console.log(`📲 Notificación de transferencia enviada a usuario ${usuarioId}`);
  } catch (error) {
    console.error('Error en enviarNotificacionTransferencia:', error);
  }
};

// ============================================
// 📤 SUBIR TRANSFERENCIA
// ============================================
exports.subirTransferencia = async (req, res) => {
  console.log('📤 1. subirTransferencia - Inicio');
  console.log('📤 2. Body recibido:', req.body);
  console.log('📤 3. Usuario:', req.user?.email);

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
      console.log('❌ 4. Error: Campos faltantes');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      console.log('❌ 5. Error: Usuario responsable no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

    console.log('📤 6. Creando transferencia...');
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
    console.log('✅ 7. Transferencia creada con ID:', transferencia._id);

    // ✅ Notificar a Admin y Jefes sobre nueva transferencia
    console.log('📲 8. Enviando notificaciones a Admin y Jefes...');
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
    console.log(`✅ 9. Notificaciones enviadas a ${adminsJefes.length} administradores/jefes`);

    res.status(201).json({
      success: true,
      message: 'Transferencia subida correctamente',
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ 10. Error en subirTransferencia:', error);
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
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
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
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ✅ CONFIRMAR TRANSFERENCIA
// ============================================
exports.confirmarTransferencia = async (req, res) => {
  console.log('✅ 1. confirmarTransferencia - Inicio');
  console.log('✅ 2. ID:', req.params.id);
  console.log('✅ 3. Estado:', req.body.estado);

  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['CONFIRMADA', 'DENEGADA'].includes(estado)) {
      console.log('❌ 4. Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser CONFIRMADA o DENEGADA',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ 5. Error: Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'SUBIDA') {
      console.log(`❌ 6. Error: La transferencia ya está en estado ${transferencia.estado}`);
      return res.status(400).json({
        success: false,
        message: `La transferencia ya está en estado ${transferencia.estado}`,
      });
    }

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ 7. Transferencia ${estado}`);

    // ✅ Notificar al usuario que subió la transferencia
    console.log('📲 8. Enviando notificación al usuario que subió...');
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
    console.log('✅ 9. Notificación enviada');

    res.json({
      success: true,
      message: `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ 10. Error en confirmarTransferencia:', error);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 💰 INGRESAR TRANSFERENCIA
// ============================================
exports.ingresarTransferencia = async (req, res) => {
  console.log('💰 1. ingresarTransferencia - Inicio');
  console.log('💰 2. ID:', req.params.id);
  console.log('💰 3. Estado:', req.body.estado);

  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['INGRESADA', 'EN_REVISION'].includes(estado)) {
      console.log('❌ 4. Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser INGRESADA o EN_REVISION',
      });
    }

    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ 5. Error: Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    if (transferencia.estado !== 'CONFIRMADA') {
      console.log(`❌ 6. Error: La transferencia debe estar CONFIRMADA. Estado actual: ${transferencia.estado}`);
      return res.status(400).json({
        success: false,
        message: `La transferencia debe estar CONFIRMADA. Estado actual: ${transferencia.estado}`,
      });
    }

    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ 7. Transferencia ${estado}`);

    // ✅ Notificar al usuario que subió la transferencia
    console.log('📲 8. Enviando notificación al usuario que subió...');
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
    console.log('✅ 9. Notificación enviada');

    res.json({
      success: true,
      message: `Transferencia ${estado === 'INGRESADA' ? 'ingresada' : 'en revisión'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ 10. Error en ingresarTransferencia:', error);
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
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER TRANSFERENCIAS POR ESTADO
// ============================================
exports.getTransferenciasByEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    
    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado',
      });
    }

    const estadosValidos = ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
      });
    }

    let query = { estado };
    
    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
    }

    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};