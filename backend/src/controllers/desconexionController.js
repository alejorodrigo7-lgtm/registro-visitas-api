// src/controllers/desconexionController.js
const DesconexionReconexion = require('../models/DesconexionReconexion');
const User = require('../models/User');
const { enviarNotificacionPush } = require('../services/pushService');

// ============================================
// 📋 CREAR DESCONEXIÓN O RECONEXIÓN
// ============================================
exports.crear = async (req, res) => {
  try {
    const { tipo, cliente, codigoCliente, fecha, observaciones } = req.body;

    if (!tipo || !cliente || !codigoCliente || !fecha) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
      });
    }

    const nuevoRegistro = new DesconexionReconexion({
      tipo,
      cliente,
      codigoCliente,
      fecha: new Date(fecha),
      observaciones: observaciones || '',
      creadoPor: req.user._id,
      creadoPorNombre: req.user.nombre,
      estado: 'PENDIENTE',
    });

    await nuevoRegistro.save();

    // 📱 Enviar notificación push al usuario que creó
    try {
      await enviarNotificacionPush(req.user._id, {
        title: `📋 ${tipo === 'DESCONEXION' ? 'Desconexión' : 'Reconexión'} Registrada`,
        body: `Se ha registrado una ${tipo === 'DESCONEXION' ? 'desconexión' : 'reconexión'} para el cliente ${cliente}`,
        data: {
          tipo: 'desconexion',
          id: nuevoRegistro._id.toString(),
        },
      });
    } catch (pushError) {
      console.error('Error enviando push:', pushError);
    }

    res.status(201).json({
      success: true,
      message: `${tipo === 'DESCONEXION' ? 'Desconexión' : 'Reconexión'} registrada correctamente`,
      data: nuevoRegistro,
    });
  } catch (error) {
    console.error('❌ Error en crear:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER TODOS (con orden: más antiguo primero)
// ============================================
exports.obtenerTodos = async (req, res) => {
  try {
    const registros = await DesconexionReconexion.find()
      .sort({ fecha: 1, createdAt: 1 }) // Más antiguo primero
      .populate('creadoPor', 'nombre email')
      .populate('realizadoPor', 'nombre email')
      .populate('anuladoPor', 'nombre email');

    res.json({
      success: true,
      count: registros.length,
      data: registros,
    });
  } catch (error) {
    console.error('❌ Error en obtenerTodos:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 📋 OBTENER PENDIENTES (para ejecución)
// ============================================
exports.obtenerPendientes = async (req, res) => {
  try {
    const pendientes = await DesconexionReconexion.find({
      estado: 'PENDIENTE',
    })
      .sort({ fecha: 1, createdAt: 1 })
      .populate('creadoPor', 'nombre email');

    res.json({
      success: true,
      count: pendientes.length,
      data: pendientes,
    });
  } catch (error) {
    console.error('❌ Error en obtenerPendientes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// 🔍 BUSCAR (por nombre o código)
// ============================================
exports.buscar = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un término de búsqueda',
      });
    }

    const query = {
      $or: [
        { cliente: { $regex: search, $options: 'i' } },
        { codigoCliente: { $regex: search, $options: 'i' } },
      ],
    };

    const registros = await DesconexionReconexion.find(query)
      .sort({ fecha: 1, createdAt: 1 })
      .populate('creadoPor', 'nombre email')
      .populate('realizadoPor', 'nombre email')
      .populate('anuladoPor', 'nombre email');

    res.json({
      success: true,
      count: registros.length,
      data: registros,
    });
  } catch (error) {
    console.error('❌ Error en buscar:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ✅ REALIZAR (ejecutar)
// ============================================
exports.realizar = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await DesconexionReconexion.findById(id);
    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado',
      });
    }

    if (registro.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `El registro ya está en estado ${registro.estado}`,
      });
    }

    registro.estado = 'REALIZADO';
    registro.realizadoPor = req.user._id;
    registro.realizadoPorNombre = req.user.nombre;
    registro.fechaRealizado = new Date();
    registro.updatedAt = new Date();

    await registro.save();

    // 📱 Notificar al creador
    try {
      const creador = await User.findById(registro.creadoPor);
      if (creador) {
        await enviarNotificacionPush(creador._id, {
          title: `✅ ${registro.tipo === 'DESCONEXION' ? 'Desconexión' : 'Reconexión'} Realizada`,
          body: `El cliente ${registro.cliente} fue ${registro.tipo === 'DESCONEXION' ? 'desconectado' : 'reconectado'} por ${req.user.nombre}`,
          data: {
            tipo: 'desconexion_realizada',
            id: registro._id.toString(),
          },
        });
      }
    } catch (pushError) {
      console.error('Error enviando push:', pushError);
    }

    res.json({
      success: true,
      message: 'Registro realizado correctamente',
      data: registro,
    });
  } catch (error) {
    console.error('❌ Error en realizar:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// ❌ ANULAR
// ============================================
exports.anular = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await DesconexionReconexion.findById(id);
    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado',
      });
    }

    if (registro.estado !== 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        message: `El registro ya está en estado ${registro.estado}`,
      });
    }

    registro.estado = 'ANULADO';
    registro.anuladoPor = req.user._id;
    registro.anuladoPorNombre = req.user.nombre;
    registro.fechaAnulado = new Date();
    registro.updatedAt = new Date();

    await registro.save();

    // 📱 Notificar al creador
    try {
      const creador = await User.findById(registro.creadoPor);
      if (creador) {
        await enviarNotificacionPush(creador._id, {
          title: `❌ ${registro.tipo === 'DESCONEXION' ? 'Desconexión' : 'Reconexión'} Anulada`,
          body: `La ${registro.tipo === 'DESCONEXION' ? 'desconexión' : 'reconexión'} del cliente ${registro.cliente} fue anulada por ${req.user.nombre}`,
          data: {
            tipo: 'desconexion_anulada',
            id: registro._id.toString(),
          },
        });
      }
    } catch (pushError) {
      console.error('Error enviando push:', pushError);
    }

    res.json({
      success: true,
      message: 'Registro anulado correctamente',
      data: registro,
    });
  } catch (error) {
    console.error('❌ Error en anular:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};