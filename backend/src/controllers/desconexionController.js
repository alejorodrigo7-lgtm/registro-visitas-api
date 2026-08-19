const Desconexion = require('../models/Desconexion');
const User = require('../models/User');
const { enviarNotificacionPush } = require('../services/pushService');
const emailService = require('../services/emailService'); // ✅ Servicio de correo

// ============================================
// 📋 OBTENER TODAS LAS SOLICITUDES
// ============================================
exports.obtenerTodos = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.rol === 'Tecnico' || req.user.rol === 'Coordinador') {
      query.usuario = req.user._id;
    }
    
    const solicitudes = await Desconexion.find(query)
      .populate('usuario', 'nombre email')
      .populate('ejecutadoPor', 'nombre email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER SOLICITUDES PENDIENTES
// ============================================
exports.obtenerPendientes = async (req, res) => {
  try {
    const solicitudes = await Desconexion.find({ estado: 'PENDIENTE' })
      .populate('usuario', 'nombre email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 🔍 BUSCAR SOLICITUDES
// ============================================
exports.buscar = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }
    
    const searchRegex = new RegExp(q, 'i');
    const solicitudes = await Desconexion.find({
      $or: [
        { cliente: searchRegex },
        { codigoCliente: searchRegex },
        { observaciones: searchRegex },
      ]
    })
      .populate('usuario', 'nombre email')
      .populate('ejecutadoPor', 'nombre email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });
  } catch (error) {
    console.error('Error buscando solicitudes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📝 CREAR NUEVA SOLICITUD (CON NOTIFICACIÓN)
// ============================================
exports.crear = async (req, res) => {
  try {
    const { tipo, cliente, codigoCliente, fecha, observaciones } = req.body;
    
    if (!tipo || !cliente) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: tipo y cliente',
      });
    }
    
    const solicitud = new Desconexion({
      tipo,
      cliente,
      codigoCliente: codigoCliente || '',
      fecha: fecha || new Date(),
      observaciones: observaciones || '',
      estado: 'PENDIENTE',
      usuario: req.user._id,
      usuarioNombre: req.user.nombre,
    });
    
    await solicitud.save();

    // 🔔 ENVIAR NOTIFICACIÓN PUSH
    const tipoTexto = tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const mensajePush = `📋 Nueva solicitud de ${tipoTexto} del cliente ${cliente}`;
    
    const adminsJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      expoPushToken: { $ne: null }
    });

    for (const usuario of adminsJefes) {
      try {
        await enviarNotificacionPush(usuario._id, {
          title: '📋 Nueva Solicitud',
          body: mensajePush,
          data: {
            tipo: 'nueva_solicitud',
            solicitudId: solicitud._id.toString(),
            tipoSolicitud: tipo,
            cliente: cliente
          }
        });
        console.log(`✅ Notificación push enviada a ${usuario.email}`);
      } catch (error) {
        console.error(`❌ Error enviando notificación a ${usuario.email}:`, error);
      }
    }

    if (req.user.rol !== 'Admin' && req.user.rol !== 'Jefe') {
      try {
        await enviarNotificacionPush(req.user._id, {
          title: '✅ Solicitud Registrada',
          body: `✅ ${tipoTexto} de ${cliente} registrada correctamente. Esperando aprobación.`,
          data: {
            tipo: 'solicitud_registrada',
            solicitudId: solicitud._id.toString(),
            tipoSolicitud: tipo,
            cliente: cliente
          }
        });
        console.log(`✅ Notificación push enviada al creador ${req.user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando notificación al creador:`, error);
      }
    }

    // ✅ 📧 ENVIAR NOTIFICACIÓN POR CORREO (OAuth2) - MEJORADO
    try {
      console.log(`📧 Intentando enviar correo para solicitud ${solicitud._id}...`);
      await emailService.enviarNotificacionDesconexion({
        cliente: { 
          nombre: cliente, 
          codigo: codigoCliente || 'N/A' 
        },
        motivo: `${tipoTexto} solicitada`,
        observaciones: observaciones || 'Sin observaciones',
        usuario: {
          nombre: req.user.nombre,
          rol: req.user.rol
        },
        fecha: solicitud.fecha,
        tipo: tipo === 'DESCONEXION' ? 'desconexion' : 'reconexion'
      });
      console.log(`✅ Correo electrónico enviado exitosamente para solicitud ${solicitud._id}`);
    } catch (error) {
      // Solo logueamos el error, no interrumpimos el flujo
      console.error(`❌ Error al enviar correo electrónico para solicitud ${solicitud._id}:`, error.message);
      // No fallamos la solicitud si el correo falla
    }
    
    res.status(201).json({
      success: true,
      message: 'Solicitud creada correctamente',
      data: solicitud,
    });
  } catch (error) {
    console.error('Error creando solicitud:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ✅ EJECUTAR SOLICITUD (REALIZAR) CON NOTIFICACIÓN
// ============================================
exports.realizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacion } = req.body;
    
    const solicitud = await Desconexion.findById(id);
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
    }
    
    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `La solicitud ya está ${solicitud.estado.toLowerCase()}`,
      });
    }
    
    solicitud.estado = 'EJECUTADO';
    solicitud.ejecutadoPor = req.user._id;
    solicitud.ejecutadoPorNombre = req.user.nombre;
    solicitud.observacionEjecucion = observacion || 'Ejecutado por ' + req.user.nombre;
    solicitud.updatedAt = new Date();
    
    await solicitud.save();

    // 🔔 ENVIAR NOTIFICACIÓN PUSH
    const tipoTexto = solicitud.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const mensajePush = `✅ Solicitud de ${tipoTexto} de ${solicitud.cliente} fue EJECUTADA por ${req.user.nombre}`;
    
    try {
      await enviarNotificacionPush(solicitud.usuario, {
        title: '✅ Solicitud Ejecutada',
        body: mensajePush,
        data: {
          tipo: 'solicitud_ejecutada',
          solicitudId: solicitud._id.toString(),
          tipoSolicitud: solicitud.tipo,
          cliente: solicitud.cliente,
          ejecutadoPor: req.user.nombre
        }
      });
      console.log(`✅ Notificación push enviada al creador ${solicitud.usuarioNombre}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación al creador:`, error);
    }

    const adminsJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      expoPushToken: { $ne: null },
      _id: { $ne: req.user._id }
    });

    for (const usuario of adminsJefes) {
      try {
        await enviarNotificacionPush(usuario._id, {
          title: '✅ Solicitud Ejecutada',
          body: mensajePush,
          data: {
            tipo: 'solicitud_ejecutada',
            solicitudId: solicitud._id.toString(),
            tipoSolicitud: solicitud.tipo,
            cliente: solicitud.cliente,
            ejecutadoPor: req.user.nombre
          }
        });
      } catch (error) {
        console.error(`❌ Error enviando notificación a ${usuario.email}:`, error);
      }
    }

    // ✅ 📧 ENVIAR NOTIFICACIÓN POR CORREO DE EJECUCIÓN
    try {
      console.log(`📧 Intentando enviar correo de ejecución para solicitud ${solicitud._id}...`);
      await emailService.enviarNotificacionDesconexion({
        cliente: { 
          nombre: solicitud.cliente, 
          codigo: solicitud.codigoCliente || 'N/A' 
        },
        motivo: `${tipoTexto} EJECUTADA`,
        observaciones: solicitud.observacionEjecucion || 'Ejecutada exitosamente',
        usuario: {
          nombre: req.user.nombre,
          rol: req.user.rol
        },
        fecha: solicitud.updatedAt,
        tipo: solicitud.tipo === 'DESCONEXION' ? 'desconexion' : 'reconexion'
      });
      console.log(`✅ Correo electrónico de ejecución enviado para solicitud ${solicitud._id}`);
    } catch (error) {
      console.error(`❌ Error al enviar correo electrónico de ejecución para solicitud ${solicitud._id}:`, error.message);
    }

    res.json({
      success: true,
      message: 'Solicitud ejecutada correctamente',
      data: solicitud,
    });
  } catch (error) {
    console.error('Error ejecutando solicitud:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ❌ ANULAR SOLICITUD (RECHAZAR) CON NOTIFICACIÓN
// ============================================
exports.anular = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacion } = req.body;
    
    const solicitud = await Desconexion.findById(id);
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
    }
    
    if (solicitud.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `La solicitud ya está ${solicitud.estado.toLowerCase()}`,
      });
    }
    
    solicitud.estado = 'RECHAZADO';
    solicitud.ejecutadoPor = req.user._id;
    solicitud.ejecutadoPorNombre = req.user.nombre;
    solicitud.observacionEjecucion = observacion || 'Rechazado por ' + req.user.nombre;
    solicitud.updatedAt = new Date();
    
    await solicitud.save();

    // 🔔 ENVIAR NOTIFICACIÓN PUSH
    const tipoTexto = solicitud.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const mensajePush = `❌ Solicitud de ${tipoTexto} de ${solicitud.cliente} fue RECHAZADA por ${req.user.nombre}`;
    
    try {
      await enviarNotificacionPush(solicitud.usuario, {
        title: '❌ Solicitud Rechazada',
        body: mensajePush,
        data: {
          tipo: 'solicitud_rechazada',
          solicitudId: solicitud._id.toString(),
          tipoSolicitud: solicitud.tipo,
          cliente: solicitud.cliente,
          rechazadoPor: req.user.nombre
        }
      });
      console.log(`✅ Notificación push enviada al creador ${solicitud.usuarioNombre}`);
    } catch (error) {
      console.error(`❌ Error enviando notificación al creador:`, error);
    }

    const adminsJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      expoPushToken: { $ne: null },
      _id: { $ne: req.user._id }
    });

    for (const usuario of adminsJefes) {
      try {
        await enviarNotificacionPush(usuario._id, {
          title: '❌ Solicitud Rechazada',
          body: mensajePush,
          data: {
            tipo: 'solicitud_rechazada',
            solicitudId: solicitud._id.toString(),
            tipoSolicitud: solicitud.tipo,
            cliente: solicitud.cliente,
            rechazadoPor: req.user.nombre
          }
        });
      } catch (error) {
        console.error(`❌ Error enviando notificación a ${usuario.email}:`, error);
      }
    }

    // ✅ 📧 ENVIAR NOTIFICACIÓN POR CORREO DE RECHAZO
    try {
      console.log(`📧 Intentando enviar correo de rechazo para solicitud ${solicitud._id}...`);
      await emailService.enviarNotificacionDesconexion({
        cliente: { 
          nombre: solicitud.cliente, 
          codigo: solicitud.codigoCliente || 'N/A' 
        },
        motivo: `${tipoTexto} RECHAZADA`,
        observaciones: solicitud.observacionEjecucion || 'Rechazada por administrador',
        usuario: {
          nombre: req.user.nombre,
          rol: req.user.rol
        },
        fecha: solicitud.updatedAt,
        tipo: solicitud.tipo === 'DESCONEXION' ? 'desconexion' : 'reconexion'
      });
      console.log(`✅ Correo electrónico de rechazo enviado para solicitud ${solicitud._id}`);
    } catch (error) {
      console.error(`❌ Error al enviar correo electrónico de rechazo para solicitud ${solicitud._id}:`, error.message);
    }

    res.json({
      success: true,
      message: 'Solicitud rechazada correctamente',
      data: solicitud,
    });
  } catch (error) {
    console.error('Error rechazando solicitud:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};