const Ticket = require('../models/Ticket');
const User = require('../models/User');

// ============================================
// 🔧 GENERAR ID DE TICKET
// ============================================

const generarTicketId = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = 'CT-';
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
};

// ============================================
// 🌐 RUTAS PÚBLICAS
// ============================================

// ✅ 1. Crear ticket desde web (cliente)
const crearTicketWeb = async (req, res) => {
  try {
    const { cliente, tipo, zona, direccion, descripcion } = req.body;

    if (!cliente?.nombre || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y tipo de falla son requeridos'
      });
    }

    const ticketId = generarTicketId();

    const nuevoTicket = new Ticket({
      ticketId,
      cliente: {
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        direccion: direccion || ''
      },
      tipo,
      zona: zona || 'No especificada',
      descripcion: descripcion || '',
      estado: 'Nuevo',
      origen: 'web'
    });

    // Registrar en historial
    nuevoTicket.historial.push({
      estado: 'Nuevo',
      observacion: 'Ticket creado desde web',
      usuario: 'Cliente'
    });

    await nuevoTicket.save();

    console.log(`✅ Ticket creado: ${ticketId}`);

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      data: {
        ticketId: nuevoTicket.ticketId,
        estado: nuevoTicket.estado
      }
    });

  } catch (error) {
    console.error('❌ Error creando ticket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 2. Consultar ticket por ID (cliente)
const consultarTicketPublico = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('tecnicoAsignado', 'nombre email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        ticketId: ticket.ticketId,
        estado: ticket.estado,
        tipo: ticket.tipo,
        fechaCreacion: ticket.fechaCreacion,
        fechaAsignacion: ticket.fechaAsignacion,
        fechaResolucion: ticket.fechaResolucion,
        tecnicoNombre: ticket.tecnicoNombre || 'Sin asignar',
        observaciones: ticket.observaciones,
        solucion: ticket.solucion,
        historial: ticket.historial.slice(-5)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 3. Consultar tickets por email (cliente)
const consultarTicketsCliente = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const tickets = await Ticket.find({ 'cliente.email': email })
      .populate('tecnicoAsignado', 'nombre email')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: tickets.map(t => ({
        ticketId: t.ticketId,
        estado: t.estado,
        tipo: t.tipo,
        fechaCreacion: t.fechaCreacion,
        tecnicoNombre: t.tecnicoNombre || 'Sin asignar'
      }))
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 🔒 RUTAS PROTEGIDAS
// ============================================

// ✅ 4. Obtener todos los tickets (panel admin)
const getTickets = async (req, res) => {
  try {
    const { estado, zona, tecnico, limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let filtro = {};
    if (estado) filtro.estado = estado;
    if (zona) filtro.zona = zona;
    if (tecnico) filtro.tecnicoAsignado = tecnico;

    const tickets = await Ticket.find(filtro)
      .populate('tecnicoAsignado', 'nombre email')
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Ticket.countDocuments(filtro);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 5. Obtener tickets para técnico (app móvil)
const getTicketsParaTecnico = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    let filtro = {};

    if (usuario.rol === 'Tecnico') {
      filtro = {
        tecnicoAsignado: usuario._id,
        estado: { $in: ['Asignado', 'En Progreso'] }
      };
    } else if (['Admin', 'Jefe', 'Coordinador'].includes(usuario.rol)) {
      filtro = {
        estado: { $in: ['Nuevo', 'Asignado', 'En Progreso'] }
      };
    }

    const tickets = await Ticket.find(filtro)
      .populate('tecnicoAsignado', 'nombre email')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: tickets
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 6. Obtener tickets por estado
const getTicketsByEstado = async (req, res) => {
  try {
    const { estado } = req.params;

    const tickets = await Ticket.find({ estado })
      .populate('tecnicoAsignado', 'nombre email')
      .sort({ fechaCreacion: -1 });

    res.json({
      success: true,
      data: tickets,
      total: tickets.length
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 7. Obtener un ticket por ID
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate('tecnicoAsignado', 'nombre email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 8. Asignar técnico (panel admin)
const asignarTecnico = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnicoId } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const tecnico = await User.findById(tecnicoId);
    if (!tecnico) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
    }

    ticket.tecnicoAsignado = tecnicoId;
    ticket.tecnicoNombre = tecnico.nombre;
    ticket.estado = 'Asignado';
    ticket.fechaAsignacion = new Date();

    ticket.historial.push({
      estado: 'Asignado',
      observacion: `Asignado a ${tecnico.nombre}`,
      usuario: req.user?.nombre || 'Admin'
    });

    await ticket.save();

    res.json({
      success: true,
      message: `Ticket asignado a ${tecnico.nombre}`,
      data: ticket
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 9. Actualizar ticket desde app (con historial)
const actualizarTicketApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones, solucion } = req.body;
    const usuario = req.user;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const estadoAnterior = ticket.estado;

    // Registrar en historial
    ticket.historial.push({
      estado: estado,
      observacion: observaciones || `Cambio de ${estadoAnterior} a ${estado}`,
      usuario: usuario?.nombre || 'Sistema'
    });

    ticket.estado = estado;
    ticket.observaciones = observaciones || ticket.observaciones;
    ticket.ultimaActualizacion = new Date();

    // Fechas según estado
    if (estado === 'En Progreso' && !ticket.fechaInicio) {
      ticket.fechaInicio = new Date();
    }
    if (estado === 'Resuelto') {
      ticket.fechaResolucion = new Date();
      ticket.solucion = solucion || ticket.solucion || 'Servicio completado';
    }
    if (estado === 'Cerrado') {
      ticket.fechaCierre = new Date();
    }

    await ticket.save();

    res.json({
      success: true,
      message: `Ticket actualizado a ${estado}`,
      data: ticket
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ 10. Estadísticas de tickets
const getEstadisticas = async (req, res) => {
  try {
    const total = await Ticket.countDocuments();
    const nuevos = await Ticket.countDocuments({ estado: 'Nuevo' });
    const asignados = await Ticket.countDocuments({ estado: 'Asignado' });
    const enProgreso = await Ticket.countDocuments({ estado: 'En Progreso' });
    const resueltos = await Ticket.countDocuments({ estado: 'Resuelto' });
    const cerrados = await Ticket.countDocuments({ estado: 'Cerrado' });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ticketsHoy = await Ticket.countDocuments({
      fechaCreacion: { $gte: hoy }
    });

    // Tickets por zona
    const porZona = await Ticket.aggregate([
      { $group: { _id: '$zona', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        nuevos,
        asignados,
        enProgreso,
        resueltos,
        cerrados,
        ticketsHoy,
        porZona
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  crearTicketWeb,
  consultarTicketPublico,
  consultarTicketsCliente,
  getTickets,
  getTicketsParaTecnico,
  getTicketsByEstado,
  getTicketById,
  asignarTecnico,
  actualizarTicketApp,
  getEstadisticas
};