const SolicitudRecibo = require('../models/SolicitudRecibo');
const User = require('../models/User');
const Cliente = require('../models/Cliente');

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

    const solicitudes = await SolicitudRecibo.find(query)
      .sort({ fechaSolicitud: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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
    const usuarioId = req.user.id;

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

// ✅ APROBAR SOLICITUD CON MÚLTIPLES ARCHIVOS Y ENVÍO DE CORREO
const aprobarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { archivosNombre = [], archivosBase64 = [], archivoPublicId } = req.body;
    const usuarioId = req.user.id;

    console.log('📤 ===== APROBANDO SOLICITUD =====');
    console.log('📤 Solicitud ID:', id);
    console.log(`📤 Archivos: ${archivosBase64.length}`);

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

    // ✅ VERIFICAR QUE TENEMOS ARCHIVOS
    if (!archivosBase64 || archivosBase64.length === 0) {
      console.log('❌ No se recibieron archivos');
      return res.status(400).json({ success: false, message: 'No se recibieron archivos' });
    }

    // ✅ GUARDAR LOS ARCHIVOS
    solicitud.estado = 'APROBADO';
    solicitud.archivos = archivosBase64.map((base64, index) => ({
      nombre: archivosNombre[index] || `recibo_${index+1}.pdf`,
      url: base64,
      publicId: archivoPublicId || `recibo_${id}_${Date.now()}_${index}`
    }));
    solicitud.aprobadoPor = {
      usuarioId: usuario._id,
      nombre: usuario.nombre,
      fecha: new Date()
    };
    solicitud.fechaActualizacion = new Date();

    await solicitud.save();

    console.log(`✅ Solicitud aprobada con ${archivosBase64.length} archivo(s)`);

    // ✅ ENVIAR CORREO CON LOS ARCHIVOS ADJUNTOS
    const emailService = require('../services/emailService');
    const fechaFormateada = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Obtener email del solicitante
    const solicitante = await User.findById(solicitud.solicitadoPor.usuarioId);
    const emailDestino = solicitante?.email || usuario.email;

    const resultadoCorreo = await emailService.enviarCorreoRecibo({
      to: emailDestino,
      clienteNombre: solicitud.cliente.nombre,
      fechaSolicitud: fechaFormateada,
      observaciones: solicitud.observaciones || '',
      archivosBase64: archivosBase64,
      archivosNombres: archivosNombre,
      estado: 'APROBADO',
      usuarioSolicitante: solicitante?.nombre || usuario.nombre
    });

    console.log(`📧 Resultado envío correo: ${resultadoCorreo.success ? '✅ OK' : '❌ Error'}`);

    res.json({
      success: true,
      message: `Solicitud aprobada. ${resultadoCorreo.success ? 'Correo enviado al solicitante.' : 'Correo no pudo ser enviado.'}`,
      data: solicitud
    });

  } catch (error) {
    console.error('❌ Error en aprobarSolicitud:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ DENEGAR SOLICITUD CON ENVÍO DE CORREO
const denegarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user.id;

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

    // ✅ ENVIAR CORREO DE DENEGACIÓN
    const emailService = require('../services/emailService');
    const fechaFormateada = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const solicitante = await User.findById(solicitud.solicitadoPor.usuarioId);
    const emailDestino = solicitante?.email || usuario.email;

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

    res.json({
      success: true,
      message: `Solicitud denegada. ${resultadoCorreo.success ? 'Correo enviado al solicitante.' : 'Correo no pudo ser enviado.'}`,
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