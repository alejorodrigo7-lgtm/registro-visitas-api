// ✅ CONTROLADOR CORREGIDO - VERSIÓN FINAL

const Servicio = require('../models/Servicio');
const User = require('../models/User');
const { enviarNotificacionPush } = require('../services/pushService');

// ============================================
// TOMAR SERVICIO - CORREGIDO ✅
// ============================================
exports.tomarServicio = async (req, res) => {
  try {
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

    // ✅ BUSCAR EL TÉCNICO Y JEFE
    const tecnico = await User.findById(tecnicoAsignado);
    const jefe = await User.findById(jefeAsignado);

    // ✅ CREAR EL SERVICIO - Usando 'tecnico' y 'jefe' (coincide con el modelo)
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
      tecnico: tecnico ? {
        _id: tecnico._id,
        nombre: tecnico.nombre,
        email: tecnico.email
      } : null,
      jefe: jefe ? {
        _id: jefe._id,
        nombre: jefe.nombre,
        email: jefe.email
      } : null,
      imagen: imagen || '',
      estado: 'PENDIENTE',
      activo: true,
    });

    console.log('✅ Servicio creado:', servicio._id);
    console.log('✅ Técnico asignado:', servicio.tecnico ? servicio.tecnico.nombre : 'No asignado');
    console.log('✅ Jefe asignado:', servicio.jefe ? servicio.jefe.nombre : 'No asignado');

    // Notificaciones push
    const mensajePush = `📋 Se ha tomado un servicio "${nombreServicio}" para el cliente ${cliente}`;

    if (tecnico) {
      try {
        await enviarNotificacionPush(tecnico._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
      } catch (pushError) {
        console.error('Error enviando push al técnico:', pushError);
      }
    }

    if (jefe) {
      try {
        await enviarNotificacionPush(jefe._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
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
    console.error('❌ Error en tomarServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// OBTENER SERVICIOS POR ESTADO - CORREGIDO ✅
// ============================================
exports.getServiciosByEstado = async (req, res) => {
  try {
    const { estado } = req.params;
    
    console.log('========================================');
    console.log('🔍 BUSCANDO SERVICIOS POR ESTADO');
    console.log(`📋 Estado solicitado: ${estado}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');
    
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

    let query = { 
      estado,
      activo: true
    };
    
    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      query['tecnico._id'] = tecnicoId; // ✅ Buscar en tecnico._id
      console.log(`🎯 Filtrando por técnico ID: ${tecnicoId}`);
    } else if (req.user.rol === 'Jefe') {
      query['jefe._id'] = req.user._id;
      console.log(`🎯 Filtrando por jefe ID: ${req.user._id}`);
    } else if (req.user.rol === 'Coordinador' || req.user.rol === 'Admin') {
      console.log('🎯 Rol con acceso a todos los servicios');
    }

    console.log(`📋 Query final: ${JSON.stringify(query, null, 2)}`);
    
    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    console.log(`✅ Servicios encontrados: ${servicios.length}`);
    
    if (servicios.length === 0 && req.user.rol === 'Tecnico') {
      console.log('⚠️ No se encontraron servicios para este técnico');
    }
    
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ Error en getServiciosByEstado:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener servicios', 
      error: error.message 
    });
  }
};

// ============================================
// OBTENER TODOS LOS SERVICIOS - CORREGIDO ✅
// ============================================
exports.getServicios = async (req, res) => {
  try {
    let query = { activo: true };

    console.log(`🔍 Obteniendo todos los servicios para rol: ${req.user.rol}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      query = {
        $and: [
          { activo: true },
          { 
            estado: { 
              $in: ['TOMADO', 'ASIGNADO', 'EN PROCESO'] 
            } 
          },
          { 
            $or: [
              { 'tecnico._id': tecnicoId },
              { tecnico: { $exists: false } }
            ]
          }
        ]
      };
      console.log(`🎯 Técnico filtrado por estados: TOMADO, ASIGNADO, EN PROCESO`);
    } else if (req.user.rol === 'Jefe') {
      query = {
        $and: [
          { activo: true },
          { 'jefe._id': req.user._id }
        ]
      };
      console.log(`🎯 Jefe filtrado por: ${req.user._id}`);
    } else if (req.user.rol === 'Admin' || req.user.rol === 'Coordinador') {
      console.log('🎯 Acceso completo a todos los servicios activos');
    }

    console.log(`📋 Query final: ${JSON.stringify(query, null, 2)}`);

    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    console.log(`✅ Servicios encontrados: ${servicios.length}`);

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ Error en getServicios:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// OBTENER UN SERVICIO - CORREGIDO ✅
// ============================================
exports.getServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await Servicio.findById(id)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
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
    console.error('❌ Error en getServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// EJECUTAR SERVICIO - CORREGIDO ✅
// ============================================
exports.ejecutarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, materiales, macEquipo, macRepetidor, snReceptor } = req.body;

    console.log(`🔧 Ejecutando servicio ID: ${id}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      if (servicio.tecnico && servicio.tecnico._id.toString() !== tecnicoId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ejecutar este servicio',
        });
      }
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

    console.log(`✅ Servicio ${id} ejecutado correctamente`);

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Ejecutado',
        body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue ejecutado de manera exitosa`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_ejecutado' },
      });
    } catch (pushError) {
      console.error('Error enviando push de ejecución:', pushError);
    }

    res.json({
      success: true,
      message: 'Servicio ejecutado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ Error en ejecutarServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// PENDIENTE SERVICIO - CORREGIDO ✅
// ============================================
exports.pendienteServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log(`⏳ Marcando servicio ${id} como pendiente`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      if (servicio.tecnico && servicio.tecnico._id.toString() !== tecnicoId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para poner pendiente este servicio',
        });
      }
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

    console.log(`✅ Servicio ${id} marcado como pendiente`);

    const jefe = await User.findById(servicio.jefe);
    const responsable = await User.findById(servicio.responsableId);

    const mensajePush = `⚠️ ALERTA: El servicio "${servicio.nombreServicio}" de ${servicio.cliente} está en estado PENDIENTE`;

    if (jefe) {
      try {
        await enviarNotificacionPush(jefe._id, {
          title: '⚠️ Servicio Pendiente',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
        });
      } catch (pushError) {
        console.error('Error enviando push al jefe:', pushError);
      }
    }

    if (responsable) {
      try {
        await enviarNotificacionPush(responsable._id, {
          title: '⚠️ Servicio Pendiente',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
        });
      } catch (pushError) {
        console.error('Error enviando push al responsable:', pushError);
      }
    }

    res.json({
      success: true,
      message: 'Servicio marcado como pendiente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ Error en pendienteServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// RETROALIMENTAR SERVICIO - CORREGIDO ✅
// ============================================
exports.retroalimentarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log(`🔄 Retroalimentando servicio ID: ${id}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

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

    console.log(`✅ Servicio ${id} retroalimentado correctamente`);

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Retroalimentado',
        body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue retroalimentado de manera exitosa`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_retroalimentado' },
      });
    } catch (pushError) {
      console.error('Error enviando push de retroalimentación:', pushError);
    }

    res.json({
      success: true,
      message: 'Servicio retroalimentado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ Error en retroalimentarServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// BUSCAR SERVICIOS - CORREGIDO ✅
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

    console.log(`🔍 Buscando servicios: "${search}"`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    const query = {
      $and: [
        { activo: true },
        {
          $or: [
            { cliente: { $regex: search, $options: 'i' } },
            { codigoIdentificador: { $regex: search, $options: 'i' } },
          ]
        }
      ]
    };

    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ createdAt: -1 });

    console.log(`✅ Servicios encontrados: ${servicios.length}`);

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ Error en buscarServicios:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};