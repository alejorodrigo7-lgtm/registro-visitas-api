// ============================================
// TOMAR SERVICIO - PERMITIR A COORDINADOR Y TECNICO
// ============================================
exports.tomarServicio = async (req, res) => {
  try {
    // ✅ PERMITIR A ADMIN, JEFE, COORDINADOR Y TECNICO
    const rolesPermitidos = ['Admin', 'Jefe', 'Coordinador', 'Tecnico'];
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Rol ${req.user.rol} no autorizado para tomar servicios`
      });
    }

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

    console.log('📋 Datos recibidos:', req.body);

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
      try {
        console.log(`📤 Enviando push al técnico ${tecnico.email}`);
        await enviarNotificacionPush(tecnico._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
        console.log(`✅ Push enviado al técnico ${tecnico.email}`);
      } catch (pushError) {
        console.error('Error enviando push al técnico:', pushError);
      }
    }

    if (jefe) {
      try {
        console.log(`📤 Enviando push al jefe ${jefe.email}`);
        await enviarNotificacionPush(jefe._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
        console.log(`✅ Push enviado al jefe ${jefe.email}`);
      } catch (pushError) {
        console.error('Error enviando push al jefe:', pushError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Servicio tomado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('Error en tomarServicio:', error);
    res.status(500).json({ message: error.message });
  }
};