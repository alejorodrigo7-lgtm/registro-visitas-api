const Horario = require('../models/Horario');
const Notificacion = require('../models/Notificacion');
const User = require('../models/User');
const Visita = require('../models/Visita');
const { enviarNotificacionPush } = require('../services/pushService');

// ============================================
// CREAR HORARIO
// ============================================
exports.crearHorario = async (req, res) => {
  try {
    const { asignadoA, diasLaborales, horaInicio, horaFin, intervaloAlerta } = req.body;

    const usuarioAsignado = await User.findById(asignadoA);
    if (!usuarioAsignado) {
      return res.status(404).json({ message: 'Usuario asignado no encontrado' });
    }

    if (['Admin', 'Jefe'].includes(usuarioAsignado.rol)) {
      return res.status(400).json({ message: 'No se puede asignar horario a Admin o Jefe' });
    }

    if (horaInicio >= horaFin) {
      return res.status(400).json({ message: 'La hora de inicio debe ser menor a la hora de fin' });
    }

    const horario = await Horario.create({
      creadoPor: req.user._id,
      asignadoA,
      diasLaborales,
      horaInicio,
      horaFin,
      intervaloAlerta,
      activo: true,
    });

    // Notificación para el asignado
    await Notificacion.create({
      titulo: '📋 Nuevo Horario Asignado',
      mensaje: `Se te ha asignado un nuevo horario de trabajo.`,
      tipo: 'sistema',
      usuario: asignadoA,
      datos: { horarioId: horario._id },
    });

    // Intentar enviar notificación push
    try {
      await enviarNotificacionPush(usuarioAsignado._id, {
        title: '📋 Nuevo Horario',
        body: `Se te ha asignado un nuevo horario de trabajo.`,
        data: { horarioId: horario._id.toString() },
      });
    } catch (pushError) {
      console.error('Error al enviar push:', pushError);
    }

    res.status(201).json({
      success: true,
      message: 'Horario creado correctamente',
      data: horario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// OBTENER TODOS LOS HORARIOS
// ============================================
exports.getHorarios = async (req, res) => {
  try {
    let query = {};

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.asignadoA = req.user._id;
    } else if (['Jefe', 'Admin'].includes(req.user.rol)) {
      query.creadoPor = req.user._id;
    }

    const horarios = await Horario.find(query)
      .populate('creadoPor', 'nombre email rol')
      .populate('asignadoA', 'nombre email rol')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: horarios.length,
      data: horarios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// OBTENER UN HORARIO
// ============================================
exports.getHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findById(id)
      .populate('creadoPor', 'nombre email rol')
      .populate('asignadoA', 'nombre email rol');

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor._id.toString() === req.user._id.toString();
    const esAsignado = horario.asignadoA._id.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador && !esAsignado) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    res.json({
      success: true,
      data: horario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ACTUALIZAR HORARIO
// ============================================
exports.updateHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const { diasLaborales, horaInicio, horaFin, intervaloAlerta, activo } = req.body;

    const horario = await Horario.findById(id);
    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (diasLaborales) horario.diasLaborales = diasLaborales;
    if (horaInicio) horario.horaInicio = horaInicio;
    if (horaFin) horario.horaFin = horaFin;
    if (intervaloAlerta) horario.intervaloAlerta = intervaloAlerta;
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
        await enviarNotificacionPush(horario.asignadoA, {
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
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ELIMINAR HORARIO
// ============================================
exports.deleteHorario = async (req, res) => {
  try {
    const { id } = req.params;
    const horario = await Horario.findById(id);

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    const esAdmin = req.user.rol === 'Admin';
    const esCreador = horario.creadoPor.toString() === req.user._id.toString();

    if (!esAdmin && !esCreador) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await horario.deleteOne();

    res.json({
      success: true,
      message: 'Horario eliminado correctamente',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// VERIFICAR ALERTAS DE HORARIO (CRON)
// ============================================
exports.verificarAlertasHorario = async () => {
  try {
    const now = new Date();
    const diaActual = now.getDay();
    const horaActual = now.getHours().toString().padStart(2, '0');
    const minutoActual = now.getMinutes().toString().padStart(2, '0');
    const tiempoActual = `${horaActual}:${minutoActual}`;

    console.log(`🔄 Verificando alertas de horarios...`);
    console.log(`📅 Hoy es día ${diaActual}, hora: ${tiempoActual}`);

    const horarios = await Horario.find({
      activo: true,
      diasLaborales: diaActual,
    }).populate('asignadoA', 'nombre email');

    console.log(`📋 Horarios encontrados: ${horarios.length}`);

    for (const horario of horarios) {
      console.log(`🕐 Horario ${horario._id}: ${horario.horaInicio} - ${horario.horaFin}`);
      
      if (tiempoActual < horario.horaInicio || tiempoActual > horario.horaFin) {
        console.log(`⏰ Fuera de horario laboral`);
        continue;
      }

      const ultimaVisita = await Visita.findOne({
        tecnico: horario.asignadoA._id,
        fecha: {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      }).sort({ fecha: -1 });

      let tiempoSinVisita = 0;
      if (ultimaVisita) {
        const diffMs = now.getTime() - new Date(ultimaVisita.fecha).getTime();
        tiempoSinVisita = Math.floor(diffMs / (60 * 1000));
      } else {
        tiempoSinVisita = horario.intervaloAlerta;
      }

      console.log(`⏱️ Tiempo sin visita: ${tiempoSinVisita} minutos`);

      if (tiempoSinVisita >= horario.intervaloAlerta) {
        const horas = Math.floor(tiempoSinVisita / 60);
        const minutos = tiempoSinVisita % 60;
        const tiempoStr = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

        const mensajeTecnico = `⚠️ Usted no ha registrado una visita hace ${tiempoStr}`;
        const mensajeJefe = `⚠️ El técnico ${horario.asignadoA.nombre} no ha registrado visitas hace ${tiempoStr}`;

        console.log(`📝 Guardando notificación para el técnico: ${mensajeTecnico}`);
        
        // Guardar notificación para el técnico
        await Notificacion.create({
          titulo: '⏰ Alerta de Visita',
          mensaje: mensajeTecnico,
          tipo: 'alerta_horario',
          usuario: horario.asignadoA._id,
          datos: { horarioId: horario._id, tiempoSinVisita },
        });

        // Enviar push al técnico
        try {
          await enviarNotificacionPush(horario.asignadoA._id, {
            title: '⏰ Alerta de Visita',
            body: mensajeTecnico,
            data: { horarioId: horario._id.toString(), tipo: 'alerta_tecnico' },
          });
        } catch (pushError) {
          console.error('Error al enviar push al técnico:', pushError);
        }

        console.log(`📝 Guardando notificación para el jefe: ${mensajeJefe}`);

        // Guardar notificación para el jefe
        await Notificacion.create({
          titulo: '⏰ Alerta de Visita',
          mensaje: mensajeJefe,
          tipo: 'alerta_horario',
          usuario: horario.creadoPor,
          datos: { horarioId: horario._id, tiempoSinVisita },
        });

        // Enviar push al jefe
        try {
          await enviarNotificacionPush(horario.creadoPor, {
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