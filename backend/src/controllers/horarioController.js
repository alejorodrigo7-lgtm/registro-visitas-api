const Horario = require('../models/Horario');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const Visita = require('../models/Visita');
const pushService = require('../services/pushService');

// ============================================
// 📋 CREAR HORARIO (CON FECHAS Y ALMUERZO)
// ============================================
exports.crearHorario = async (req, res) => {
  console.log('📋 1. crearHorario - Inicio');
  console.log('📋 2. Body recibido:', req.body);
  console.log('📋 3. Usuario:', req.user?.email);

  try {
    const {
      asignadoA,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      horaAlmuerzoInicio,
      horaAlmuerzoFin,
      intervaloAlerta,
    } = req.body;

    // Validar campos obligatorios
    if (!asignadoA) {
      console.log('❌ 4. Error: asignadoA faltante');
      return res.status(400).json({
        success: false,
        message: 'El campo asignadoA es obligatorio'
      });
    }

    if (!fechaInicio) {
      console.log('❌ 5. Error: fechaInicio faltante');
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio es obligatoria'
      });
    }

    if (!fechaFin) {
      console.log('❌ 6. Error: fechaFin faltante');
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin es obligatoria'
      });
    }

    if (!horaInicio) {
      console.log('❌ 7. Error: horaInicio faltante');
      return res.status(400).json({
        success: false,
        message: 'La hora de inicio es obligatoria'
      });
    }

    if (!horaFin) {
      console.log('❌ 8. Error: horaFin faltante');
      return res.status(400).json({
        success: false,
        message: 'La hora de fin es obligatoria'
      });
    }

    if (horaInicio >= horaFin) {
      console.log('❌ 9. Error: horaInicio >= horaFin');
      return res.status(400).json({
        success: false,
        message: 'La hora de inicio debe ser menor a la hora de fin'
      });
    }

    // Verificar usuario asignado
    console.log('👤 10. Verificando usuario asignado:', asignadoA);
    const usuarioAsignado = await User.findById(asignadoA);
    if (!usuarioAsignado) {
      console.log('❌ 11. Usuario asignado no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario asignado no encontrado'
      });
    }
    console.log('✅ 12. Usuario asignado:', usuarioAsignado.nombre);

    // Validar que no sea Admin o Jefe
    if (['Admin', 'Jefe'].includes(usuarioAsignado.rol)) {
      console.log('❌ 13. No se puede asignar horario a Admin o Jefe');
      return res.status(400).json({
        success: false,
        message: 'No se puede asignar horario a un Administrador o Jefe'
      });
    }

    // Validar fechas
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    if (fechaInicioDate > fechaFinDate) {
      console.log('❌ 14. Error: fechaInicio > fechaFin');
      return res.status(400).json({
        success: false,
        message: 'La fecha de inicio debe ser menor a la fecha de fin'
      });
    }

    // Crear horario
    console.log('📋 15. Creando horario...');
    const horario = new Horario({
      creadoPor: req.user._id,
      creadoPorNombre: req.user.nombre,
      asignadoA,
      asignadoNombre: usuarioAsignado.nombre,
      fechaInicio: fechaInicioDate,
      fechaFin: fechaFinDate,
      horaInicio,
      horaFin,
      horaAlmuerzoInicio: horaAlmuerzoInicio || '12:00',
      horaAlmuerzoFin: horaAlmuerzoFin || '13:00',
      intervaloAlerta: parseInt(intervaloAlerta) || 30,
      activo: true,
    });

    await horario.save();
    console.log('✅ 16. Horario creado con ID:', horario._id);

    // ✅ Notificación para el asignado
    console.log('📝 17. Guardando notificación para el asignado...');
    await Notificacion.create({
      titulo: '📋 Nuevo Horario Asignado',
      mensaje: `Se te ha asignado un horario del ${fechaInicioDate.toLocaleDateString('es-ES')} al ${fechaFinDate.toLocaleDateString('es-ES')}`,
      tipo: 'sistema',
      usuario: asignadoA,
      datos: { horarioId: horario._id },
    });

    // ✅ Enviar push al asignado
    console.log('📲 18. Enviando push al asignado...');
    try {
      await pushService.enviarNotificacionPush(asignadoA, {
        title: '📋 Nuevo Horario',
        body: `Horario asignado del ${fechaInicioDate.toLocaleDateString('es-ES')} al ${fechaFinDate.toLocaleDateString('es-ES')}`,
        data: { horarioId: horario._id.toString() },
      });
      console.log('✅ 19. Push enviado al asignado');
    } catch (pushError) {
      console.error('❌ Error al enviar push al asignado:', pushError);
    }

    // ✅ Notificación para el creador
    console.log('📝 20. Guardando notificación para el creador...');
    await Notificacion.create({
      titulo: '✅ Horario Creado',
      mensaje: `Has creado un horario para ${usuarioAsignado.nombre} del ${fechaInicioDate.toLocaleDateString('es-ES')} al ${fechaFinDate.toLocaleDateString('es-ES')}`,
      tipo: 'sistema',
      usuario: req.user._id,
      datos: { horarioId: horario._id },
    });

    // ✅ Enviar push al creador
    console.log('📲 21. Enviando push al creador...');
    try {
      await pushService.enviarNotificacionPush(req.user._id, {
        title: '✅ Horario Creado',
        body: `Has creado un horario para ${usuarioAsignado.nombre}`,
        data: { horarioId: horario._id.toString() },
      });
      console.log('✅ 22. Push enviado al creador');
    } catch (pushError) {
      console.error('❌ Error al enviar push al creador:', pushError);
    }

    res.status(201).json({
      success: true,
      message: 'Horario creado correctamente',
      data: horario,
    });

  } catch (error) {
    console.log('❌ 23. Error en crearHorario:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor',
    });
  }
};

// ============================================
// 📋 OBTENER TODOS LOS HORARIOS
// ============================================
exports.getHorarios = async (req, res) => {
  console.log('📋 1. getHorarios - Inicio');
  
  try {
    let query = {};

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.asignadoA = req.user._id;
    } else if (['Jefe', 'Admin'].includes(req.user.rol)) {
      // Admin y Jefe ven todos los horarios que crearon o todos (Admin ve todos)
      if (req.user.rol === 'Admin') {
        // Admin ve todos
      } else {
        query.creadoPor = req.user._id;
      }
    }

    console.log('📋 2. Query:', JSON.stringify(query));

    const horarios = await Horario.find(query)
      .populate('creadoPor', 'nombre email rol')
      .populate('asignadoA', 'nombre email rol')
      .sort({ fechaInicio: -1 });

    console.log('✅ 3. Horarios encontrados:', horarios.length);

    res.json({
      success: true,
      count: horarios.length,
      data: horarios,
    });

  } catch (error) {
    console.log('❌ Error en getHorarios:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER MI HORARIO (para Técnico/Coordinador)
// ============================================
exports.getMiHorario = async (req, res) => {
  console.log('📋 1. getMiHorario - Inicio');
  console.log('📋 2. Usuario:', req.user?.email);

  try {
    const ahora = new Date();
    
    const horario = await Horario.findOne({
      asignadoA: req.user._id,
      activo: true,
      fechaInicio: { $lte: ahora },
      fechaFin: { $gte: ahora },
    }).populate('creadoPor', 'nombre email');

    if (!horario) {
      console.log('⚠️ 3. No hay horario activo para el usuario');
      return res.json({
        success: true,
        data: null,
        message: 'No tienes un horario activo',
      });
    }

    console.log('✅ 4. Horario encontrado:', horario._id);

    res.json({
      success: true,
      data: horario,
    });

  } catch (error) {
    console.log('❌ Error en getMiHorario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER UN HORARIO POR ID
// ============================================
exports.getHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findById(id)
      .populate('creadoPor', 'nombre email rol')
      .populate('asignadoA', 'nombre email rol');

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor._id.toString() === req.user._id.toString();
    const esAsignado = horario.asignadoA._id.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador && !esAsignado) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    res.json({
      success: true,
      data: horario,
    });

  } catch (error) {
    console.error('Error en getHorario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ACTUALIZAR HORARIO
// ============================================
exports.updateHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      horaAlmuerzoInicio,
      horaAlmuerzoFin,
      intervaloAlerta,
      activo,
    } = req.body;

    const horario = await Horario.findById(id);
    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    if (fechaInicio) horario.fechaInicio = new Date(fechaInicio);
    if (fechaFin) horario.fechaFin = new Date(fechaFin);
    if (horaInicio) horario.horaInicio = horaInicio;
    if (horaFin) horario.horaFin = horaFin;
    if (horaAlmuerzoInicio) horario.horaAlmuerzoInicio = horaAlmuerzoInicio;
    if (horaAlmuerzoFin) horario.horaAlmuerzoFin = horaAlmuerzoFin;
    if (intervaloAlerta) horario.intervaloAlerta = parseInt(intervaloAlerta);
    if (activo !== undefined) horario.activo = activo;
    horario.updatedAt = new Date();

    await horario.save();

    // Notificar al asignado sobre el cambio
    if (horario.asignadoA.toString() !== req.user._id.toString()) {
      await Notificacion.create({
        titulo: '📋 Horario Actualizado',
        mensaje: 'Tu horario de trabajo ha sido actualizado.',
        tipo: 'sistema',
        usuario: horario.asignadoA,
        datos: { horarioId: horario._id },
      });

      try {
        await pushService.enviarNotificacionPush(horario.asignadoA, {
          title: '📋 Horario Actualizado',
          body: 'Tu horario de trabajo ha sido actualizado.',
          data: { horarioId: horario._id.toString() },
        });
      } catch (pushError) {
        console.error('Error al enviar push:', pushError);
      }
    }

    res.json({
      success: true,
      message: 'Horario actualizado correctamente',
      data: horario,
    });

  } catch (error) {
    console.error('Error en updateHorario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 ELIMINAR HORARIO
// ============================================
exports.deleteHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findById(id);

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: 'Horario no encontrado'
      });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado'
      });
    }

    await horario.deleteOne();

    res.json({
      success: true,
      message: 'Horario eliminado correctamente',
    });

  } catch (error) {
    console.error('Error en deleteHorario:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ⏰ VERIFICAR ALERTAS DE HORARIO (CRON)
// ============================================
const verificarAlertasHorario = async () => {
  try {
    const now = new Date();
    const diaActual = now.getDay();
    const horaActual = now.getHours().toString().padStart(2, '0');
    const minutoActual = now.getMinutes().toString().padStart(2, '0');
    const tiempoActual = `${horaActual}:${minutoActual}`;

    console.log(`🔄 Verificando alertas de horarios...`);
    console.log(`📅 Hoy es día ${diaActual}, hora: ${tiempoActual}`);

    // Buscar horarios activos para hoy
    const horarios = await Horario.find({
      activo: true,
      fechaInicio: { $lte: now },
      fechaFin: { $gte: now },
    }).populate('asignadoA', 'nombre email expoPushToken');

    console.log(`📋 Horarios encontrados: ${horarios.length}`);

    for (const horario of horarios) {
      console.log(`🕐 Horario ${horario._id}: ${horario.horaInicio} - ${horario.horaFin} (${horario.asignadoA.nombre})`);
      
      if (tiempoActual < horario.horaInicio || tiempoActual > horario.horaFin) {
        console.log(`⏰ Fuera de horario laboral`);
        continue;
      }

      // Verificar si está en horario de almuerzo
      if (tiempoActual >= horario.horaAlmuerzoInicio && tiempoActual <= horario.horaAlmuerzoFin) {
        console.log(`🍽️ En horario de almuerzo`);
        continue;
      }

      // Buscar última visita del usuario
      const ultimaVisita = await Visita.findOne({
        tecnico: horario.asignadoA._id,
      }).sort({ fecha: -1 });

      let tiempoSinVisita = 0;
      if (ultimaVisita) {
        const diffMs = now.getTime() - new Date(ultimaVisita.fecha).getTime();
        tiempoSinVisita = Math.floor(diffMs / (60 * 1000));
      } else {
        tiempoSinVisita = horario.intervaloAlerta;
      }

      console.log(`⏱️ Tiempo sin visita: ${tiempoSinVisita} minutos (alerta: ${horario.intervaloAlerta})`);

      if (tiempoSinVisita >= horario.intervaloAlerta) {
        const horas = Math.floor(tiempoSinVisita / 60);
        const minutos = tiempoSinVisita % 60;
        const tiempoStr = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

        const mensajeTecnico = `⚠️ Usted no ha registrado una visita hace ${tiempoStr}`;
        const mensajeJefe = `⚠️ El técnico ${horario.asignadoA.nombre} no ha registrado visitas hace ${tiempoStr}`;

        // Notificación para el técnico
        await Notificacion.create({
          titulo: '⏰ Alerta de Visita',
          mensaje: mensajeTecnico,
          tipo: 'alerta_horario',
          usuario: horario.asignadoA._id,
          datos: { horarioId: horario._id, tiempoSinVisita },
        });

        try {
          await pushService.enviarNotificacionPush(horario.asignadoA._id, {
            title: '⏰ Alerta de Visita',
            body: mensajeTecnico,
            data: { horarioId: horario._id.toString(), tipo: 'alerta_tecnico' },
          });
        } catch (pushError) {
          console.error('Error al enviar push al técnico:', pushError);
        }

        // Notificación para el jefe
        await Notificacion.create({
          titulo: '⏰ Alerta de Visita',
          mensaje: mensajeJefe,
          tipo: 'alerta_horario',
          usuario: horario.creadoPor,
          datos: { horarioId: horario._id, tiempoSinVisita },
        });

        try {
          await pushService.enviarNotificacionPush(horario.creadoPor, {
            title: '⏰ Alerta de Visita',
            body: mensajeJefe,
            data: { horarioId: horario._id.toString(), tipo: 'alerta_jefe' },
          });
        } catch (pushError) {
          console.error('Error al enviar push al jefe:', pushError);
        }

        console.log(`✅ Alertas enviadas para horario ${horario._id}`);
      } else {
        console.log(`✅ Tiempo sin visita (${tiempoSinVisita}m) dentro del intervalo (${horario.intervaloAlerta}m)`);
      }
    }
  } catch (error) {
    console.error('❌ Error en verificarAlertasHorario:', error);
  }
};

exports.verificarAlertasHorario = verificarAlertasHorario;