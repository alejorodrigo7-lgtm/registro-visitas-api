const SolicitudPermiso = require('../models/SolicitudPermiso');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');

// ============================================
// 📋 CREAR SOLICITUD DE PERMISO/RESESO
// ============================================
exports.crearSolicitud = async (req, res) => {
  console.log('📋 1. crearSolicitud - Inicio');
  console.log('📋 2. Body:', req.body);
  console.log('📋 3. Usuario:', req.user?.email);

  try {
    const { tipo, fecha, horaInicio, horaFin, observacion, jefeId } = req.body;

    // Validar campos obligatorios
    if (!tipo) {
      console.log('❌ 4. Error: tipo faltante');
      return res.status(400).json({
        success: false,
        message: 'El campo tipo es obligatorio'
      });
    }

    if (!fecha) {
      console.log('❌ 5. Error: fecha faltante');
      return res.status(400).json({
        success: false,
        message: 'La fecha es obligatoria'
      });
    }

    if (!horaInicio) {
      console.log('❌ 6. Error: horaInicio faltante');
      return res.status(400).json({
        success: false,
        message: 'La hora de inicio es obligatoria'
      });
    }

    if (!horaFin) {
      console.log('❌ 7. Error: horaFin faltante');
      return res.status(400).json({
        success: false,
        message: 'La hora de fin es obligatoria'
      });
    }

    if (!observacion) {
      console.log('❌ 8. Error: observacion faltante');
      return res.status(400).json({
        success: false,
        message: 'La observación es obligatoria'
      });
    }

    if (!jefeId) {
      console.log('❌ 9. Error: jefeId faltante');
      return res.status(400).json({
        success: false,
        message: 'Debes seleccionar un jefe para la solicitud'
      });
    }

    // Verificar que el jefe existe
    console.log('👤 10. Verificando jefe:', jefeId);
    const jefe = await User.findById(jefeId);
    if (!jefe) {
      console.log('❌ 11. Jefe no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Jefe no encontrado'
      });
    }
    console.log('✅ 12. Jefe encontrado:', jefe.nombre);

    // Verificar que el jefe tiene rol Admin o Jefe
    if (!['Admin', 'Jefe'].includes(jefe.rol)) {
      console.log('❌ 13. Error: El usuario no es Admin o Jefe');
      return res.status(400).json({
        success: false,
        message: 'El usuario seleccionado no es un Jefe o Administrador'
      });
    }

    // Crear solicitud
    console.log('📋 14. Creando solicitud...');
    const solicitud = await SolicitudPermiso.create({
      usuario: req.user._id,
      usuarioNombre: req.user.nombre,
      jefe: jefeId,
      jefeNombre: jefe.nombre,
      tipo,
      fecha: new Date(fecha),
      horaInicio,
      horaFin,
      observacion,
      estado: 'PENDIENTE',
    });
    console.log('✅ 15. Solicitud creada con ID:', solicitud._id);

    // ✅ Notificación al jefe
    console.log('📝 16. Guardando notificación para el jefe...');
    await Notificacion.create({
      titulo: '📋 Nueva Solicitud de Permiso',
      mensaje: `${req.user.nombre} ha solicitado un ${tipo === 'PERMISO' ? 'permiso' : 'reseso'} para ${new Date(fecha).toLocaleDateString('es-ES')}`,
      tipo: 'sistema',
      usuario: jefeId,
      datos: {
        solicitudId: solicitud._id,
        tipo,
        fecha,
        usuario: req.user.nombre,
      },
    });

    // ✅ Push al jefe
    console.log('📲 17. Enviando push al jefe...');
    try {
      await pushService.enviarNotificacionPush(jefeId, {
        title: '📋 Nueva Solicitud',
        body: `${req.user.nombre} solicita ${tipo === 'PERMISO' ? 'permiso' : 'reseso'}`,
        data: {
          solicitudId: solicitud._id.toString(),
          tipo: 'solicitud_permiso',
        },
      });
      console.log('✅ 18. Push enviado al jefe');
    } catch (pushError) {
      console.error('❌ Error enviando push al jefe:', pushError);
    }

    res.status(201).json({
      success: true,
      message: 'Solicitud creada correctamente',
      data: solicitud,
    });

  } catch (error) {
    console.log('❌ 19. Error en crearSolicitud:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// ============================================
// 📋 OBTENER SOLICITUDES
// ============================================
exports.getSolicitudes = async (req, res) => {
  console.log('📋 1. getSolicitudes - Inicio');
  
  try {
    let query = {};

    // Si es Técnico/Coordinador, solo ver sus solicitudes
    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.usuario = req.user._id;
    } 
    // Si es Jefe/Admin, ver solicitudes dirigidas a él
    else if (['Jefe', 'Admin'].includes(req.user.rol)) {
      // Admin ve todas, Jefe ve las que le llegaron
      if (req.user.rol === 'Jefe') {
        query.jefe = req.user._id;
      }
      // Admin ve todas (sin filtro)
    }

    console.log('📋 2. Query:', JSON.stringify(query));

    const solicitudes = await SolicitudPermiso.find(query)
      .populate('usuario', 'nombre email')
      .populate('jefe', 'nombre email')
      .sort({ createdAt: -1 });

    console.log('✅ 3. Solicitudes encontradas:', solicitudes.length);

    res.json({
      success: true,
      count: solicitudes.length,
      data: solicitudes,
    });

  } catch (error) {
    console.log('❌ Error en getSolicitudes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 APROBAR/DESAPROBAR SOLICITUD
// ============================================
exports.actualizarSolicitud = async (req, res) => {
  console.log('📋 1. actualizarSolicitud - Inicio');
  console.log('📋 2. ID:', req.params.id);
  console.log('📋 3. Body:', req.body);
  console.log('📋 4. Usuario:', req.user?.email);

  try {
    const { id } = req.params;
    const { estado, comentarioJefe } = req.body;

    if (!estado) {
      console.log('❌ 5. Error: estado faltante');
      return res.status(400).json({
        success: false,
        message: 'El campo estado es obligatorio'
      });
    }

    if (!['APROBADO', 'DESAPROBADO'].includes(estado)) {
      console.log('❌ 6. Error: estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser APROBADO o DESAPROBADO'
      });
    }

    const solicitud = await SolicitudPermiso.findById(id);
    if (!solicitud) {
      console.log('❌ 7. Solicitud no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Verificar que el usuario es el jefe asignado o Admin
    if (req.user.rol !== 'Admin' && solicitud.jefe.toString() !== req.user._id.toString()) {
      console.log('❌ 8. Error: No autorizado');
      return res.status(403).json({
        success: false,
        message: 'No autorizado para gestionar esta solicitud'
      });
    }

    solicitud.estado = estado;
    if (comentarioJefe) {
      solicitud.comentarioJefe = comentarioJefe;
    }
    solicitud.updatedAt = new Date();
    await solicitud.save();
    console.log(`✅ 9. Solicitud ${estado}`);

    // ✅ Notificación al usuario que solicitó
    console.log('📝 10. Guardando notificación para el usuario...');
    const mensaje = estado === 'APROBADO' 
      ? `Tu solicitud de ${solicitud.tipo === 'PERMISO' ? 'permiso' : 'reseso'} ha sido APROBADA`
      : `Tu solicitud de ${solicitud.tipo === 'PERMISO' ? 'permiso' : 'reseso'} ha sido DESAPROBADA`;

    await Notificacion.create({
      titulo: estado === 'APROBADO' ? '✅ Solicitud Aprobada' : '❌ Solicitud Desaprobada',
      mensaje,
      tipo: 'sistema',
      usuario: solicitud.usuario,
      datos: {
        solicitudId: solicitud._id,
        estado,
      },
    });

    // ✅ Push al usuario que solicitó
    console.log('📲 11. Enviando push al usuario...');
    try {
      await pushService.enviarNotificacionPush(solicitud.usuario, {
        title: estado === 'APROBADO' ? '✅ Solicitud Aprobada' : '❌ Solicitud Desaprobada',
        body: mensaje,
        data: {
          solicitudId: solicitud._id.toString(),
          tipo: 'solicitud_permiso',
        },
      });
      console.log('✅ 12. Push enviado al usuario');
    } catch (pushError) {
      console.error('❌ Error enviando push al usuario:', pushError);
    }

    res.json({
      success: true,
      message: `Solicitud ${estado === 'APROBADO' ? 'aprobada' : 'desaprobada'} correctamente`,
      data: solicitud,
    });

  } catch (error) {
    console.log('❌ 13. Error en actualizarSolicitud:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};