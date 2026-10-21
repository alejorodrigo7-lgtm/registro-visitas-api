const SolicitudRecibo = require('../models/SolicitudRecibo');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');
const User = require('../models/User');
const Cliente = require('../models/Cliente');

// ============================================
// HELPER: enviar notificacion de recibo (campana + push)
// ============================================
const enviarNotificacionRecibo = async (usuarioId, titulo, mensaje, data = {}, enviarPush = true) => {
  try {
    // 1. Guardar en campana
    await Notificacion.create({
      titulo,
      mensaje,
      tipo: 'RECIBO',
      usuario: usuarioId,
      datos: { ...data, tipo: 'RECIBO' },
    });

    // 2. Enviar push si corresponde
    if (enviarPush) {
      try {
        await pushService.enviarNotificacionPush(usuarioId, {
          title: titulo,
          body: mensaje,
          data: { ...data, tipo: 'RECIBO' },
        });
      } catch (pushError) {
        console.error('Error al enviar push de recibo:', pushError.message);
      }
    }

    console.log('Notificacion de recibo enviada a usuario ' + usuarioId);
  } catch (error) {
    console.error('Error en enviarNotificacionRecibo:', error.message);
  }
};

// Obtener todas las solicitudes
const getSolicitudes = async (req, res) => {
  try {
    const { estado, busqueda, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (estado) query.estado = estado;
    if (busqueda) {
      query.$or = [
        { 'cliente.nombre': { $regex: busqueda, $options: 'i' } },
        { 'cliente.codigo': { $regex: busqueda, $options: 'i' } }
      ];
    }

    // Si hay busqueda, buscar sin limite. Si no, paginar
    let solicitudes;
    if (busqueda && busqueda.trim() !== '') {
      solicitudes = await SolicitudRecibo.find(query)
        .sort({ fechaSolicitud: -1 });
      console.log('Busqueda sin limite: ' + busqueda + ' -> ' + solicitudes.length + ' resultados');
    } else {
      solicitudes = await SolicitudRecibo.find(query)
        .sort({ fechaSolicitud: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await SolicitudRecibo.countDocuments(query);

    res.json({
      success: true,
      data: solicitudes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error en getSolicitudes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
  }
};

// Crear nueva solicitud
const crearSolicitud = async (req, res) => {
  try {
    const { cliente, observaciones } = req.body;
    const usuarioId = req.user._id;

    if (!cliente || !cliente.nombre || !cliente.codigo) {
      return res.status(400).json({ success: false, message: 'Nombre y código del cliente son requeridos' });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const nuevaSolicitud = new SolicitudRecibo({
      cliente: {
        nombre: cliente.nombre,
        codigo: cliente.codigo,
        direccion: cliente.direccion || '',
        telefono: cliente.telefono || ''
      },
      observaciones: observaciones || '',
      solicitadoPor: {
        usuarioId: usuario._id,
        nombre: usuario.nombre
      }
    });

    await nuevaSolicitud.save();

    // ============================================
    // NOTIFICACIONES: campana a TODOS + push a Admin/Jefe/Coordinador
    // ============================================
    try {
      // 1. CAMPANA a TODOS los usuarios activos
      const todosLosUsuarios = await User.find({ activo: true });
      console.log('Creando notificacion de solicitud de recibo en campana para ' + todosLosUsuarios.length + ' usuarios');

      for (const usuarioNotif of todosLosUsuarios) {
        await Notificacion.create({
          titulo: '📄 Nueva Solicitud de Recibo',
          mensaje: usuario.nombre + ' solicito un recibo para ' + cliente.nombre,
          tipo: 'RECIBO',
          usuario: usuarioNotif._id,
          datos: {
            solicitudId: nuevaSolicitud._id,
            clienteNombre: cliente.nombre,
            clienteCodigo: cliente.codigo,
            solicitadoPor: usuario.nombre,
            estado: 'SOLICITADO',
            tipo: 'NUEVA_SOLICITUD_RECIBO',
            screen: 'SubirRecibo',
          },
        });
      }

      // 2. PUSH solo a Admin/Jefe/Coordinador (excepto al que crea)
      const usuariosConPush = await User.find({
        _id: { $ne: usuario._id },
        activo: true,
        rol: { $in: ['Admin', 'Jefe', 'Coordinador'] },
        expoPushToken: { $exists: true, $nin: [null, ''] },
      });

      console.log('Enviando push de solicitud de recibo a ' + usuariosConPush.length + ' usuarios (Admin/Jefe/Coordinador)');

      for (const usuarioPush of usuariosConPush) {
        try {
          await pushService.enviarNotificacionPush(usuarioPush._id, {
            title: '📄 Nueva Solicitud de Recibo',
            body: usuario.nombre + ' solicito un recibo para ' + cliente.nombre,
            data: {
              solicitudId: nuevaSolicitud._id,
              clienteNombre: cliente.nombre,
              estado: 'SOLICITADO',
              tipo: 'NUEVA_SOLICITUD_RECIBO',
              screen: 'SubirRecibo',
            },
          });
        } catch (pushError) {
          console.error('Error enviando push a ' + usuarioPush.email + ':', pushError.message);
        }
      }
    } catch (notifError) {
      console.error('Error enviando notificaciones de solicitud:', notifError.message);
    }
    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      data: nuevaSolicitud
    });
  } catch (error) {
    console.error('Error en crearSolicitud:', error);
    res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
  }
};

// ✅ APROBAR SOLICITUD CON MÚLTIPLES ARCHIVOS - CORREGIDO
const aprobarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { archivosNombre = [], archivosBase64 = [], archivosPublicId = [] } = req.body;
    const usuarioId = req.user._id;

    console.log('📤 ===== APROBANDO SOLICITUD =====');
    console.log('📤 Solicitud ID:', id);
    console.log(`📤 Archivos recibidos: ${archivosBase64?.length || 0}`);
    console.log(`📤 archivosBase64[0] length: ${archivosBase64?.[0]?.length || 0}`);

    // ✅ VERIFICAR QUE TENEMOS ARCHIVOS
    if (!archivosBase64 || archivosBase64.length === 0) {
      console.log('❌ No se recibieron archivos');
      return res.status(400).json({ 
        success: false, 
        message: 'No se recibieron archivos PDF para adjuntar' 
      });
    }

    // ✅ VALIDAR QUE LOS BASE64 NO ESTÉN VACÍOS
    const base64Validos = archivosBase64.filter(b64 => b64 && b64.length > 100);
    if (base64Validos.length === 0) {
      console.log('❌ Los archivos Base64 están vacíos o son inválidos');
      return res.status(400).json({ 
        success: false, 
        message: 'Los archivos no se cargaron correctamente. Intenta de nuevo.' 
      });
    }

    const solicitud = await SolicitudRecibo.findById(id);
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'SOLICITADO') {
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // ✅ LIMPIAR BASE64 - QUITAR PREFIJO SI EXISTE
    const archivosBase64Limpios = archivosBase64.map(b64 => {
      let clean = b64;
      if (clean && clean.includes(',')) {
        clean = clean.split(',')[1];
        console.log('🧹 Base64 limpiado en backend. Length:', clean.length);
      }
      return clean;
    });

    // ✅ VERIFICAR QUE EL BASE64 SEA VÁLIDO (debe empezar con %PDF o JVBER)
    const primerBase64 = archivosBase64Limpios[0] || '';
    const esPDF = primerBase64.startsWith('JVBER') || 
                  primerBase64.startsWith('%PDF') || 
                  primerBase64.substring(0, 10).includes('PDF');

    if (!esPDF) {
      console.log('⚠️ El archivo no parece ser PDF válido. Inicio:', primerBase64.substring(0, 30));
      // No bloqueamos, solo advertimos
    }

    console.log(`✅ ${archivosBase64Limpios.length} archivos procesados`);

    // ✅ GUARDAR LOS ARCHIVOS
    solicitud.estado = 'APROBADO';
    solicitud.archivos = archivosBase64Limpios.map((base64, index) => ({
      nombre: archivosNombre[index] || `recibo_${index + 1}.pdf`,
      url: base64,
      publicId: archivosPublicId[index] || `recibo_${id}_${Date.now()}_${index}`
    }));
    solicitud.aprobadoPor = {
      usuarioId: usuario._id,
      nombre: usuario.nombre,
      fecha: new Date()
    };
    solicitud.fechaActualizacion = new Date();

    await solicitud.save();

    console.log(`✅ Solicitud aprobada con ${archivosBase64Limpios.length} archivo(s)`);

    // ============================================
    // NOTIFICACION: push + campana al SOLICITANTE
    // (el email se envia DESPUES, no se toca)
    // ============================================
    try {
      const solicitadoPorId = solicitud.solicitadoPor?.usuarioId;
      if (solicitadoPorId) {
        await enviarNotificacionRecibo(
          solicitadoPorId,
          '✅ Recibo Aprobado',
          'Tu solicitud de recibo para ' + solicitud.cliente.nombre + ' fue aprobada. Ya podes descargarlo.',
          {
            solicitudId: solicitud._id,
            clienteNombre: solicitud.cliente.nombre,
            clienteCodigo: solicitud.cliente.codigo,
            estado: 'APROBADO',
            tipo: 'RECIBO_APROBADO',
            screen: 'DescargarRecibo',
          }
        );
      }
    } catch (notifError) {
      console.error('Error notificando aprobacion de recibo:', notifError.message);
    }
    // ✅ ENVIAR CORREO SOLO AL SOLICITANTE
    try {
      const emailService = require('../services/emailService');
      const fechaFormateada = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Obtener email del solicitante
      const solicitante = await User.findById(solicitud.solicitadoPor.usuarioId);
      const emailDestino = solicitante?.email || usuario.email;

      console.log(`📧 Enviando correo a: ${emailDestino}`);

      const resultadoCorreo = await emailService.enviarCorreoRecibo({
        to: emailDestino,
        clienteNombre: solicitud.cliente.nombre,
        fechaSolicitud: fechaFormateada,
        observaciones: solicitud.observaciones || '',
        archivosBase64: archivosBase64Limpios,
        archivosNombres: archivosNombre,
        estado: 'APROBADO',
        usuarioSolicitante: solicitante?.nombre || usuario.nombre
      });

      console.log(`📧 Resultado envío correo: ${resultadoCorreo.success ? '✅ OK' : '❌ Error'}`);
    } catch (emailError) {
      console.error('❌ Error enviando correo:', emailError.message);
      // No bloqueamos la respuesta si el correo falla
    }

    res.json({
      success: true,
      message: `Solicitud aprobada con ${archivosBase64Limpios.length} archivo(s)`,
      data: solicitud
    });

  } catch (error) {
    console.error('❌ Error en aprobarSolicitud:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al procesar la solicitud' 
    });
  }
};

// ✅ DENEGAR SOLICITUD CON ENVÍO DE CORREO
const denegarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user._id;

    console.log('📤 Denegando solicitud:', id);

    const solicitud = await SolicitudRecibo.findById(id);
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'SOLICITADO') {
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue procesada' });
    }

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    solicitud.estado = 'DENEGADO';
    solicitud.motivoDenegacion = motivo || 'No especificado';
    solicitud.denegadoPor = {
      usuarioId: usuario._id,
      nombre: usuario.nombre,
      fecha: new Date()
    };
    solicitud.fechaActualizacion = new Date();

    await solicitud.save();

    console.log('✅ Solicitud denegada');

    // ============================================
    // NOTIFICACION: push + campana al SOLICITANTE
    // (el email se envia DESPUES, no se toca)
    // ============================================
    try {
      const solicitadoPorId = solicitud.solicitadoPor?.usuarioId;
      if (solicitadoPorId) {
        await enviarNotificacionRecibo(
          solicitadoPorId,
          '❌ Recibo Denegado',
          'Tu solicitud de recibo para ' + solicitud.cliente.nombre + ' fue denegada. Motivo: ' + (solicitud.motivoDenegacion || 'Sin motivo'),
          {
            solicitudId: solicitud._id,
            clienteNombre: solicitud.cliente.nombre,
            clienteCodigo: solicitud.cliente.codigo,
            estado: 'DENEGADO',
            motivoDenegacion: solicitud.motivoDenegacion || '',
            tipo: 'RECIBO_DENEGADO',
            screen: 'SolicitudesDenegadas',
          }
        );
      }
    } catch (notifError) {
      console.error('Error notificando denegacion de recibo:', notifError.message);
    }
    // ✅ ENVIAR CORREO DE DENEGACIÓN SOLO AL SOLICITANTE
    try {
      const emailService = require('../services/emailService');
      const fechaFormateada = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const solicitante = await User.findById(solicitud.solicitadoPor.usuarioId);
      const emailDestino = solicitante?.email || usuario.email;

      console.log(`📧 Enviando correo de denegación a: ${emailDestino}`);

      const resultadoCorreo = await emailService.enviarCorreoRecibo({
        to: emailDestino,
        clienteNombre: solicitud.cliente.nombre,
        fechaSolicitud: fechaFormateada,
        observaciones: solicitud.observaciones || '',
        archivosBase64: [],
        archivosNombres: [],
        estado: 'DENEGADO',
        motivoDenegacion: motivo || 'No especificado',
        usuarioSolicitante: solicitante?.nombre || usuario.nombre
      });

      console.log(`📧 Resultado envío correo denegación: ${resultadoCorreo.success ? '✅ OK' : '❌ Error'}`);
    } catch (emailError) {
      console.error('❌ Error enviando correo de denegación:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Solicitud denegada correctamente',
      data: solicitud
    });

  } catch (error) {
    console.error('❌ Error en denegarSolicitud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ BUSCAR CLIENTES
const buscarClientes = async (req, res) => {
  try {
    const { termino } = req.query;
    
    console.log('🔍 Buscando cliente con término:', termino);
    
    if (!termino || termino.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const clientes = await Cliente.find({
      $or: [
        { nombre: { $regex: termino, $options: 'i' } },
        { identificador: { $regex: termino, $options: 'i' } },
        { cedula: { $regex: termino, $options: 'i' } },
        { telefono: { $regex: termino, $options: 'i' } },
        { barrio: { $regex: termino, $options: 'i' } }
      ]
    })
    .limit(10)
    .lean();

    console.log(`📋 Encontrados ${clientes.length} clientes`);

    const resultados = clientes.map(c => ({
      nombre: c.nombre || 'Sin nombre',
      codigo: c.identificador || c.cedula || c._id.toString(),
      direccion: c.direccion || c.barrio || '',
      telefono: c.telefono || ''
    }));

    res.json({
      success: true,
      data: resultados
    });
  } catch (error) {
    console.error('❌ Error en buscarClientes:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = {
  getSolicitudes,
  crearSolicitud,
  aprobarSolicitud,
  denegarSolicitud,
  buscarClientes
};