// ✅ CONTROLADOR CORREGIDO - VERSIÓN FINAL
// ✅ FILTRO DE FECHAS DINÁMICO (fechaInicio/fechaFin)
// ✅ SUBE IMÁGENES A CLOUDINARY EN TOMAR SERVICIO
// ✅ EXCLUYE IMAGEN DE CONSULTAS DE LISTA
// ✅ LOGS DETALLADOS PARA DIAGNÓSTICO

const Servicio = require('../models/Servicio');
const User = require('../models/User');
const Bodega = require('../models/Bodega');
const cloudinary = require('../config/cloudinary');
const { enviarNotificacionPush } = require('../services/pushService');
const emailService = require('../services/emailService');

// ============================================
// 📅 FUNCIÓN AUXILIAR: FILTRO DE FECHAS DINÁMICO
// ============================================
const getFiltroFechas = (req) => {
  const { fechaInicio, fechaFin, dias } = req.query;
  const filtro = {};

  // Si el frontend envía fechaInicio y fechaFin, usarlos
  if (fechaInicio) {
    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    filtro.$gte = inicio;
  }

  if (fechaFin) {
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);
    filtro.$lte = fin;
  }

  // Si no hay fechas, usar el parámetro 'dias' o por defecto 10 días
  if (!fechaInicio && !fechaFin) {
    const diasAtras = parseInt(dias) || 10;
    const hace = new Date();
    hace.setDate(hace.getDate() - diasAtras);
    hace.setHours(0, 0, 0, 0);
    filtro.$gte = hace;
  }

  console.log(`📅 [FILTRO FECHAS] Desde: ${filtro.$gte || 'sin límite'}, Hasta: ${filtro.$lte || 'sin límite'}`);
  return filtro;
};

// ============================================
// 📦 ACTUALIZAR BODEGA DEL TÉCNICO
// ============================================
const actualizarBodegaTecnico = async (tecnicoId, materiales, operacion = 'restar') => {
  try {
    console.log(`📦 [BODEGA] Actualizando bodega del técnico ${tecnicoId} (${operacion})`);
    
    let bodega = await Bodega.findOne({ usuario: tecnicoId });
    
    if (!bodega) {
      console.log('⚠️ [BODEGA] Bodega no encontrada, creando una nueva...');
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
      console.log('✅ [BODEGA] Bodega creada');
    }
    
    let actualizados = 0;
    for (const material of materiales) {
      const nombre = material.nombre;
      const cantidad = parseFloat(material.cantidad) || 1;
      
      if (!nombre) continue;
      
      const materialExistente = bodega.materiales.find(m => m.nombre === nombre);
      
      if (materialExistente) {
        if (operacion === 'restar') {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) - cantidad;
        } else {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) + cantidad;
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
      }
      actualizados++;
    }
    
    if (actualizados > 0) {
      bodega.updatedAt = new Date();
      await bodega.save();
      console.log(`✅ [BODEGA] Bodega actualizada con ${actualizados} materiales`);
    }
    
    return { success: true, actualizados };
  } catch (error) {
    console.error('❌ [BODEGA] Error actualizando bodega:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 📝 CREAR SERVICIO
// ============================================
exports.crearServicio = async (req, res) => {
  try {
    const { cliente, direccion, telefono, descripcion, prioridad } = req.body;

    console.log(`📝 [CREAR SERVICIO] Cliente: ${cliente}`);

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
    console.log(`✅ [CREAR SERVICIO] Servicio creado: ${servicio._id}`);

    res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: servicio
    });

  } catch (error) {
    console.error('❌ [CREAR SERVICIO] Error:', error);
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

    console.log(`🔧 [ASIGNAR SERVICIO] Servicio: ${id}, Técnico: ${tecnicoId}`);

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

    console.log(`✅ [ASIGNAR SERVICIO] Asignado a ${tecnico.nombre}`);

    try {
      if (tecnico && tecnico.email) {
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
        console.log(`✅ [ASIGNAR SERVICIO] Correo enviado`);
      }
    } catch (error) {
      console.error(`❌ [ASIGNAR SERVICIO] Error correo:`, error.message);
    }

    res.json({
      success: true,
      message: 'Servicio asignado exitosamente',
      data: servicio
    });

  } catch (error) {
    console.error('❌ [ASIGNAR SERVICIO] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 📤 TOMAR SERVICIO - CON CLOUDINARY ✅
// ============================================
exports.tomarServicio = async (req, res) => {
  try {
    const rolesPermitidos = ['Admin', 'Jefe', 'Coordinador', 'Tecnico'];
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Rol ${req.user.rol} no autorizado`
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

    console.log('========================================');
    console.log(`📤 [TOMAR SERVICIO] Cliente: ${cliente}`);
    console.log(`📤 [TOMAR SERVICIO] Imagen: ${imagen ? 'SÍ' : 'NO'}`);
    console.log('========================================');

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

    // ✅ SUBIR IMAGEN A CLOUDINARY
    let imagenGuardar = '';
    if (imagen) {
      try {
        if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
          imagenGuardar = imagen;
          console.log(`✅ [TOMAR SERVICIO] URL existente`);
        } 
        else if (imagen.startsWith('data:image')) {
          console.log(`📤 [TOMAR SERVICIO] Subiendo a Cloudinary...`);
          const resultado = await cloudinary.uploader.upload(imagen, {
            folder: 'servicios',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' }
            ]
          });
          imagenGuardar = resultado.secure_url;
          console.log(`✅ [TOMAR SERVICIO] Subido: ${imagenGuardar.substring(0, 80)}...`);
        }
        else if (imagen.includes('cloudinary.com')) {
          imagenGuardar = imagen.startsWith('http') ? imagen : `https://${imagen}`;
        }
      } catch (error) {
        console.error(`❌ [TOMAR SERVICIO] Error Cloudinary:`, error.message);
        imagenGuardar = '';
      }
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
      imagen: imagenGuardar,
      estado: 'TOMADO',
      activo: true,
    });

    console.log(`✅ [TOMAR SERVICIO] Creado: ${servicio._id}`);

    // Correo al técnico
    try {
      if (tecnico && tecnico.email) {
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
      }
    } catch (error) {
      console.error(`❌ [TOMAR SERVICIO] Error correo:`, error.message);
    }

    // Push
    const mensajePush = `📋 Nuevo servicio "${nombreServicio}" para ${cliente}`;

    if (tecnico) {
      try {
        await enviarNotificacionPush(tecnico._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
      } catch (error) {}
    }

    if (jefe) {
      try {
        await enviarNotificacionPush(jefe._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
      } catch (error) {}
    }

    res.status(201).json({
      success: true,
      message: 'Servicio tomado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [TOMAR SERVICIO] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// ✅ OBTENER SERVICIOS POR ESTADO (filtro dinámico)
// ============================================
exports.getServiciosByEstado = async (req, res) => {
  const inicio = Date.now();
  try {
    const { estado } = req.params;
    const filtroFechas = getFiltroFechas(req);
    
    console.log('========================================');
    console.log(`🔍 [GET POR ESTADO] Estado: ${estado}`);
    console.log(`📅 Filtro: ${JSON.stringify(filtroFechas)}`);
    console.log(`👤 Usuario: ${req.user.email}`);
    console.log('========================================');
    
    if (!estado) {
      return res.status(400).json({ success: false, message: 'Se requiere un estado' });
    }

    const estadosValidos = ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    let query = { 
      estado,
      activo: true,
      createdAt: filtroFechas
    };
    
    if (req.user.rol === 'Tecnico') {
      query['tecnico._id'] = req.user._id || req.user.id;
    } else if (req.user.rol === 'Jefe') {
      query['jefe._id'] = req.user._id;
    }

    const servicios = await Servicio.find(query)
      .select('+imagen +origen +revisadoPorGestion +tipoGestion +segundaObservacion +telefonoContacto +tipoContacto')
      .limit(50)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [GET POR ESTADO] Encontrados: ${servicios.length} (${duracion}ms)`);
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ [GET POR ESTADO] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener servicios', 
      error: error.message 
    });
  }
};

// ============================================
// ✅ OBTENER TODOS LOS SERVICIOS (filtro dinámico)
// ============================================
exports.getServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    const filtroFechas = getFiltroFechas(req);
    let query = { 
      activo: true,
      createdAt: filtroFechas
    };

    console.log('========================================');
    console.log(`🔍 [GET SERVICIOS] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`📅 Filtro: ${JSON.stringify(filtroFechas)}`);
    console.log('========================================');

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      query = {
        $and: [
          { activo: true },
          { createdAt: filtroFechas },
          { estado: { $in: ['TOMADO', 'ASIGNADO', 'EN PROCESO'] } },
          { $or: [{ 'tecnico._id': tecnicoId }, { tecnico: { $exists: false } }] }
        ]
      };
    } else if (req.user.rol === 'Jefe') {
      query = {
        $and: [
          { activo: true },
          { createdAt: filtroFechas },
          { 'jefe._id': req.user._id }
        ]
      };
    }

    const servicios = await Servicio.find(query)
      .select('+imagen +origen +revisadoPorGestion +tipoGestion +segundaObservacion +telefonoContacto +tipoContacto')
      .limit(50)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [GET SERVICIOS] Encontrados: ${servicios.length} (${duracion}ms)`);
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ [GET SERVICIOS] Error:', error);
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
    
    const servicio = await Servicio.findById(id);

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
    console.error('❌ [GET SERVICIO] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// EJECUTAR SERVICIO
// ============================================
exports.ejecutarServicio = async (req, res) => {
  const inicio = Date.now();
  try {
    const { id } = req.params;
    const { observaciones, materiales, macEquipo, macRepetidor, snReceptor } = req.body;

    console.log(`🔧 [EJECUTAR] Servicio: ${id}, Usuario: ${req.user.email}`);

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
        message: `El servicio está en estado ${servicio.estado}`,
      });
    }

    const usuario = await User.findById(req.user._id);

    // Procesar materiales
    let materialesProcesados = [];
    
    if (materiales && Array.isArray(materiales)) {
      materialesProcesados = materiales.map(m => {
        if (m.nombre) return { nombre: m.nombre, cantidad: m.cantidad || 1 };
        if (typeof m === 'string') return { nombre: m, cantidad: 1 };
        return { nombre: 'Material desconocido', cantidad: 1 };
      });
    } else if (materiales && typeof materiales === 'object') {
      materialesProcesados = Object.keys(materiales).map(nombre => ({
        nombre: nombre,
        cantidad: materiales[nombre] || 1
      }));
    }

    servicio.ejecucion = {
      observaciones: observaciones || '',
      materiales: materialesProcesados,
      macEquipo: macEquipo || '',
      macRepetidor: macRepetidor || '',
      snReceptor: snReceptor || '',
      responsableEjecucion: usuario.nombre,
      fechaEjecucion: new Date(),
    };
    servicio.estado = 'EJECUTADO';
    servicio.updatedAt = new Date();

    await servicio.save();

    console.log(`✅ [EJECUTAR] Ejecutado: ${servicio._id}`);

    if (materialesProcesados.length > 0) {
      const tecnicoId = servicio.tecnico?._id || req.user._id;
      await actualizarBodegaTecnico(tecnicoId, materialesProcesados, 'restar');
    }

    // Correo al solicitante
    try {
      const usuarioSolicitante = servicio.responsableId;
      if (usuarioSolicitante && usuarioSolicitante.email) {
        await emailService.enviarNotificacionServicioEjecutado(
          {
            cliente: servicio.cliente,
            direccion: servicio.direccion || 'N/A',
            telefono: servicio.telefono || 'N/A',
            observacionesEjecucion: observaciones || 'Sin observaciones',
            materiales: materialesProcesados
          },
          usuarioSolicitante
        );
      }
    } catch (error) {}

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Ejecutado',
        body: `Servicio "${servicio.nombreServicio}" ejecutado`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_ejecutado' },
      });
    } catch (pushError) {}

    res.json({
      success: true,
      message: 'Servicio ejecutado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [EJECUTAR] Error:', error);
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

    console.log(`⏳ [PENDIENTE] Servicio: ${id}`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      if (servicio.tecnico && servicio.tecnico._id.toString() !== tecnicoId.toString()) {
        return res.status(403).json({ success: false, message: 'Sin permiso' });
      }
    }

    if (servicio.estado !== 'TOMADO') {
      return res.status(400).json({ success: false, message: `Estado ${servicio.estado} no válido` });
    }

    servicio.ejecucion.observaciones = observaciones || '';
    servicio.estado = 'PENDIENTE';
    servicio.updatedAt = new Date();
    await servicio.save();

    console.log(`✅ [PENDIENTE] Marcado: ${servicio._id}`);

    const jefe = await User.findById(servicio.jefe?._id || servicio.jefe);
    const responsable = await User.findById(servicio.responsableId);

    const mensajePush = `⚠️ Servicio "${servicio.nombreServicio}" PENDIENTE`;

    if (jefe) {
      try {
        await enviarNotificacionPush(jefe._id, {
          title: '⚠️ Servicio Pendiente',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
        });
      } catch (e) {}
    }

    if (responsable) {
      try {
        await enviarNotificacionPush(responsable._id, {
          title: '⚠️ Servicio Pendiente',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'servicio_pendiente' },
        });
      } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Servicio marcado como pendiente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [PENDIENTE] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// RETROALIMENTAR SERVICIO
// ============================================
exports.retroalimentarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log(`🔄 [RETROALIMENTAR] Servicio: ${id}`);

    const servicio = await Servicio.findById(id);

    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    if (servicio.estado !== 'EJECUTADO') {
      return res.status(400).json({ 
        success: false, 
        message: `Estado ${servicio.estado} no válido` 
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

    console.log(`✅ [RETROALIMENTAR] Completado: ${servicio._id}`);

    try {
      const usuarioSolicitante = servicio.responsableId;
      if (usuarioSolicitante && usuarioSolicitante.email) {
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
      }
    } catch (error) {}

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Retroalimentado',
        body: `Servicio "${servicio.nombreServicio}" retroalimentado`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_retroalimentado' },
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Servicio retroalimentado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [RETROALIMENTAR] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// BUSCAR SERVICIOS (filtro dinámico)
// ============================================
exports.buscarServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    const { search } = req.query;
    const filtroFechas = getFiltroFechas(req);

    console.log(`🔍 [BUSCAR] Término: "${search}"`);

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

    const query = {
      $and: [
        { activo: true },
        { createdAt: filtroFechas },
        {
          $or: [
            { cliente: { $regex: search, $options: 'i' } },
            { codigoIdentificador: { $regex: search, $options: 'i' } },
          ]
        }
      ]
    };

    const servicios = await Servicio.find(query)
      .select('+imagen +origen +revisadoPorGestion +tipoGestion +segundaObservacion +telefonoContacto +tipoContacto')
      .limit(50)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [BUSCAR] Encontrados: ${servicios.length} (${duracion}ms)`);

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    console.error('❌ [BUSCAR] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ❌ RECHAZAR SERVICIO
// ============================================
exports.rechazarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    console.log(`❌ [RECHAZAR] Servicio: ${id}`);

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      return res.status(400).json({ success: false, message: 'No se puede rechazar' });
    }

    servicio.estado = 'RECHAZADO';
    servicio.motivoRechazo = motivo || 'Sin motivo especificado';
    await servicio.save();

    console.log(`✅ [RECHAZAR] Rechazado: ${servicio._id}`);

    res.json({
      success: true,
      message: 'Servicio rechazado',
      data: servicio
    });
  } catch (error) {
    console.error('❌ [RECHAZAR] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// ✅ OBTENER SERVICIOS TOMADOS POR TÉCNICO (filtro dinámico)
// ============================================
exports.getServiciosTomadosByTecnico = async (req, res) => {
  const inicio = Date.now();
  try {
    const { tecnicoId } = req.params;
    const filtroFechas = getFiltroFechas(req);
    
    console.log(`📋 [TOMADOS] Técnico: ${tecnicoId}`);
    
    if (!tecnicoId || tecnicoId === 'undefined' || tecnicoId === 'null') {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }
    
    const tecnico = await User.findById(tecnicoId);
    if (!tecnico) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
    }
    
    const servicios = await Servicio.find({
      'tecnico._id': tecnicoId,
      estado: 'TOMADO',
      activo: true,
      createdAt: filtroFechas
    })
    .select('+imagen +origen +revisadoPorGestion +tipoGestion +segundaObservacion +telefonoContacto +tipoContacto')
    .limit(50)
    .lean();
    
    const duracion = Date.now() - inicio;
    console.log(`✅ [TOMADOS] Encontrados: ${servicios.length} (${duracion}ms)`);
    
    res.json({
      success: true,
      count: servicios.length,
      data: servicios
    });
    
  } catch (error) {
    console.error('❌ [TOMADOS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios',
      error: error.message
    });
  }
};

// ============================================
// 👤 OBTENER MIS SERVICIOS (TÉCNICO) - filtro dinámico
// ============================================
exports.getMisServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    const filtroFechas = getFiltroFechas(req);

    console.log(`👤 [MIS SERVICIOS] Usuario: ${req.user.email}`);

    const query = {
      activo: true,
      'tecnico._id': req.user._id,
      createdAt: filtroFechas
    };

    const servicios = await Servicio.find(query)
      .select('+imagen +origen +revisadoPorGestion +tipoGestion +segundaObservacion +telefonoContacto +tipoContacto')
      .limit(50)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [MIS SERVICIOS] Encontrados: ${servicios.length} (${duracion}ms)`);

    res.json({
      success: true,
      count: servicios.length,
      data: servicios
    });

  } catch (error) {
    console.error('❌ [MIS SERVICIOS] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 🗑️ ELIMINAR SERVICIO (Admin/Jefe)
// ============================================
exports.eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ [ELIMINAR] Servicio: ${id}`);

    const servicio = await Servicio.findOne({ _id: id, activo: true });
    if (!servicio) {
      return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
    }

    await servicio.softDelete();

    console.log(`✅ [ELIMINAR] Eliminado: ${servicio._id}`);

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [ELIMINAR] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};