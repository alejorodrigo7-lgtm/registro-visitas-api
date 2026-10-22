const Desconexion = require('../models/Desconexion');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const { enviarNotificacionPush } = require('../services/pushService');
// 📧 DESHABILITADO (re-activar si se necesita enviar correos)
// const emailService = require('../services/emailService');

// ============================================
// HELPER: crear notificacion en campana para TODOS los usuarios activos
// ============================================
const crearCampanaParaTodos = async ({ titulo, mensaje, tipo, datos }) => {
  try {
    const todosLosUsuarios = await User.find({ activo: true });
    console.log('Creando campana (' + tipo + ') para ' + todosLosUsuarios.length + ' usuarios');
    for (const usuarioNotif of todosLosUsuarios) {
      try {
        await Notificacion.create({
          titulo,
          mensaje,
          tipo,
          usuario: usuarioNotif._id,
          datos,
        });
      } catch (err) {
        console.error('Error creando campana para ' + usuarioNotif.email + ':', err.message);
      }
    }
  } catch (error) {
    console.error('Error creando campana masiva:', error.message);
  }
};

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

    const tipoTexto = tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const tipoEnum = tipo === 'DESCONEXION' ? 'DESCONEXION' : 'RECONEXION';
    const mensajePush = `📋 Nueva solicitud de ${tipoTexto} del cliente ${cliente}`;

    // 🔔 PUSH a Admin/Jefe
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
        console.log(`✅ Push enviado a ${usuario.email}`);
      } catch (error) {
        console.error(`❌ Error enviando push a ${usuario.email}:`, error);
      }
    }

    // 🔔 PUSH al creador (si no es Admin/Jefe)
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
        console.log(`✅ Push enviado al creador ${req.user.email}`);
      } catch (error) {
        console.error(`❌ Error enviando push al creador:`, error);
      }
    }

    // 🔔 CAMPANA a TODOS los usuarios activos
    await crearCampanaParaTodos({
      titulo: tipo === 'DESCONEXION' ? '🔌 Nueva Solicitud de Desconexión' : '🔄 Nueva Solicitud de Reconexión',
      mensaje: `${req.user.nombre} solicitó ${tipoTexto} para ${cliente}`,
      tipo: tipoEnum,
      datos: {
        solicitudId: solicitud._id,
        cliente,
        codigoCliente: codigoCliente || '',
        tipoSolicitud: tipo,
        estado: 'PENDIENTE',
        solicitadoPor: req.user.nombre,
        screen: 'DesconexionesMenu',
      },
    });

    // 📧 ============================================================
    // 📧 EMAIL DESHABILITADO TEMPORALMENTE (re-activar si se necesita)
    // 📧 Para reactivar: descomentar el require arriba y este bloque.
    // 📧 ============================================================
    /*
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
      console.error(`❌ Error al enviar correo electrónico para solicitud ${solicitud._id}:`, error.message);
    }
    */

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

    // Obtener solicitud con datos del usuario creador
    const solicitud = await Desconexion.findById(id)
      .populate('usuario', 'nombre email');

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

    // Obtener datos del ejecutor
    const ejecutor = await User.findById(req.user._id);

    solicitud.estado = 'EJECUTADO';
    solicitud.ejecutadoPor = req.user._id;
    solicitud.ejecutadoPorNombre = req.user.nombre;
    solicitud.observacionEjecucion = observacion || 'Ejecutado por ' + req.user.nombre;
    solicitud.updatedAt = new Date();

    await solicitud.save();

    const tipoTexto = solicitud.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const tipoEnum = solicitud.tipo === 'DESCONEXION' ? 'DESCONEXION' : 'RECONEXION';
    const mensajePush = `✅ Solicitud de ${tipoTexto} de ${solicitud.cliente} fue EJECUTADA por ${req.user.nombre}`;

    // 🔔 PUSH al solicitante
    try {
      await enviarNotificacionPush(solicitud.usuario._id || solicitud.usuario, {
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
      console.log(`✅ Push enviado al creador ${solicitud.usuarioNombre}`);
    } catch (error) {
      console.error(`❌ Error enviando push al creador:`, error);
    }

    // 🔔 PUSH a Admin/Jefe (excepto el ejecutor)
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
        console.error(`❌ Error enviando push a ${usuario.email}:`, error);
      }
    }

    // 🔔 CAMPANA a TODOS los usuarios activos
    await crearCampanaParaTodos({
      titulo: '✅ Solicitud Ejecutada',
      mensaje: `${tipoTexto} de ${solicitud.cliente} ejecutada por ${req.user.nombre}`,
      tipo: tipoEnum,
      datos: {
        solicitudId: solicitud._id,
        cliente: solicitud.cliente,
        codigoCliente: solicitud.codigoCliente || '',
        tipoSolicitud: solicitud.tipo,
        estado: 'EJECUTADO',
        ejecutadoPor: req.user.nombre,
        screen: 'DesconexionesMenu',
      },
    });

    // 📧 ============================================================
    // 📧 EMAILS DESHABILITADOS TEMPORALMENTE (re-activar si se necesita)
    // 📧 Para reactivar: descomentar el require arriba y estos bloques.
    // 📧 ============================================================
    /*
    // CORREO 1: AL ADMIN
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

    // CORREO 2: AL USUARIO QUE SOLICITÓ
    try {
      const usuarioSolicitante = solicitud.usuario;
      if (usuarioSolicitante && usuarioSolicitante.email) {
        console.log(`📧 Enviando correo de notificación al solicitante: ${usuarioSolicitante.email}`);

        if (solicitud.tipo === 'DESCONEXION') {
          await emailService.enviarNotificacionDesconexionEjecutada(
            {
              cliente: solicitud.cliente,
              direccion: solicitud.direccion || 'N/A',
              telefono: solicitud.telefono || 'N/A',
              observaciones: solicitud.observacionEjecucion || 'Sin observaciones'
            },
            ejecutor,
            usuarioSolicitante
          );
        } else {
          await emailService.enviarNotificacionReconexionEjecutada(
            {
              cliente: solicitud.cliente,
              direccion: solicitud.direccion || 'N/A',
              telefono: solicitud.telefono || 'N/A',
              observaciones: solicitud.observacionEjecucion || 'Sin observaciones'
            },
            ejecutor,
            usuarioSolicitante
          );
        }
        console.log(`✅ Correo de notificación enviado al solicitante: ${usuarioSolicitante.email}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando correo al solicitante:`, error.message);
    }
    */

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

    const tipoTexto = solicitud.tipo === 'DESCONEXION' ? '🔌 Desconexión' : '🔄 Reconexión';
    const tipoEnum = solicitud.tipo === 'DESCONEXION' ? 'DESCONEXION' : 'RECONEXION';
    const mensajePush = `❌ Solicitud de ${tipoTexto} de ${solicitud.cliente} fue RECHAZADA por ${req.user.nombre}`;

    // 🔔 PUSH al solicitante
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
      console.log(`✅ Push enviado al creador ${solicitud.usuarioNombre}`);
    } catch (error) {
      console.error(`❌ Error enviando push al creador:`, error);
    }

    // 🔔 PUSH a Admin/Jefe (excepto el que rechaza)
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
        console.error(`❌ Error enviando push a ${usuario.email}:`, error);
      }
    }

    // 🔔 CAMPANA a TODOS los usuarios activos
    await crearCampanaParaTodos({
      titulo: '❌ Solicitud Rechazada',
      mensaje: `${tipoTexto} de ${solicitud.cliente} rechazada por ${req.user.nombre}`,
      tipo: tipoEnum,
      datos: {
        solicitudId: solicitud._id,
        cliente: solicitud.cliente,
        codigoCliente: solicitud.codigoCliente || '',
        tipoSolicitud: solicitud.tipo,
        estado: 'RECHAZADO',
        rechazadoPor: req.user.nombre,
        screen: 'DesconexionesMenu',
      },
    });

    // 📧 ============================================================
    // 📧 EMAIL DESHABILITADO TEMPORALMENTE (re-activar si se necesita)
    // 📧 Para reactivar: descomentar el require arriba y este bloque.
    // 📧 ============================================================
    /*
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
    */

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