// ✅ CONTROLADOR CORREGIDO - VERSIÓN CON ACTUALIZACIÓN DE BODEGA (RESTANDO MATERIALES)
// ✅ CON CORREO AL TÉCNICO EN TOMAR SERVICIO
// ✅ CON CORREO AL SOLICITANTE EN RETROALIMENTAR SERVICIO

const Servicio = require('../models/Servicio');
const User = require('../models/User');
const Bodega = require('../models/Bodega');
const { enviarNotificacionPush } = require('../services/pushService');
const emailService = require('../services/emailService');

// ✅ Función para asegurar que la imagen tenga el prefijo correcto
const formatearImagen = (imagen) => {
  if (!imagen) return '';
  if (imagen.startsWith('data:image')) return imagen;
  return `data:image/jpeg;base64,${imagen}`;
};

// ============================================
// 📦 ACTUALIZAR BODEGA DEL TÉCNICO (RESTANDO MATERIALES)
// ============================================
const actualizarBodegaTecnico = async (tecnicoId, materiales, operacion = 'restar') => {
  try {
    console.log(`📦 Actualizando bodega del técnico ${tecnicoId} (${operacion})`);
    console.log(`📦 Materiales a procesar:`, materiales);
    
    let bodega = await Bodega.findOne({ usuario: tecnicoId });
    
    if (!bodega) {
      console.log('⚠️ Bodega no encontrada, creando una nueva...');
      const user = await User.findById(tecnicoId);
      bodega = new Bodega({
        usuario: tecnicoId,
        usuarioNombre: user?.nombre || 'Técnico',
        nombre: `Bodega de ${user?.nombre || 'Técnico'}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: tecnicoId,
      });
      await bodega.save();
      console.log('✅ Bodega creada');
    }
    
    console.log('📦 Materiales actuales en bodega:');
    bodega.materiales.forEach(m => {
      console.log(`   ${m.nombre}: ${m.cantidad}`);
    });
    
    let actualizados = 0;
    for (const material of materiales) {
      const nombre = material.nombre;
      const cantidad = parseFloat(material.cantidad) || 1;
      
      if (!nombre) continue;
      
      const materialExistente = bodega.materiales.find(m => m.nombre === nombre);
      
      if (materialExistente) {
        if (operacion === 'restar') {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) - cantidad;
          console.log(`✅ Material restado: ${nombre} → ${materialExistente.cantidad}`);
        } else {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) + cantidad;
          console.log(`✅ Material sumado: ${nombre} → ${materialExistente.cantidad}`);
        }
        materialExistente.fechaActualizacion = new Date();
      } else {
        const nuevaCantidad = operacion === 'restar' ? -cantidad : cantidad;
        bodega.materiales.push({
          nombre: nombre,
          cantidad: nuevaCantidad,
          minimo: 0,
          fechaAsignacion: new Date(),
          fechaActualizacion: new Date(),
        });
        console.log(`✅ Nuevo material agregado: ${nombre} → ${nuevaCantidad}`);
      }
      actualizados++;
    }
    
    if (actualizados > 0) {
      bodega.updatedAt = new Date();
      await bodega.save();
      console.log(`✅ Bodega actualizada con ${actualizados} materiales`);
    }
    
    return { success: true, actualizados };
  } catch (error) {
    console.error('❌ Error actualizando bodega:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📝 CREAR SERVICIO
// ============================================
exports.crearServicio = async (req, res) => {
  try {
    const { 
      cliente, 
      direccion, 
      telefono, 
      descripcion, 
      prioridad 
    } = req.body;

    console.log(`📝 Creando servicio para cliente: ${cliente}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    if (!cliente || !direccion || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Los campos cliente, dirección y teléfono son obligatorios'
      });
    }

    const servicio = new Servicio({
      cliente,
      direccion,
      telefono,
      descripcion: descripcion || '',
      prioridad: prioridad || 'Normal',
      responsable: req.user.nombre,
      responsableId: req.user._id,
      estado: 'TOMADO',
      activo: true,
      creadoPor: req.user._id,
    });

    await servicio.save();

    console.log(`✅ Servicio creado ID: ${servicio._id}`);

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: servicio
    });

  } catch (error) {
    console.error('❌ Error al crear servicio:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 🔧 ASIGNAR SERVICIO A TÉCNICO
// ============================================
exports.asignarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnicoId } = req.body;
    const usuario = req.user;

    console.log(`🔧 Asignando servicio ${id} al técnico ${tecnicoId}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden asignar servicios en estado TOMADO o PENDIENTE'
      });
    }

    const tecnico = await User.findById(tecnicoId);
    if (!tecnico || tecnico.rol !== 'Tecnico') {
      return res.status(400).json({
        success: false,
        message: 'El usuario no es un técnico válido'
      });
    }

    servicio.tecnico = {
      _id: tecnico._id,
      nombre: tecnico.nombre,
      email: tecnico.email
    };
    servicio.estado = 'ASIGNADO';
    servicio.fechaAsignacion = new Date();
    servicio.asignadoPor = usuario._id;
    await servicio.save();

    try {
      if (tecnico && tecnico.email) {
        console.log(`📧 Enviando correo de asignación al técnico: ${tecnico.email}`);
        await emailService.enviarNotificacionServicioAsignado(
          {
            cliente: servicio.cliente,
            direccion: servicio.direccion || 'N/A',
            telefono: servicio.telefono || 'N/A',
            descripcion: servicio.nombreServicio || 'Sin descripción',
            prioridad: servicio.prioridad || 'Normal',
            asignadoPor: { nombre: usuario.nombre }
          },
          tecnico
        );
        console.log(`✅ Correo de asignación enviado al técnico: ${tecnico.email}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando correo al técnico:`, error.message);
    }

    res.json({
      success: true,
      message: 'Servicio asignado exitosamente',
      data: servicio
    });

  } catch (error) {
    console.error('❌ Error al asignar servicio:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// TOMAR SERVICIO - CON CORREO AL TÉCNICO ✅
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

    const tecnico = await User.findById(tecnicoAsignado);
    const jefe = await User.findById(jefeAsignado);

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
      imagen: formatearImagen(imagen),
      estado: 'TOMADO',
      activo: true,
    });

    console.log('✅ Servicio creado:', servicio._id);
    console.log('✅ Técnico asignado:', tecnico ? tecnico.nombre : 'No encontrado');
    console.log('✅ Jefe asignado:', jefe ? jefe.nombre : 'No encontrado');

    // ✅ 📧 ENVIAR CORREO AL TÉCNICO ASIGNADO
    try {
      if (tecnico && tecnico.email) {
        console.log(`📧 Enviando correo al técnico: ${tecnico.email}`);
        await emailService.enviarNotificacionServicioAsignado(
          {
            cliente: servicio.cliente,
            direccion: servicio.direccion || 'N/A',
            telefono: servicio.telefono || 'N/A',
            descripcion: servicio.nombreServicio || 'Sin descripción',
            prioridad: servicio.prioridad || 'Normal',
            asignadoPor: { nombre: responsable.nombre }
          },
          tecnico
        );
        console.log(`✅ Correo de asignación enviado al técnico: ${tecnico.email}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando correo al técnico:`, error.message);
    }

    // NOTIFICACIONES PUSH
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
    console.error('❌ Error en tomarServicio:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// ✅ OBTENER SERVICIOS POR ESTADO
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
      query['tecnico._id'] = tecnicoId;
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
// ✅ OBTENER TODOS LOS SERVICIOS
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
// OBTENER UN SERVICIO
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
// EJECUTAR SERVICIO - CON CORREO AL SOLICITANTE ✅
// ============================================
exports.ejecutarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, materiales, macEquipo, macRepetidor, snReceptor } = req.body;

    console.log(`🔧 Ejecutando servicio ID: ${id}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`📦 Materiales recibidos:`, materiales);

    const servicio = await Servicio.findById(id)
      .populate('responsableId', 'nombre email');

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

    // 📦 ACTUALIZAR BODEGA
    if (materiales && materiales.length > 0) {
      console.log(`📦 Actualizando bodega del técnico (RESTANDO)...`);
      const tecnicoId = servicio.tecnico?._id || req.user._id;
      const resultadoBodega = await actualizarBodegaTecnico(tecnicoId, materiales, 'restar');
      
      if (resultadoBodega.success) {
        console.log(`✅ Bodega actualizada: ${resultadoBodega.actualizados} materiales restados`);
      } else {
        console.error('❌ Error actualizando bodega:', resultadoBodega.error);
      }
    } else {
      console.log('⚠️ No hay materiales para actualizar la bodega');
    }

    // ✅ 📧 CORREO AL SOLICITANTE
    try {
      const usuarioSolicitante = servicio.responsableId;
      if (usuarioSolicitante && usuarioSolicitante.email) {
        console.log(`📧 Enviando correo de ejecución al solicitante: ${usuarioSolicitante.email}`);
        await emailService.enviarNotificacionServicioEjecutado(
          {
            cliente: servicio.cliente,
            direccion: servicio.direccion || 'N/A',
            telefono: servicio.telefono || 'N/A',
            observacionesEjecucion: observaciones || 'Sin observaciones'
          },
          usuarioSolicitante
        );
        console.log(`✅ Correo de ejecución enviado al solicitante: ${usuarioSolicitante.email}`);
      } else {
        console.warn(`⚠️ No se encontró usuario solicitante para el servicio ${id}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando correo al solicitante:`, error.message);
    }

    // NOTIFICACIONES PUSH
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
// PENDIENTE SERVICIO
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

    const jefe = await User.findById(servicio.jefe?._id || servicio.jefe);
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
// RETROALIMENTAR SERVICIO - CON CORREO AL SOLICITANTE ✅
// ============================================
exports.retroalimentarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log(`🔄 Retroalimentando servicio ID: ${id}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    // ✅ Obtener servicio con datos del solicitante
    const servicio = await Servicio.findById(id)
      .populate('responsableId', 'nombre email');

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

    // ============================================
    // ✅ 📧 ENVIAR CORREO AL SOLICITANTE
    // ============================================
    try {
      const usuarioSolicitante = servicio.responsableId;
      if (usuarioSolicitante && usuarioSolicitante.email) {
        console.log(`📧 Enviando correo de retroalimentación al solicitante: ${usuarioSolicitante.email}`);
        
        await emailService.enviarNotificacionServicioRetroalimentado(
          {
            cliente: servicio.cliente,
            direccion: servicio.direccion || 'N/A',
            telefono: servicio.telefono || 'N/A',
            nombreServicio: servicio.nombreServicio || 'Sin descripción',
            observacionesRetroalimentacion: observaciones || 'Sin observaciones',
            responsableRetroalimentacion: usuario.nombre
          },
          usuarioSolicitante
        );
        console.log(`✅ Correo de retroalimentación enviado al solicitante: ${usuarioSolicitante.email}`);
      } else {
        console.warn(`⚠️ No se encontró usuario solicitante para el servicio ${id}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando correo de retroalimentación:`, error.message);
    }

    // NOTIFICACIONES PUSH
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
// BUSCAR SERVICIOS
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

// ============================================
// ❌ RECHAZAR SERVICIO
// ============================================
exports.rechazarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    console.log(`❌ Rechazando servicio ID: ${id}`);
    console.log(`👤 Usuario: ${req.user.email} (${req.user.rol})`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: 'No se puede rechazar este servicio'
      });
    }

    servicio.estado = 'RECHAZADO';
    servicio.motivoRechazo = motivo || 'Sin motivo especificado';
    await servicio.save();

    res.json({
      success: true,
      message: 'Servicio rechazado',
      data: servicio
    });

  } catch (error) {
    console.error('❌ Error al rechazar servicio:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// ✅ OBTENER SERVICIOS TOMADOS POR TÉCNICO
// ============================================
exports.getServiciosTomadosByTecnico = async (req, res) => {
  try {
    const { tecnicoId } = req.params;
    
    console.log(`📋 Buscando servicios TOMADOS para técnico: ${tecnicoId}`);
    console.log(`👤 Usuario que consulta: ${req.user.email} (${req.user.rol})`);
    
    if (!tecnicoId || tecnicoId === 'undefined' || tecnicoId === 'null' || tecnicoId === '') {
      console.error('❌ ID de técnico inválido:', tecnicoId);
      return res.status(400).json({
        success: false,
        message: 'ID de técnico inválido'
      });
    }
    
    const tecnico = await User.findById(tecnicoId);
    if (!tecnico) {
      console.error('❌ Técnico no encontrado:', tecnicoId);
      return res.status(404).json({
        success: false,
        message: 'Técnico no encontrado'
      });
    }
    
    const servicios = await Servicio.find({
      'tecnico._id': tecnicoId,
      estado: 'TOMADO',
      activo: true
    })
    .populate('tecnico', 'nombre email')
    .populate('jefe', 'nombre email')
    .populate('responsableId', 'nombre email')
    .sort({ createdAt: -1 });
    
    console.log(`✅ ${servicios.length} servicios encontrados para el técnico ${tecnico.nombre}`);
    
    res.json({
      success: true,
      count: servicios.length,
      data: servicios
    });
    
  } catch (error) {
    console.error('❌ Error al obtener servicios del técnico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios del técnico',
      error: error.message
    });
  }
};