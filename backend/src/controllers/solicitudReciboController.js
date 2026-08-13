const SolicitudRecibo = require('../models/SolicitudRecibo');
const User = require('../models/User');

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
    console.error('Error:', error);
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
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
  }
};

// Aprobar solicitud
const aprobarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { archivoNombre, archivoUrl, archivoPublicId } = req.body;
    const usuarioId = req.user.id;

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

    solicitud.estado = 'APROBADO';
    solicitud.archivo = {
      nombre: archivoNombre,
      url: archivoUrl,
      publicId: archivoPublicId
    };
    solicitud.aprobadoPor = {
      usuarioId: usuario._id,
      nombre: usuario.nombre,
      fecha: new Date()
    };
    solicitud.fechaActualizacion = new Date();

    await solicitud.save();

    res.json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      data: solicitud
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar la solicitud' });
  }
};

// Denegar solicitud
const denegarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

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
    solicitud.denegadoPor = {
      usuarioId: usuario._id,
      nombre: usuario.nombre,
      fecha: new Date()
    };
    solicitud.fechaActualizacion = new Date();

    await solicitud.save();

    res.json({
      success: true,
      message: 'Solicitud denegada',
      data: solicitud
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error al denegar la solicitud' });
  }
};

// Buscar clientes
const buscarClientes = async (req, res) => {
  try {
    const { termino } = req.query;
    if (!termino || termino.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const solicitudes = await SolicitudRecibo.find({
      $or: [
        { 'cliente.nombre': { $regex: termino, $options: 'i' } },
        { 'cliente.codigo': { $regex: termino, $options: 'i' } }
      ]
    })
    .limit(10)
    .sort({ fechaSolicitud: -1 });

    const clientesMap = new Map();
    solicitudes.forEach(s => {
      const key = s.cliente.codigo;
      if (!clientesMap.has(key)) {
        clientesMap.set(key, s.cliente);
      }
    });

    res.json({
      success: true,
      data: Array.from(clientesMap.values())
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Error al buscar clientes' });
  }
};

module.exports = {
  getSolicitudes,
  crearSolicitud,
  aprobarSolicitud,
  denegarSolicitud,
  buscarClientes
};