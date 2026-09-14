// ✅ CONTROLADOR CORREGIDO - VERSIÓN FINAL CON LOGS DETALLADOS
// ✅ CON allowDiskUse EN TODAS LAS CONSULTAS CON SORT
// ✅ CON CORREO AL TÉCNICO EN TOMAR SERVICIO
// ✅ CON CORREO AL SOLICITANTE EN RETROALIMENTAR SERVICIO
// ✅ GUARDA URL DE CLOUDINARY EN LUGAR DE BASE64
// ✅ CORREGIDO PROCESAMIENTO DE MATERIALES EN EJECUTAR SERVICIO
// ✅ LOGS DETALLADOS PARA DIAGNÓSTICO

const Servicio = require('../models/Servicio');
const User = require('../models/User');
const Bodega = require('../models/Bodega');
const { enviarNotificacionPush } = require('../services/pushService');
const emailService = require('../services/emailService');

// ============================================
// 📦 ACTUALIZAR BODEGA DEL TÉCNICO (RESTANDO MATERIALES)
// ============================================
const actualizarBodegaTecnico = async (tecnicoId, materiales, operacion = 'restar') => {
  try {
    console.log(`📦 [BODEGA] Actualizando bodega del técnico ${tecnicoId} (${operacion})`);
    console.log(`📦 [BODEGA] Materiales a procesar:`, JSON.stringify(materiales, null, 2));
    
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
    
    console.log('📦 [BODEGA] Materiales actuales en bodega:');
    bodega.materiales.forEach(m => {
      console.log(`   📦 ${m.nombre}: ${m.cantidad}`);
    });
    
    let actualizados = 0;
    for (const material of materiales) {
      const nombre = material.nombre;
      const cantidad = parseFloat(material.cantidad) || 1;
      
      if (!nombre) {
        console.log(`⚠️ [BODEGA] Material sin nombre, saltando...`);
        continue;
      }
      
      const materialExistente = bodega.materiales.find(m => m.nombre === nombre);
      
      if (materialExistente) {
        if (operacion === 'restar') {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) - cantidad;
          console.log(`✅ [BODEGA] Material restado: ${nombre} → ${materialExistente.cantidad}`);
        } else {
          materialExistente.cantidad = (parseFloat(materialExistente.cantidad) || 0) + cantidad;
          console.log(`✅ [BODEGA] Material sumado: ${nombre} → ${materialExistente.cantidad}`);
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
        console.log(`✅ [BODEGA] Nuevo material agregado: ${nombre} → ${nuevaCantidad}`);
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
    const { 
      cliente, 
      direccion, 
      telefono, 
      descripcion, 
      prioridad 
    } = req.body;

    console.log('========================================');
    console.log(`📝 [CREAR SERVICIO] Iniciando...`);
    console.log(`📝 [CREAR SERVICIO] Cliente: ${cliente}`);
    console.log(`📝 [CREAR SERVICIO] Dirección: ${direccion}`);
    console.log(`📝 [CREAR SERVICIO] Teléfono: ${telefono}`);
    console.log(`👤 [CREAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    if (!cliente || !direccion || !telefono) {
      console.log('❌ [CREAR SERVICIO] Faltan campos obligatorios');
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

    console.log(`✅ [CREAR SERVICIO] Servicio creado ID: ${servicio._id}`);

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

    console.log('========================================');
    console.log(`🔧 [ASIGNAR SERVICIO] Iniciando...`);
    console.log(`🔧 [ASIGNAR SERVICIO] Servicio ID: ${id}`);
    console.log(`🔧 [ASIGNAR SERVICIO] Técnico ID: ${tecnicoId}`);
    console.log(`👤 [ASIGNAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      console.log('❌ [ASIGNAR SERVICIO] Servicio no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    console.log(`📋 [ASIGNAR SERVICIO] Estado actual: ${servicio.estado}`);

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      console.log('❌ [ASIGNAR SERVICIO] Estado no válido para asignar');
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden asignar servicios en estado TOMADO o PENDIENTE'
      });
    }

    const tecnico = await User.findById(tecnicoId);
    if (!tecnico || tecnico.rol !== 'Tecnico') {
      console.log('❌ [ASIGNAR SERVICIO] Técnico no válido');
      return res.status(400).json({
        success: false,
        message: 'El usuario no es un técnico válido'
      });
    }

    console.log(`👤 [ASIGNAR SERVICIO] Técnico: ${tecnico.nombre} (${tecnico.email})`);

    servicio.tecnico = {
      _id: tecnico._id,
      nombre: tecnico.nombre,
      email: tecnico.email
    };
    servicio.estado = 'ASIGNADO';
    servicio.fechaAsignacion = new Date();
    servicio.asignadoPor = usuario._id;
    await servicio.save();

    console.log(`✅ [ASIGNAR SERVICIO] Servicio asignado correctamente`);

    try {
      if (tecnico && tecnico.email) {
        console.log(`📧 [ASIGNAR SERVICIO] Enviando correo al técnico: ${tecnico.email}`);
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
        console.log(`✅ [ASIGNAR SERVICIO] Correo enviado al técnico`);
      }
    } catch (error) {
      console.error(`❌ [ASIGNAR SERVICIO] Error enviando correo:`, error.message);
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
// 📤 TOMAR SERVICIO - CON CLOUDINARY
// ============================================
exports.tomarServicio = async (req, res) => {
  try {
    const rolesPermitidos = ['Admin', 'Jefe', 'Coordinador', 'Tecnico'];
    if (!rolesPermitidos.includes(req.user.rol)) {
      console.log(`❌ [TOMAR SERVICIO] Rol ${req.user.rol} no autorizado`);
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

    console.log('========================================');
    console.log(`📤 [TOMAR SERVICIO] Iniciando...`);
    console.log(`📤 [TOMAR SERVICIO] Cliente: ${cliente}`);
    console.log(`📤 [TOMAR SERVICIO] Servicio: ${nombreServicio}`);
    console.log(`📤 [TOMAR SERVICIO] Imagen: ${imagen ? 'SÍ (' + imagen.substring(0, 80) + '...)' : 'NO'}`);
    console.log(`📤 [TOMAR SERVICIO] ¿Empieza con http? ${imagen?.startsWith('http')}`);
    console.log(`👤 [TOMAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    if (!cliente || !codigoIdentificador || !barrio || !direccion || !telefono ||
        !nombreServicio || !telefonos || !observaciones || !tecnicoAsignado || !jefeAsignado) {
      console.log('❌ [TOMAR SERVICIO] Faltan campos obligatorios');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      console.log('❌ [TOMAR SERVICIO] Usuario responsable no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }

    const tecnico = await User.findById(tecnicoAsignado);
    const jefe = await User.findById(jefeAsignado);

    console.log(`👤 [TOMAR SERVICIO] Técnico: ${tecnico?.nombre || 'No encontrado'}`);
    console.log(`👤 [TOMAR SERVICIO] Jefe: ${jefe?.nombre || 'No encontrado'}`);

    // ✅ CORRECCIÓN: Guardar la imagen correctamente
    let imagenGuardar = '';
    if (imagen) {
      if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
        imagenGuardar = imagen;
        console.log(`✅ [TOMAR SERVICIO] Guardando URL de Cloudinary: ${imagenGuardar.substring(0, 80)}...`);
      } 
      else if (imagen.startsWith('data:image')) {
        console.log(`⚠️ [TOMAR SERVICIO] Recibido Base64, convirtiendo a URL...`);
        imagenGuardar = imagen;
      }
      else if (imagen.includes('cloudinary.com')) {
        const urlCompleta = imagen.startsWith('http') ? imagen : `https://${imagen}`;
        imagenGuardar = urlCompleta;
        console.log(`✅ [TOMAR SERVICIO] URL corregida: ${imagenGuardar.substring(0, 80)}...`);
      }
      else {
        console.log(`⚠️ [TOMAR SERVICIO] Formato de imagen no reconocido: ${typeof imagen}`);
        imagenGuardar = '';
      }
    } else {
      console.log('⚠️ [TOMAR SERVICIO] Sin imagen');
      imagenGuardar = '';
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

    console.log(`✅ [TOMAR SERVICIO] Servicio creado: ${servicio._id}`);

    // Enviar correo al técnico
    try {
      if (tecnico && tecnico.email) {
        console.log(`📧 [TOMAR SERVICIO] Enviando correo al técnico: ${tecnico.email}`);
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
        console.log(`✅ [TOMAR SERVICIO] Correo enviado al técnico`);
      }
    } catch (error) {
      console.error(`❌ [TOMAR SERVICIO] Error enviando correo:`, error.message);
    }

    // Notificaciones push
    const mensajePush = `📋 Se ha tomado un servicio "${nombreServicio}" para el cliente ${cliente}`;

    if (tecnico) {
      try {
        await enviarNotificacionPush(tecnico._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
        console.log(`✅ [TOMAR SERVICIO] Push enviado al técnico`);
      } catch (pushError) {
        console.error('❌ [TOMAR SERVICIO] Error enviando push al técnico:', pushError);
      }
    }

    if (jefe) {
      try {
        await enviarNotificacionPush(jefe._id, {
          title: '📋 Nuevo Servicio',
          body: mensajePush,
          data: { servicioId: servicio._id.toString(), tipo: 'nuevo_servicio' },
        });
        console.log(`✅ [TOMAR SERVICIO] Push enviado al jefe`);
      } catch (pushError) {
        console.error('❌ [TOMAR SERVICIO] Error enviando push al jefe:', pushError);
      }
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
// ✅ OBTENER SERVICIOS POR ESTADO - CON LOGS DETALLADOS
// ============================================
exports.getServiciosByEstado = async (req, res) => {
  const inicio = Date.now();
  try {
    const { estado } = req.params;
    
    console.log('========================================');
    console.log('🔍 [GET SERVICIOS POR ESTADO] INICIO');
    console.log(`📋 [GET SERVICIOS POR ESTADO] Estado: ${estado}`);
    console.log(`👤 [GET SERVICIOS POR ESTADO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`🆔 [GET SERVICIOS POR ESTADO] User ID: ${req.user._id}`);
    console.log('========================================');
    
    if (!estado) {
      console.log('❌ [GET SERVICIOS POR ESTADO] Estado no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado',
      });
    }

    const estadosValidos = ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'];
    if (!estadosValidos.includes(estado)) {
      console.log(`❌ [GET SERVICIOS POR ESTADO] Estado inválido: ${estado}`);
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
      console.log(`🎯 [GET SERVICIOS POR ESTADO] Filtrando por técnico ID: ${tecnicoId}`);
    } else if (req.user.rol === 'Jefe') {
      query['jefe._id'] = req.user._id;
      console.log(`🎯 [GET SERVICIOS POR ESTADO] Filtrando por jefe ID: ${req.user._id}`);
    } else if (req.user.rol === 'Coordinador' || req.user.rol === 'Admin') {
      console.log('🎯 [GET SERVICIOS POR ESTADO] Acceso completo a todos los servicios');
    }

    console.log(`📋 [GET SERVICIOS POR ESTADO] Query: ${JSON.stringify(query, null, 2)}`);
    console.log(`📋 [GET SERVICIOS POR ESTADO] Ejecutando consulta...`);
    
    // ✅ CAMBIO: sort por _id en lugar de createdAt
    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ _id: -1 })
      .limit(500)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [GET SERVICIOS POR ESTADO] Servicios encontrados: ${servicios.length}`);
    console.log(`⏱️ [GET SERVICIOS POR ESTADO] Duración: ${duracion}ms`);
    
    if (servicios.length === 0 && req.user.rol === 'Tecnico') {
      console.log('⚠️ [GET SERVICIOS POR ESTADO] No se encontraron servicios para este técnico');
    }
    
    // Mostrar primeros 3 servicios
    if (servicios.length > 0) {
      console.log('📋 [GET SERVICIOS POR ESTADO] Primeros 3 servicios:');
      servicios.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i+1}. Cliente: ${s.cliente}, Estado: ${s.estado}, Técnico: ${s.tecnico?.nombre || 'N/A'}`);
      });
    }
    
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [GET SERVICIOS POR ESTADO] ERROR');
    console.error(`❌ [GET SERVICIOS POR ESTADO] Mensaje: ${error.message}`);
    console.error(`❌ [GET SERVICIOS POR ESTADO] Código: ${error.code}`);
    console.error(`❌ [GET SERVICIOS POR ESTADO] Código Nombre: ${error.codeName}`);
    console.error(`⏱️ [GET SERVICIOS POR ESTADO] Duración: ${duracion}ms`);
    console.error(`❌ [GET SERVICIOS POR ESTADO] Stack: ${error.stack}`);
    console.error('========================================');
    
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener servicios', 
      error: error.message 
    });
  }
};

// ============================================
// ✅ OBTENER TODOS LOS SERVICIOS - CON LOGS DETALLADOS
// ============================================
exports.getServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    let query = { activo: true };

    console.log('========================================');
    console.log('🔍 [GET SERVICIOS] INICIO');
    console.log(`👤 [GET SERVICIOS] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`🆔 [GET SERVICIOS] User ID: ${req.user._id}`);
    console.log('========================================');

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
      console.log(`🎯 [GET SERVICIOS] Técnico filtrado por estados: TOMADO, ASIGNADO, EN PROCESO`);
    } else if (req.user.rol === 'Jefe') {
      query = {
        $and: [
          { activo: true },
          { 'jefe._id': req.user._id }
        ]
      };
      console.log(`🎯 [GET SERVICIOS] Jefe filtrado por: ${req.user._id}`);
    } else if (req.user.rol === 'Admin' || req.user.rol === 'Coordinador') {
      console.log('🎯 [GET SERVICIOS] Acceso completo a todos los servicios activos');
    }

    console.log(`📋 [GET SERVICIOS] Query: ${JSON.stringify(query, null, 2)}`);
    console.log(`📋 [GET SERVICIOS] Ejecutando consulta...`);

    // ✅ CAMBIO: sort por _id
    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ _id: -1 })
      .limit(500)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [GET SERVICIOS] Servicios encontrados: ${servicios.length}`);
    console.log(`⏱️ [GET SERVICIOS] Duración: ${duracion}ms`);
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [GET SERVICIOS] ERROR');
    console.error(`❌ [GET SERVICIOS] Mensaje: ${error.message}`);
    console.error(`❌ [GET SERVICIOS] Código: ${error.code}`);
    console.error(`❌ [GET SERVICIOS] Código Nombre: ${error.codeName}`);
    console.error(`⏱️ [GET SERVICIOS] Duración: ${duracion}ms`);
    console.error(`❌ [GET SERVICIOS] Stack: ${error.stack}`);
    console.error('========================================');
    
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
    
    console.log('========================================');
    console.log(`🔍 [GET SERVICIO] Buscando servicio: ${id}`);
    console.log(`👤 [GET SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');
    
    const servicio = await Servicio.findById(id)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email');

    if (!servicio) {
      console.log('❌ [GET SERVICIO] Servicio no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    console.log(`✅ [GET SERVICIO] Servicio encontrado: ${servicio.cliente}`);

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
// EJECUTAR SERVICIO - CON LOGS DETALLADOS
// ============================================
exports.ejecutarServicio = async (req, res) => {
  const inicio = Date.now();
  try {
    const { id } = req.params;
    const { observaciones, materiales, macEquipo, macRepetidor, snReceptor } = req.body;

    console.log('========================================');
    console.log(`🔧 [EJECUTAR SERVICIO] INICIO`);
    console.log(`🔧 [EJECUTAR SERVICIO] Servicio ID: ${id}`);
    console.log(`👤 [EJECUTAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`📦 [EJECUTAR SERVICIO] Materiales raw:`, JSON.stringify(materiales, null, 2));
    console.log('========================================');

    const servicio = await Servicio.findById(id)
      .populate('responsableId', 'nombre email');

    if (!servicio) {
      console.log('❌ [EJECUTAR SERVICIO] Servicio no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado',
      });
    }

    console.log(`📋 [EJECUTAR SERVICIO] Estado actual: ${servicio.estado}`);

    if (req.user.rol === 'Tecnico') {
      const tecnicoId = req.user._id || req.user.id;
      if (servicio.tecnico && servicio.tecnico._id.toString() !== tecnicoId.toString()) {
        console.log('❌ [EJECUTAR SERVICIO] Técnico no asignado a este servicio');
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para ejecutar este servicio',
        });
      }
    }

    if (servicio.estado !== 'TOMADO' && servicio.estado !== 'PENDIENTE') {
      console.log(`❌ [EJECUTAR SERVICIO] Estado no válido: ${servicio.estado}`);
      return res.status(400).json({
        success: false,
        message: `El servicio está en estado ${servicio.estado} y no puede ser ejecutado`,
      });
    }

    const usuario = await User.findById(req.user._id);

    // ✅ Procesar materiales correctamente
    let materialesProcesados = [];
    
    console.log(`📦 [EJECUTAR SERVICIO] Tipo de materiales: ${typeof materiales}`);
    console.log(`📦 [EJECUTAR SERVICIO] ¿Es array? ${Array.isArray(materiales)}`);
    
    if (materiales && Array.isArray(materiales)) {
      console.log('📦 [EJECUTAR SERVICIO] Procesando array de materiales...');
      materialesProcesados = materiales.map((m, index) => {
        console.log(`   📦 Material ${index}:`, JSON.stringify(m));
        
        if (m.nombre) {
          return { nombre: m.nombre, cantidad: m.cantidad || 1 };
        }
        if (typeof m === 'string') {
          return { nombre: m, cantidad: 1 };
        }
        if (m._id || m.id) {
          return { nombre: m.nombre || 'Material', cantidad: m.cantidad || 1 };
        }
        return { nombre: 'Material desconocido', cantidad: 1 };
      });
      console.log('📦 [EJECUTAR SERVICIO] Materiales procesados:', JSON.stringify(materialesProcesados, null, 2));
    } else if (materiales && typeof materiales === 'object') {
      console.log('📦 [EJECUTAR SERVICIO] Procesando objeto de materiales...');
      materialesProcesados = Object.keys(materiales).map(nombre => ({
        nombre: nombre,
        cantidad: materiales[nombre] || 1
      }));
      console.log('📦 [EJECUTAR SERVICIO] Materiales procesados:', JSON.stringify(materialesProcesados, null, 2));
    } else {
      console.log('⚠️ [EJECUTAR SERVICIO] No hay materiales para procesar');
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

    const duracion = Date.now() - inicio;
    console.log(`✅ [EJECUTAR SERVICIO] Servicio ejecutado correctamente`);
    console.log(`⏱️ [EJECUTAR SERVICIO] Duración: ${duracion}ms`);
    console.log(`📦 [EJECUTAR SERVICIO] Materiales guardados: ${JSON.stringify(servicio.ejecucion.materiales)}`);

    if (materialesProcesados && materialesProcesados.length > 0) {
      const tecnicoId = servicio.tecnico?._id || req.user._id;
      console.log(`📦 [EJECUTAR SERVICIO] Actualizando bodega del técnico ${tecnicoId}...`);
      const resultadoBodega = await actualizarBodegaTecnico(tecnicoId, materialesProcesados, 'restar');
      
      if (resultadoBodega.success) {
        console.log(`✅ [EJECUTAR SERVICIO] Bodega actualizada: ${resultadoBodega.actualizados} materiales`);
      }
    }

    // Enviar correo al solicitante
    try {
      const usuarioSolicitante = servicio.responsableId;
      if (usuarioSolicitante && usuarioSolicitante.email) {
        console.log(`📧 [EJECUTAR SERVICIO] Enviando correo al solicitante: ${usuarioSolicitante.email}`);
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
        console.log(`✅ [EJECUTAR SERVICIO] Correo enviado al solicitante`);
      }
    } catch (error) {
      console.error(`❌ [EJECUTAR SERVICIO] Error enviando correo:`, error.message);
    }

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Ejecutado',
        body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue ejecutado de manera exitosa`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_ejecutado' },
      });
      console.log(`✅ [EJECUTAR SERVICIO] Push enviado`);
    } catch (pushError) {
      console.error('❌ [EJECUTAR SERVICIO] Error enviando push:', pushError);
    }

    console.log('========================================');

    res.json({
      success: true,
      message: 'Servicio ejecutado correctamente',
      data: servicio,
    });
  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [EJECUTAR SERVICIO] ERROR');
    console.error(`❌ [EJECUTAR SERVICIO] Mensaje: ${error.message}`);
    console.error(`❌ [EJECUTAR SERVICIO] Stack: ${error.stack}`);
    console.error(`⏱️ [EJECUTAR SERVICIO] Duración: ${duracion}ms`);
    console.error('========================================');
    
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

    console.log('========================================');
    console.log(`⏳ [PENDIENTE SERVICIO] Iniciando...`);
    console.log(`⏳ [PENDIENTE SERVICIO] Servicio ID: ${id}`);
    console.log(`👤 [PENDIENTE SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      console.log('❌ [PENDIENTE SERVICIO] Servicio no encontrado');
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

    console.log(`✅ [PENDIENTE SERVICIO] Servicio marcado como pendiente`);

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
        console.error('❌ [PENDIENTE SERVICIO] Error push al jefe:', pushError);
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
        console.error('❌ [PENDIENTE SERVICIO] Error push al responsable:', pushError);
      }
    }

    res.json({
      success: true,
      message: 'Servicio marcado como pendiente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [PENDIENTE SERVICIO] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// RETROALIMENTAR SERVICIO
// ============================================
exports.retroalimentarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    console.log('========================================');
    console.log(`🔄 [RETROALIMENTAR SERVICIO] Iniciando...`);
    console.log(`🔄 [RETROALIMENTAR SERVICIO] Servicio ID: ${id}`);
    console.log(`👤 [RETROALIMENTAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    const servicio = await Servicio.findById(id)
      .populate('responsableId', 'nombre email');

    if (!servicio) {
      console.log('❌ [RETROALIMENTAR SERVICIO] Servicio no encontrado');
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

    console.log(`✅ [RETROALIMENTAR SERVICIO] Servicio retroalimentado`);

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
        console.log(`✅ [RETROALIMENTAR SERVICIO] Correo enviado`);
      }
    } catch (error) {
      console.error(`❌ [RETROALIMENTAR SERVICIO] Error correo:`, error.message);
    }

    try {
      await enviarNotificacionPush(servicio.responsableId, {
        title: '✅ Servicio Retroalimentado',
        body: `El servicio "${servicio.nombreServicio}" del cliente ${servicio.cliente} fue retroalimentado de manera exitosa`,
        data: { servicioId: servicio._id.toString(), tipo: 'servicio_retroalimentado' },
      });
    } catch (pushError) {
      console.error('❌ [RETROALIMENTAR SERVICIO] Error push:', pushError);
    }

    res.json({
      success: true,
      message: 'Servicio retroalimentado correctamente',
      data: servicio,
    });
  } catch (error) {
    console.error('❌ [RETROALIMENTAR SERVICIO] Error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ============================================
// BUSCAR SERVICIOS - CON LOGS DETALLADOS
// ============================================
exports.buscarServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    const { search } = req.query;

    console.log('========================================');
    console.log(`🔍 [BUSCAR SERVICIOS] Iniciando...`);
    console.log(`🔍 [BUSCAR SERVICIOS] Término: "${search}"`);
    console.log(`👤 [BUSCAR SERVICIOS] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    if (!search) {
      console.log('❌ [BUSCAR SERVICIOS] No se proporcionó término');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

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

    console.log(`📋 [BUSCAR SERVICIOS] Query: ${JSON.stringify(query, null, 2)}`);
    console.log(`📋 [BUSCAR SERVICIOS] Ejecutando consulta...`);

    // ✅ CAMBIO: sort por _id
    const servicios = await Servicio.find(query)
      .populate('tecnico', 'nombre email')
      .populate('jefe', 'nombre email')
      .populate('responsableId', 'nombre email')
      .sort({ _id: -1 })
      .limit(500)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [BUSCAR SERVICIOS] Servicios encontrados: ${servicios.length}`);
    console.log(`⏱️ [BUSCAR SERVICIOS] Duración: ${duracion}ms`);
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios,
    });
  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [BUSCAR SERVICIOS] ERROR');
    console.error(`❌ [BUSCAR SERVICIOS] Mensaje: ${error.message}`);
    console.error(`❌ [BUSCAR SERVICIOS] Código: ${error.code}`);
    console.error(`❌ [BUSCAR SERVICIOS] Código Nombre: ${error.codeName}`);
    console.error(`⏱️ [BUSCAR SERVICIOS] Duración: ${duracion}ms`);
    console.error(`❌ [BUSCAR SERVICIOS] Stack: ${error.stack}`);
    console.error('========================================');
    
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

    console.log('========================================');
    console.log(`❌ [RECHAZAR SERVICIO] Iniciando...`);
    console.log(`❌ [RECHAZAR SERVICIO] Servicio ID: ${id}`);
    console.log(`👤 [RECHAZAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log(`📝 [RECHAZAR SERVICIO] Motivo: ${motivo || 'No especificado'}`);
    console.log('========================================');

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      console.log('❌ [RECHAZAR SERVICIO] Servicio no encontrado');
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

    console.log(`✅ [RECHAZAR SERVICIO] Servicio rechazado`);

    res.json({
      success: true,
      message: 'Servicio rechazado',
      data: servicio
    });

  } catch (error) {
    console.error('❌ [RECHAZAR SERVICIO] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// ✅ OBTENER SERVICIOS TOMADOS POR TÉCNICO - CON LOGS DETALLADOS
// ============================================
exports.getServiciosTomadosByTecnico = async (req, res) => {
  const inicio = Date.now();
  try {
    const { tecnicoId } = req.params;
    
    console.log('========================================');
    console.log(`📋 [GET SERVICIOS TOMADOS] Iniciando...`);
    console.log(`📋 [GET SERVICIOS TOMADOS] Técnico ID: ${tecnicoId}`);
    console.log(`👤 [GET SERVICIOS TOMADOS] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');
    
    if (!tecnicoId || tecnicoId === 'undefined' || tecnicoId === 'null' || tecnicoId === '') {
      console.error('❌ [GET SERVICIOS TOMADOS] ID de técnico inválido:', tecnicoId);
      return res.status(400).json({
        success: false,
        message: 'ID de técnico inválido'
      });
    }
    
    const tecnico = await User.findById(tecnicoId);
    if (!tecnico) {
      console.error('❌ [GET SERVICIOS TOMADOS] Técnico no encontrado:', tecnicoId);
      return res.status(404).json({
        success: false,
        message: 'Técnico no encontrado'
      });
    }

    console.log(`👤 [GET SERVICIOS TOMADOS] Técnico: ${tecnico.nombre} (${tecnico.email})`);
    
    // ✅ CAMBIO: sort por _id
    const servicios = await Servicio.find({
      'tecnico._id': tecnicoId,
      estado: 'TOMADO',
      activo: true
    })
    .populate('tecnico', 'nombre email')
    .populate('jefe', 'nombre email')
    .populate('responsableId', 'nombre email')
    .sort({ _id: -1 })
    .limit(500)
    .lean();
    
    const duracion = Date.now() - inicio;
    console.log(`✅ [GET SERVICIOS TOMADOS] Servicios encontrados: ${servicios.length}`);
    console.log(`⏱️ [GET SERVICIOS TOMADOS] Duración: ${duracion}ms`);
    console.log('========================================');
    
    res.json({
      success: true,
      count: servicios.length,
      data: servicios
    });
    
  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [GET SERVICIOS TOMADOS] ERROR');
    console.error(`❌ [GET SERVICIOS TOMADOS] Mensaje: ${error.message}`);
    console.error(`❌ [GET SERVICIOS TOMADOS] Código: ${error.code}`);
    console.error(`❌ [GET SERVICIOS TOMADOS] Código Nombre: ${error.codeName}`);
    console.error(`⏱️ [GET SERVICIOS TOMADOS] Duración: ${duracion}ms`);
    console.error(`❌ [GET SERVICIOS TOMADOS] Stack: ${error.stack}`);
    console.error('========================================');
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios del técnico',
      error: error.message
    });
  }
};

// ============================================
// 👤 OBTENER MIS SERVICIOS ASIGNADOS (TÉCNICO) - CON LOGS DETALLADOS
// ============================================
exports.getMisServicios = async (req, res) => {
  const inicio = Date.now();
  try {
    console.log('========================================');
    console.log(`👤 [GET MIS SERVICIOS] Iniciando...`);
    console.log(`👤 [GET MIS SERVICIOS] Usuario: ${req.user.email}`);
    console.log(`🆔 [GET MIS SERVICIOS] User ID: ${req.user._id}`);
    console.log('========================================');

    const query = {
      activo: true,
      'tecnico._id': req.user._id
    };

    console.log(`📋 [GET MIS SERVICIOS] Query: ${JSON.stringify(query, null, 2)}`);
    console.log(`📋 [GET MIS SERVICIOS] Ejecutando consulta...`);

    // ✅ CAMBIO: sort por _id
    const servicios = await Servicio.find(query)
      .sort({ _id: -1 })
      .limit(500)
      .lean();

    const duracion = Date.now() - inicio;
    console.log(`✅ [GET MIS SERVICIOS] Servicios encontrados: ${servicios.length}`);
    console.log(`⏱️ [GET MIS SERVICIOS] Duración: ${duracion}ms`);
    console.log('========================================');

    res.json({
      success: true,
      count: servicios.length,
      data: servicios
    });

  } catch (error) {
    const duracion = Date.now() - inicio;
    console.error('========================================');
    console.error('❌ [GET MIS SERVICIOS] ERROR');
    console.error(`❌ [GET MIS SERVICIOS] Mensaje: ${error.message}`);
    console.error(`❌ [GET MIS SERVICIOS] Código: ${error.code}`);
    console.error(`❌ [GET MIS SERVICIOS] Código Nombre: ${error.codeName}`);
    console.error(`⏱️ [GET MIS SERVICIOS] Duración: ${duracion}ms`);
    console.error(`❌ [GET MIS SERVICIOS] Stack: ${error.stack}`);
    console.error('========================================');
    
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
    
    console.log('========================================');
    console.log(`🗑️ [ELIMINAR SERVICIO] Iniciando...`);
    console.log(`🗑️ [ELIMINAR SERVICIO] Servicio ID: ${id}`);
    console.log(`👤 [ELIMINAR SERVICIO] Usuario: ${req.user.email} (${req.user.rol})`);
    console.log('========================================');

    const servicio = await Servicio.findOne({ _id: id, activo: true });
    if (!servicio) {
      console.log('❌ [ELIMINAR SERVICIO] Servicio no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Soft delete
    await servicio.softDelete();

    console.log(`✅ [ELIMINAR SERVICIO] Servicio eliminado (soft delete)`);

    res.json({
      success: true,
      message: 'Servicio eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ [ELIMINAR SERVICIO] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
