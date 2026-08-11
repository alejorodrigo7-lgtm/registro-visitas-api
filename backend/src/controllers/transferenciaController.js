const Transferencia = require('../models/Transferencia');
const User = require('../models/User');
const Notificacion = require('../models/Notificacion');
const pushService = require('../services/pushService');

// ============================================
// 📲 ENVIAR NOTIFICACIÓN DE TRANSFERENCIA
// ============================================
const enviarNotificacionTransferencia = async (usuarioId, titulo, mensaje, data = {}) => {
  try {
    console.log(`📲 [NOTIF] Enviando notificación a usuario ${usuarioId}`);
    console.log(`📲 [NOTIF] Título: ${titulo}`);
    
    // Guardar en base de datos
    await Notificacion.create({
      titulo,
      mensaje,
      tipo: 'transferencia',
      usuario: usuarioId,
      datos: data,
    });
    console.log(`✅ [NOTIF] Notificación guardada en BD`);

    // Enviar push
    try {
      console.log(`📲 [NOTIF] Intentando enviar push...`);
      await pushService.enviarNotificacionPush(usuarioId, {
        title: titulo,
        body: mensaje,
        data: { ...data, tipo: 'transferencia' },
      });
      console.log(`✅ [NOTIF] Push enviado correctamente`);
    } catch (pushError) {
      console.error(`❌ [NOTIF] Error al enviar push:`, pushError.message);
    }

    console.log(`✅ [NOTIF] Notificación completada para usuario ${usuarioId}`);
  } catch (error) {
    console.error(`❌ [NOTIF] Error en enviarNotificacionTransferencia:`, error.message);
    console.error(`📚 [NOTIF] Stack:`, error.stack);
  }
};

// ============================================
// 📤 SUBIR TRANSFERENCIA
// ============================================
exports.subirTransferencia = async (req, res) => {
  console.log('📤 [1] subirTransferencia - INICIO');
  console.log(`📤 [2] Body: ${JSON.stringify(req.body)}`);
  console.log(`📤 [3] Usuario: ${req.user?.email}`);

  try {
    const {
      fechaTransferencia,
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor,
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante,
    } = req.body;

    // Validar campos
    console.log('📤 [4] Validando campos...');
    if (!fechaTransferencia || !codigoIdentificador || !nombreUsuario || 
        !numeroDocumento || !valor || !zonaSector || !barrio || 
        !bancoCuenta || !soporte) {
      console.log('❌ [5] Error: Campos faltantes');
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }
    console.log('✅ [6] Campos válidos');

    // Buscar responsable
    console.log(`📤 [7] Buscando responsable: ${req.user._id}`);
    const responsable = await User.findById(req.user._id);
    if (!responsable) {
      console.log('❌ [8] Responsable no encontrado');
      return res.status(404).json({
        success: false,
        message: 'Usuario responsable no encontrado',
      });
    }
    console.log(`✅ [9] Responsable encontrado: ${responsable.nombre}`);

    // Crear transferencia
    console.log('📤 [10] Creando transferencia...');
    const transferencia = await Transferencia.create({
      responsable: responsable.nombre,
      responsableId: req.user._id,
      fechaTransferencia: new Date(fechaTransferencia),
      codigoIdentificador,
      nombreUsuario,
      numeroDocumento,
      valor: parseFloat(valor),
      zonaSector,
      barrio,
      bancoCuenta,
      soporte,
      imagenComprobante: imagenComprobante || null,
      estado: 'SUBIDA',
    });
    console.log(`✅ [11] Transferencia creada con ID: ${transferencia._id}`);

    // Notificar a Admins y Jefes
    console.log('📤 [12] Buscando Admins y Jefes...');
    const adminsJefes = await User.find({
      rol: { $in: ['Admin', 'Jefe'] },
    });
    console.log(`✅ [13] Encontrados ${adminsJefes.length} Admins/Jefes`);

    console.log('📤 [14] Enviando notificaciones...');
    for (const usuario of adminsJefes) {
      await enviarNotificacionTransferencia(
        usuario._id,
        '💰 Nueva Transferencia',
        `Nueva transferencia de ${nombreUsuario} por $${parseFloat(valor).toFixed(2)}`,
        {
          transferenciaId: transferencia._id,
          nombreUsuario,
          valor: parseFloat(valor),
          estado: 'SUBIDA',
        }
      );
    }
    console.log(`✅ [15] Notificaciones enviadas a ${adminsJefes.length} usuarios`);

    console.log('✅ [16] TRANSFERENCIA SUBIDA CON ÉXITO');
    res.status(201).json({
      success: true,
      message: 'Transferencia subida correctamente',
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ [17] Error en subirTransferencia:', error.message);
    console.error('📚 [18] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER TODAS LAS TRANSFERENCIAS
// ============================================
exports.getTransferencias = async (req, res) => {
  console.log('📋 [1] getTransferencias - INICIO');
  
  try {
    const { estado } = req.query;
    console.log(`📋 [2] Estado filtro: ${estado || 'todos'}`);
    console.log(`📋 [3] Usuario: ${req.user?.email}, Rol: ${req.user?.rol}`);
    
    let query = {};
    if (estado) {
      query.estado = estado;
      console.log(`📋 [4] Query con estado: ${JSON.stringify(query)}`);
    }

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
      console.log(`📋 [5] Query con restricción de usuario: ${JSON.stringify(query)}`);
    }

    console.log('📋 [6] Ejecutando consulta...');
    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });
    
    console.log(`✅ [7] Encontradas ${transferencias.length} transferencias`);
    console.log('📋 [8] FIN getTransferencias');

    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    console.error('❌ [9] Error en getTransferencias:', error.message);
    console.error('📚 [10] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER UNA TRANSFERENCIA
// ============================================
exports.getTransferencia = async (req, res) => {
  console.log(`📋 [1] getTransferencia - ID: ${req.params.id}`);
  
  try {
    const { id } = req.params;
    
    console.log('📋 [2] Buscando transferencia...');
    const transferencia = await Transferencia.findById(id)
      .populate('responsableId', 'nombre email rol');

    if (!transferencia) {
      console.log('❌ [3] Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }

    console.log(`✅ [4] Transferencia encontrada: ${transferencia._id}`);
    res.json({
      success: true,
      data: transferencia,
    });
  } catch (error) {
    console.error('❌ [5] Error en getTransferencia:', error.message);
    console.error('📚 [6] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ✅ CONFIRMAR TRANSFERENCIA
// ============================================
exports.confirmarTransferencia = async (req, res) => {
  console.log('✅ [1] confirmarTransferencia - INICIO');
  console.log(`✅ [2] ID: ${req.params.id}`);
  console.log(`✅ [3] Estado: ${req.body.estado}`);

  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['CONFIRMADA', 'DENEGADA'].includes(estado)) {
      console.log('❌ [4] Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser CONFIRMADA o DENEGADA',
      });
    }

    console.log('✅ [5] Estado válido');
    console.log('✅ [6] Buscando transferencia...');
    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ [7] Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }
    console.log(`✅ [8] Transferencia encontrada, estado actual: ${transferencia.estado}`);

    if (transferencia.estado !== 'SUBIDA') {
      console.log(`❌ [9] Error: Estado actual ${transferencia.estado} no es SUBIDA`);
      return res.status(400).json({
        success: false,
        message: `La transferencia ya está en estado ${transferencia.estado}`,
      });
    }

    console.log('✅ [10] Actualizando estado...');
    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ [11] Transferencia actualizada a ${estado}`);

    // Notificar al usuario
    console.log('📲 [12] Enviando notificación al usuario...');
    const titulo = estado === 'CONFIRMADA' ? '✅ Transferencia Confirmada' : '❌ Transferencia Denegada';
    const mensaje = estado === 'CONFIRMADA' 
      ? `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido confirmada`
      : `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido denegada`;

    await enviarNotificacionTransferencia(
      transferencia.responsableId,
      titulo,
      mensaje,
      {
        transferenciaId: transferencia._id,
        nombreUsuario: transferencia.nombreUsuario,
        valor: transferencia.valor,
        estado: transferencia.estado,
      }
    );
    console.log('✅ [13] Notificación enviada');
    console.log('✅ [14] CONFIRMAR TRANSFERENCIA COMPLETADO');

    res.json({
      success: true,
      message: `Transferencia ${estado === 'CONFIRMADA' ? 'confirmada' : 'denegada'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ [15] Error en confirmarTransferencia:', error.message);
    console.error('📚 [16] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 💰 INGRESAR TRANSFERENCIA
// ============================================
exports.ingresarTransferencia = async (req, res) => {
  console.log('💰 [1] ingresarTransferencia - INICIO');
  console.log(`💰 [2] ID: ${req.params.id}`);
  console.log(`💰 [3] Estado: ${req.body.estado}`);

  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['INGRESADA', 'EN_REVISION'].includes(estado)) {
      console.log('❌ [4] Error: Estado inválido');
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser INGRESADA o EN_REVISION',
      });
    }

    console.log('✅ [5] Estado válido');
    console.log('💰 [6] Buscando transferencia...');
    const transferencia = await Transferencia.findById(id);
    if (!transferencia) {
      console.log('❌ [7] Transferencia no encontrada');
      return res.status(404).json({
        success: false,
        message: 'Transferencia no encontrada',
      });
    }
    console.log(`💰 [8] Transferencia encontrada, estado actual: ${transferencia.estado}`);

    if (transferencia.estado !== 'CONFIRMADA') {
      console.log(`❌ [9] Error: Estado actual ${transferencia.estado} no es CONFIRMADA`);
      return res.status(400).json({
        success: false,
        message: `La transferencia debe estar CONFIRMADA. Estado actual: ${transferencia.estado}`,
      });
    }

    console.log('💰 [10] Actualizando estado...');
    transferencia.estado = estado;
    transferencia.updatedAt = new Date();
    await transferencia.save();
    console.log(`✅ [11] Transferencia actualizada a ${estado}`);

    // Notificar al usuario
    console.log('📲 [12] Enviando notificación al usuario...');
    const titulo = estado === 'INGRESADA' ? '💰 Transferencia Ingresada' : '📋 Transferencia en Revisión';
    const mensaje = estado === 'INGRESADA'
      ? `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} ha sido ingresada`
      : `Tu transferencia de ${transferencia.nombreUsuario} por $${transferencia.valor.toFixed(2)} está en revisión`;

    await enviarNotificacionTransferencia(
      transferencia.responsableId,
      titulo,
      mensaje,
      {
        transferenciaId: transferencia._id,
        nombreUsuario: transferencia.nombreUsuario,
        valor: transferencia.valor,
        estado: transferencia.estado,
      }
    );
    console.log('✅ [13] Notificación enviada');
    console.log('✅ [14] INGRESAR TRANSFERENCIA COMPLETADO');

    res.json({
      success: true,
      message: `Transferencia ${estado === 'INGRESADA' ? 'ingresada' : 'en revisión'} correctamente`,
      data: transferencia,
    });
  } catch (error) {
    console.log('❌ [15] Error en ingresarTransferencia:', error.message);
    console.error('📚 [16] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 🔍 BUSCAR TRANSFERENCIAS PARA REVISIÓN
// ============================================
exports.buscarTransferenciasRevision = async (req, res) => {
  console.log('🔍 [1] buscarTransferenciasRevision - INICIO');
  
  try {
    const { search } = req.query;
    console.log(`🔍 [2] Término de búsqueda: "${search}"`);

    if (!search) {
      console.log('❌ [3] Error: Sin término de búsqueda');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

    const query = {
      $or: [
        { nombreUsuario: { $regex: search, $options: 'i' } },
        { codigoIdentificador: { $regex: search, $options: 'i' } },
      ],
    };
    console.log(`🔍 [4] Query: ${JSON.stringify(query)}`);

    if (['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
      console.log(`🔍 [5] Query con restricción de usuario`);
    }

    console.log('🔍 [6] Ejecutando consulta...');
    const transferencias = await Transferencia.find(query)
      .populate('responsableId', 'nombre email rol')
      .sort({ createdAt: -1 });

    console.log(`✅ [7] Encontradas ${transferencias.length} transferencias`);
    res.json({
      success: true,
      count: transferencias.length,
      data: transferencias,
    });
  } catch (error) {
    console.error('❌ [8] Error en buscarTransferenciasRevision:', error.message);
    console.error('📚 [9] Stack:', error.stack);
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// 📋 OBTENER TRANSFERENCIAS POR ESTADO (VERSIÓN CON LOGS DETALLADOS)
// ============================================
exports.getTransferenciasByEstado = async (req, res) => {
  console.log('🔍 [ESTADO-1] getTransferenciasByEstado - INICIO');
  
  try {
    const { estado } = req.params;
    console.log(`🔍 [ESTADO-2] Estado recibido: "${estado}"`);
    console.log(`🔍 [ESTADO-3] Usuario: ${req.user?.email}, Rol: ${req.user?.rol}`);
    console.log(`🔍 [ESTADO-4] User ID: ${req.user?._id}`);

    // 1. Validar estado
    console.log('🔍 [ESTADO-5] Validando estado...');
    if (!estado) {
      console.log('❌ [ESTADO-6] Estado vacío');
      return res.status(400).json({
        success: false,
        message: 'Se requiere un estado'
      });
    }

    const estadosValidos = ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'];
    if (!estadosValidos.includes(estado)) {
      console.log(`❌ [ESTADO-7] Estado inválido: ${estado}`);
      console.log(`📋 [ESTADO-8] Estados válidos: ${estadosValidos.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`
      });
    }
    console.log('✅ [ESTADO-9] Estado válido');

    // 2. Construir query
    console.log('🔍 [ESTADO-10] Construyendo query...');
    let query = { estado };
    console.log(`🔍 [ESTADO-11] Query inicial: ${JSON.stringify(query)}`);

    if (req.user && ['Tecnico', 'Coordinador'].includes(req.user.rol)) {
      query.responsableId = req.user._id;
      console.log(`🔍 [ESTADO-12] Query con restricción de usuario: ${JSON.stringify(query)}`);
    }

    // 3. Ejecutar consulta SIN populate primero
    console.log('🔍 [ESTADO-13] Ejecutando consulta (SIN populate)...');
    let transferencias = [];
    try {
      transferencias = await Transferencia.find(query).sort({ createdAt: -1 });
      console.log(`✅ [ESTADO-14] Transferencias encontradas (SIN populate): ${transferencias.length}`);
    } catch (findError) {
      console.error('❌ [ESTADO-15] Error en find():', findError.message);
      console.error('📚 [ESTADO-16] Stack:', findError.stack);
      // Si falla find, devolver error
      return res.status(500).json({
        success: false,
        message: 'Error al buscar transferencias',
        error: findError.message
      });
    }

    // Si no hay transferencias
    if (transferencias.length === 0) {
      console.log('ℹ️ [ESTADO-17] No hay transferencias con este estado');
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No hay transferencias con este estado'
      });
    }

    // 4. Verificar responsables
    console.log('🔍 [ESTADO-18] Verificando IDs de responsables...');
    let idsInvalidos = 0;
    let idsValidos = 0;
    const idsUnicos = new Set();
    
    transferencias.forEach((t, index) => {
      const idStr = t.responsableId ? t.responsableId.toString() : 'null';
      console.log(`🔍 [ESTADO-19] Transferencia ${index}: ID=${t._id}, responsableId=${idStr}`);
      if (!t.responsableId) {
        idsInvalidos++;
      } else {
        idsValidos++;
        idsUnicos.add(t.responsableId.toString());
      }
    });
    
    console.log(`📊 [ESTADO-20] IDs válidos: ${idsValidos}, IDs inválidos: ${idsInvalidos}`);
    console.log(`📊 [ESTADO-21] IDs únicos: ${idsUnicos.size}`);

    // 5. Intentar populate
    console.log('🔍 [ESTADO-22] Ejecutando populate...');
    let transferenciasConPopulate = [];
    
    try {
      transferenciasConPopulate = await Transferencia.find(query)
        .populate({
          path: 'responsableId',
          select: 'nombre email rol',
        })
        .sort({ createdAt: -1 });
      console.log(`✅ [ESTADO-23] Populate completado: ${transferenciasConPopulate.length}`);
      console.log(`🔍 [ESTADO-24] Ejemplo de populate: ${JSON.stringify(transferenciasConPopulate[0]?.responsableId || 'null')}`);
    } catch (populateError) {
      console.error('❌ [ESTADO-25] Error en populate:', populateError.message);
      console.error('📚 [ESTADO-26] Stack:', populateError.stack);
      // Si falla populate, usar datos sin populate
      console.log('ℹ️ [ESTADO-27] Usando datos SIN populate como fallback');
      transferenciasConPopulate = transferencias;
    }

    console.log('✅ [ESTADO-28] Enviando respuesta exitosa');
    console.log(`📊 [ESTADO-29] Total: ${transferenciasConPopulate.length}`);
    
    res.json({
      success: true,
      count: transferenciasConPopulate.length,
      data: transferenciasConPopulate,
      // Datos de diagnóstico (opcional)
      _debug: {
        totalEncontradas: transferencias.length,
        idsValidos,
        idsInvalidos,
        idsUnicos: idsUnicos.size,
        populateExitoso: transferenciasConPopulate.length > 0
      }
    });

  } catch (error) {
    console.error('❌ [ESTADO-30] ERROR GENERAL en getTransferenciasByEstado:', error.message);
    console.error('📚 [ESTADO-31] Stack completo:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al obtener transferencias por estado',
      error: error.message,
      stack: error.stack
    });
  }
};

console.log('✅ Controlador de transferencias cargado correctamente');