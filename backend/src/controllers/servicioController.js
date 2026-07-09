const Servicio = require('../models/Servicio');
const User = require('../models/User');
const { enviarNotificacionPush } = require('../services/pushService');

// ============================================
// TOMAR SERVICIO
// ============================================
exports.tomarServicio = async (req, res) => {
  try {
    const {
      cliente,
      codigoIdentificador,
      barrio,
      direccion,
      telefono,
      nombreServicio,
      telefonos,
      observaciones,
      tecnicoAsignado,
      jefeAsignado,
      imagen,
    } = req.body;

    if (!cliente || !codigoIdentificador || !barrio || !direccion || !telefono ||
        !nombreServicio || !telefonos || !observaciones || !tecnicoAsignado || !jefeAsignado) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

    const servicio = await Servicio.create({
      cliente,
      codigoIdentificador,
      barrio,
      direccion,
      telefono,
      nombreServicio,
      telefonos,
      observaciones,
      responsable: responsable.nombre,
      responsableId: req.user._id,
      tecnicoAsignado,
      jefeAsignado,
      imagen: imagen || '',
      estado: 'TOMADO',
    });

    // Notificaciones push
    const tecnico = await User.findById(tecnicoAsignado);
    const jefe = await User.findById(jefeAsignado);

    const mensajePush = `📋 Se ha tomado un servicio "${nombreServicio}" para el cliente ${cliente}`;

    if (tecnico) {
      await enviarNotificacionPush(tecnico._id, {
        title: '📋 Nuevo Servicio',
        body: mensajePush,
        data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
      });
    }

    if (jefe) {
      await enviarNotificacionPush(jefe._id, {
        title: '📋 Nuevo Servicio',
        body: mensajePush,
        data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Servicio tomado correctamente',
      data: servicio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= OBTENER SERVICIOS POR ESTADO
// ============================================
exports.getServiciosByEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    
    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado',
      });
    }

    const estadosValidos = ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido',
      });
    }

    let query = { estado };
    
    // Técnicos solo ven servicios donde son asignados
    if (req.user.rol === 'Tecnico') {
      query.tecnicoAsignado = req.user._id;
    }
    // Jefes ven servicios donde son asignados como jefe
    else if (req.user.rol === 'Jefe') {
      query.jefeAsignado = req.user._id;
    }

    const servicios = await Servicio.find(query)
      .populate('tecnicoAsignado', 'nombre email')
      .populate('jefeAsignado', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= OBTENER TODOS LOS SERVICIOS
// ============================================
exports.getServicios = async (req, res) => {
  try {
    let query = {};

    if (req.user.rol === 'Tecnico') {
      query.tecnicoAsignado = req.user._id;
    } else if (req.user.rol === 'Jefe') {
      query.jefeAsignado = req.user._id;
    }

    const servicios = await Servicio.find(query)
      .populate('tecnicoAsignado', 'nombre email')
      .populate('jefeAsignado', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= OBTENER UN SERVICIO
// ============================================
exports.getServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await Servicio.findById(id)
      .populate('tecnicoAsignado', 'nombre email')
      .populate('jefeAsignado', 'nombre email')
      .populate('responsableId', 'nombre email');

    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    res.json({
      success: true,
      data: servicio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= EJECUTAR SERVICIO (Admin/Jefe/Tecnico)
// ============================================
exports.ejecutarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, materiales, macEquipo, macRepetidor, snReceptor } = req.body;

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado} y no puede ser ejecutado`,
      });
    }

    const usuario = await User.findById(req.user._id);

    servicio.ejecucion = {
      observaciones: observaciones || '',
      materiales: materiales || [],
      macEquipo: macEquipo || '',
      macRepetidor: macRepetidor || '',
      snReceptor: snReceptor || '',
      responsableEjecucion: usuario.nombre,
      fechaEjecucion: new Date(),
    };
    servicio.estado = 'EJECUTADO';
    servicio.updatedAt = new Date();

    await servicio.save();

    // Notificación al responsable
    await enviarNotificacionPush(servicio.responsableId, {
      title: '✅ Servicio Ejecutado',
      body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue ejecutado de manera exitosa`,
      data: { servicioId: servicio._id.toString(), tipo: 'servicio_ejecutado' },
    });

    res.json({
      success: true,
      message: 'Servicio ejecutado correctamente',
      data: servicio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= PENDIENTE SERVICIO (Admin/Jefe/Tecnico)
// ============================================
exports.pendienteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    if (servicio.estado !== 'TOMADO') {
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado} y no puede ser puesto en pendiente`,
      });
    }

    servicio.ejecucion.observaciones = observaciones || '';
    servicio.estado = 'PENDIENTE';
    servicio.updatedAt = new Date();

    await servicio.save();

    // Notificaciones push
    const jefe = await User.findById(servicio.jefeAsignado);
    const responsable = await User.findById(servicio.responsableId);

    const mensajePush = `⚠️ ALERTA: El servicio "${servicio.nombreServicio}" de ${servicio.cliente} está en estado PENDIENTE`;

    if (jefe) {
      await enviarNotificacionPush(jefe._id, {
        title: '⚠️ Servicio Pendiente',
        body: mensajePush,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
      });
    }

    if (responsable) {
      await enviarNotificacionPush(responsable._id, {
        title: '⚠️ Servicio Pendiente',
        body: mensajePush,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
      });
    }

    res.json({
      success: true,
      message: 'Servicio marcado como pendiente',
      data: servicio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= RETROALIMENTAR SERVICIO (Admin/Jefe/Tecnico)
// ============================================
exports.retroalimentarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    if (servicio.estado !== 'EJECUTADO') {
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado} y no puede ser retroalimentado`,
      });
    }

    const usuario = await User.findById(req.user._id);

    servicio.retroalimentacion = {
      observaciones: observaciones || '',
      responsable: usuario.nombre,
      fecha: new Date(),
    };
    servicio.estado = 'RETROALIMENTADO';
    servicio.updatedAt = new Date();

    await servicio.save();

    // Notificación al responsable
    await enviarNotificacionPush(servicio.responsableId, {
      title: '✅ Servicio Retroalimentado',
      body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue retroalimentado de manera exitosa`,
      data: { servicioId: servicio._id.toString(), tipo: 'servicio_retroalimentado' },
    });

    res.json({
      success: true,
      message: 'Servicio retroalimentado correctamente',
      data: servicio,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
= BUSCAR SERVICIOS (Revisión)
// ============================================
exports.buscarServicios = async (req, res) => {
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
        { cliente: { $regex: search, $options: 'i' } },
        { codigoIdentificador: { $regex: search, $options: 'i' } },
      ],
    };

    const servicios = await Servicio.find(query)
      .populate('tecnicoAsignado', 'nombre email')
      .populate('jefeAsignado', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};