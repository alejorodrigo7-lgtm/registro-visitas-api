// ✅ CONTROLADOR DE GESTIÓN DE SERVICIOS
// Crear servicio (todos) → Revisar y decidir (Admin/Jefe)

const Servicio = require('../models/Servicio');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const { enviarNotificacionPush } = require('../services/pushService');
const Notificacion = require('../models/Notificacion');

// ============================================
// 📤 SUBIR IMAGEN A CLOUDINARY
// ============================================
const subirImagen = async (imagen, servicioId) => {
  if (!imagen) return '';
  try {
    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return imagen;
    }
    if (imagen.startsWith('data:image')) {
      const resultado = await cloudinary.uploader.upload(imagen, {
        folder: 'servicios',
        resource_type: 'image',
        public_id: `servicio_gestion_${servicioId}`,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      });
      return resultado.secure_url;
    }
    return '';
  } catch (error) {
    console.error('❌ [GESTIÓN] Error subiendo imagen:', error.message);
    return '';
  }
};

// ============================================
// 🔔 CREAR NOTIFICACIÓN (CAMPANA + PUSH)
// ============================================
const crearNotificacion = async (usuarioId, titulo, mensaje, tipo, datos = {}) => {
  try {
    const notif = await Notificacion.create({
      usuario: usuarioId,
      destinatario: usuarioId,
      titulo,
      mensaje,
      tipo,
      leida: false,
      datos,
    });

    // Push
    try {
      await enviarNotificacionPush(usuarioId, {
        title: titulo,
        body: mensaje,
        data: { ...datos, tipo },
      });
    } catch (pushError) {
      console.error('⚠️ [GESTIÓN] Error push:', pushError.message);
    }

    return notif;
  } catch (error) {
    console.error('❌ [GESTIÓN] Error creando notificación:', error.message);
    return null;
  }
};

// ============================================
// 🎯 OBTENER TÉCNICOS ACTIVOS
// ============================================
exports.getTecnicos = async (req, res) => {
  try {
    const tecnicos = await User.find(
      { rol: 'Tecnico', activo: true },
      'nombre email telefono especialidad'
    ).sort({ nombre: 1 });

    res.json({
      success: true,
      count: tecnicos.length,
      data: tecnicos,
    });
  } catch (error) {
    console.error('❌ [GESTIÓN] Error getTecnicos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📝 CREAR SERVICIO DE GESTIÓN (TODOS)
// ============================================
exports.crearServicioGestion = async (req, res) => {
  try {
    const {
      cliente,
      codigoIdentificador,
      barrio,
      direccion,
      telefono,
      telefonoContacto,
      tipoContacto,
      observaciones,
      imagen,
    } = req.body;

    console.log('========================================');
    console.log('📝 [GESTIÓN] Creando servicio de gestión');
    console.log(`👤 Cliente: ${cliente}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    // Validaciones
    if (!cliente || !codigoIdentificador || !barrio || !direccion ||
        !telefono || !telefonoContacto || !tipoContacto || !observaciones || !imagen) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios (incluidos teléfono de contacto, tipo de contacto y foto)',
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Subir imagen
    const imagenUrl = await subirImagen(imagen, Date.now());

    if (!imagenUrl) {
      return res.status(400).json({
        success: false,
        message: 'Error subiendo la foto a Cloudinary',
      });
    }

    // Crear servicio
    const servicio = await Servicio.create({
      cliente,
      codigoIdentificador,
      barrio,
      direccion,
      telefono,
      telefonoContacto,
      tipoContacto,
      nombreServicio: 'SIN INTERNET (FOCO ROJO)', // default
      telefonos: [telefono],
      observaciones,
      responsable: responsable.nombre,
      responsableId: responsable._id,
      imagen: imagenUrl,
      estado: 'PENDIENTE',
      origen: 'gestion',
      revisadoPorGestion: false,
      gestionPor: responsable._id,
      fechaGestion: new Date(),
      activo: true,
    });

    console.log(`✅ [GESTIÓN] Servicio creado: ${servicio._id}`);

    // Notificar a Admin y Jefe
    const adminsYJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      activo: true,
    });

    const mensaje = `Nuevo servicio de gestión para ${cliente}`;

    for (const u of adminsYJefes) {
      await crearNotificacion(
        u._id,
        '📋 Servicio de Gestión',
        mensaje,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    // Notificar al creador (si no es Admin/Jefe)
    if (!['Admin', 'Jefe'].includes(responsable.rol)) {
      await crearNotificacion(
        responsable._id,
        '📋 Servicio de Gestión Creado',
        `Tu servicio para ${cliente} fue enviado a revisión`,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Servicio de gestión creado correctamente',
      data: servicio,
    });

  } catch (error) {
    console.error('❌ [GESTIÓN] Error crearServicioGestion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 LISTAR SERVICIOS DE GESTIÓN PENDIENTES (Admin/Jefe)
// ============================================
exports.getServiciosGestionPendientes = async (req, res) => {
  try {
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Admin y Jefe pueden revisar servicios de gestión',
      });
    }

    const servicios = await Servicio.find({
      origen: 'gestion',
      estado: 'PENDIENTE',
      activo: true,
    })
      .select('+imagen')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    console.log(`✅ [GESTIÓN] Pendientes: ${servicios.length}`);

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });

  } catch (error) {
    console.error('❌ [GESTIÓN] Error getServiciosGestionPendientes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 📋 LISTAR TODOS LOS SERVICIOS DE GESTIÓN (Admin/Jefe)
// ============================================
exports.getServiciosGestion = async (req, res) => {
  try {
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Admin y Jefe pueden ver servicios de gestión',
      });
    }

    const servicios = await Servicio.find({
      origen: 'gestion',
      activo: true,
    })
      .select('+imagen')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });

  } catch (error) {
    console.error('❌ [GESTIÓN] Error getServiciosGestion:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ✅ MARCAR RESUELTO (Admin/Jefe)
// ============================================
exports.marcarResuelto = async (req, res) => {
  try {
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Admin y Jefe pueden marcar como resuelto',
      });
    }

    const { id } = req.params;
    const { observacion } = req.body;

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    if (servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado}`,
      });
    }

    // Actualizar
    servicio.estado = 'EJECUTADO';
    servicio.tipoGestion = 'resuelto';
    servicio.revisadoPorGestion = true;
    servicio.ejecucion = {
      observaciones: observacion || 'Resuelto por gestión',
      materiales: [],
      macEquipo: '',
      macRepetidor: '',
      snReceptor: '',
      responsableEjecucion: req.user.nombre,
      fechaEjecucion: new Date(),
    };
    servicio.updatedAt = new Date();

    await servicio.save();

    console.log(`✅ [GESTIÓN] Marcado resuelto: ${servicio._id}`);

    // Notificar al creador
    if (servicio.gestionPor) {
      await crearNotificacion(
        servicio.gestionPor,
        '✅ Servicio Resuelto por Gestión',
        `El servicio de ${servicio.cliente} fue marcado como RESUELTO`,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    // Notificar a Admin/Jefe
    const adminsYJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      activo: true,
      _id: { $ne: req.user._id },
    });

    for (const u of adminsYJefes) {
      await crearNotificacion(
        u._id,
        '✅ Servicio Resuelto',
        `${req.user.nombre} marcó como resuelto el servicio de ${servicio.cliente}`,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    res.json({
      success: true,
      message: 'Servicio marcado como RESUELTO',
      data: servicio,
    });

  } catch (error) {
    console.error('❌ [GESTIÓN] Error marcarResuelto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// 🔵 ASIGNAR VISITA PRESENCIAL (Admin/Jefe)
// ============================================
exports.asignarVisitaPresencial = async (req, res) => {
  try {
    if (!['Admin', 'Jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo Admin y Jefe pueden asignar visita presencial',
      });
    }

    const { id } = req.params;
    const { segundaObservacion, tecnicoId } = req.body;

    if (!segundaObservacion || !segundaObservacion.trim()) {
      return res.status(400).json({
        success: false,
        message: 'La segunda observación es obligatoria',
      });
    }

    if (!tecnicoId) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar un técnico',
      });
    }

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    if (servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado}`,
      });
    }

    const tecnico = await User.findById(tecnicoId);
    if (!tecnico || tecnico.rol !== 'Tecnico') {
      return res.status(400).json({
        success: false,
        message: 'El usuario seleccionado no es un técnico válido',
      });
    }

    // Actualizar
    servicio.estado = 'TOMADO';
    servicio.tipoGestion = 'visita_presencial';
    servicio.revisadoPorGestion = true;
    servicio.segundaObservacion = segundaObservacion.trim();
    servicio.tecnico = {
      _id: tecnico._id,
      nombre: tecnico.nombre,
      email: tecnico.email,
    };
    servicio.updatedAt = new Date();

    await servicio.save();

    console.log(`✅ [GESTIÓN] Visita presencial asignada a ${tecnico.nombre}`);

    // Notificar al técnico
    await crearNotificacion(
      tecnico._id,
      '🔵 Nueva Visita Presencial',
      `Servicio de ${servicio.cliente}. Obs: ${segundaObservacion}`,
      'SERVICIO',
      { servicioId: servicio._id.toString() }
    );

    // Notificar al creador
    if (servicio.gestionPor) {
      await crearNotificacion(
        servicio.gestionPor,
        '🔵 Visita Presencial Asignada',
        `El servicio de ${servicio.cliente} fue asignado a ${tecnico.nombre}`,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    // Notificar a Admin/Jefe
    const adminsYJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
      activo: true,
      _id: { $ne: req.user._id },
    });

    for (const u of adminsYJefes) {
      await crearNotificacion(
        u._id,
        '🔵 Visita Presencial Asignada',
        `${req.user.nombre} asignó a ${tecnico.nombre}: ${servicio.cliente}`,
        'SERVICIO',
        { servicioId: servicio._id.toString() }
      );
    }

    res.json({
      success: true,
      message: `Visita presencial asignada a ${tecnico.nombre}`,
      data: servicio,
    });

  } catch (error) {
    console.error('❌ [GESTIÓN] Error asignarVisitaPresencial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;