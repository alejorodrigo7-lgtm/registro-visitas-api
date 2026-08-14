require('dotenv').config();
process.env.TZ = 'America/Guayaquil';

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { protect, authorize } = require('./middleware/auth');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

// ============================================
// RATE LIMITING
// ============================================
const {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  visitasLimiter,
  asistenciaLimiter,
  notificacionesLimiter,
} = require('./config/rateLimit');

// ============================================
// LOGGER
// ============================================
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// GENERAR HASH PARA 123456 AL INICIAR EL SERVIDOR
const HASH_123456 = bcrypt.hashSync('123456', 10);
console.log('Hash generado para 123456:', HASH_123456);
global.HASH_123456 = HASH_123456;

// GENERAR HASH UNICO PARA REGISTRO
const SALT = bcrypt.genSaltSync(10);
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', SALT);
console.log('Hash por defecto para registro:', DEFAULT_PASSWORD_HASH);
global.DEFAULT_PASSWORD_HASH = DEFAULT_PASSWORD_HASH;

// ============================================
// IMPORTAR RUTAS
// ============================================
const authRoutes = require('./routes/authRoutes');
const transferenciaRoutes = require('./routes/transferenciaRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const visitaRoutes = require('./routes/visitaRoutes');
const bodegaRoutes = require('./routes/bodegaRoutes');
const horarioRoutes = require('./routes/horarioRoutes');
const mapaRoutes = require('./routes/mapaRoutes');
const monserrathRoutes = require('./routes/monserrathRoutes');
const asistenciaRoutes = require('./routes/asistenciaRoutes');
const pedirAusenciaRoutes = require('./routes/pedirAusenciaRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const notificationRoutes = require('./routes/notificacionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const desconexionRoutes = require('./routes/desconexionRoutes');
const userRoutes = require('./routes/userRoutes');
const syncRoutes = require('./routes/syncRoutes');
const solicitudReciboRoutes = require('./routes/solicitudReciboRoutes');
const recuperacionRoutes = require('./routes/recuperacionRoutes');

// ✅ NUEVO: IMPORTAR RUTAS DE VENTAS
const ventaRoutes = require('./routes/ventaRoutes');

// ============================================
// CREAR APP
// ============================================
const app = express();

// ============================================
// CONECTAR A MONGODB
// ============================================
connectDB();

console.log(`Base de datos conectada: ${mongoose.connection.name}`);
console.log(`Host: ${mongoose.connection.host}`);

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors());
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger.middleware);

// ============================================
// RUTA DE BUSQUEDA DE CLIENTES (por codigo o nombre)
// ============================================
app.get('/api/clientes/buscar/:termino', async (req, res) => {
  try {
    const { termino } = req.params;
    console.log(`Buscando cliente: ${termino}`);
    
    const Cliente = require('./models/Cliente');
    
    const cliente = await Cliente.findOne({
      $or: [
        { identificador: termino.trim() },
        { nombre: { $regex: termino.trim(), $options: 'i' } }
      ]
    });
    
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    
    res.json({
      success: true,
      data: {
        nombre: cliente.nombre,
        identificador: cliente.identificador,
        barrio: cliente.barrio,
        direccion: cliente.direccion,
        telefono: cliente.telefono,
      }
    });
  } catch (error) {
    logger.errorWithContext('Error al buscar cliente', error, {
      termino: req.params.termino
    });
    console.error('Error al buscar cliente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// OBTENER TODOS LOS CLIENTES
// ============================================
app.get('/api/clientes/todos', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { nombre: { $regex: searchRegex } },
          { identificador: { $regex: searchRegex } },
          { barrio: { $regex: searchRegex } },
          { direccion: { $regex: searchRegex } },
          { telefono: { $regex: searchRegex } }
        ]
      };
    }
    
    const Cliente = require('./models/Cliente');
    const clientes = await Cliente.find(query).sort({ nombre: 1 });
    
    console.log(`${clientes.length} clientes encontrados`);
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    logger.errorWithContext('Error en /todos', error, {
      usuario: req.user?.email
    });
    console.error('Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// RUTAS DE LA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/transferencias', transferenciaRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/cajas', cajaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/visitas', visitaRoutes);
app.use('/api/bodegas', bodegaRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/mapas', mapaRoutes);
app.use('/api/monserrath', monserrathRoutes);
app.use('/api/asistencia', asistenciaRoutes);
app.use('/api/pedir-ausencia', pedirAusenciaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/notificaciones', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/desconexiones', desconexionRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/solicitudes-recibo', solicitudReciboRoutes);
app.use('/api/recuperacion', recuperacionRoutes);

// ✅ NUEVO: RUTAS DE VENTAS
app.use('/api/ventas', ventaRoutes);

// ============================================
// RATE LIMITING
// ============================================
app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/visitas', visitasLimiter);
app.use('/api/asistencia', asistenciaLimiter);
app.use('/api/notificaciones', notificacionesLimiter);

// ============================================
// RUTA DE PRUEBA PARA NOTIFICACIONES
// ============================================
app.post('/api/test-transferencia-push', protect, async (req, res) => {
  try {
    const { userId, titulo, mensaje } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'El userId es obligatorio'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    if (!user.pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene token push registrado'
      });
    }
    
    const fcmService = require('./services/fcmService');
    const result = await fcmService.sendFCMNotification(
      user.pushToken,
      titulo || 'Prueba de Notificacion',
      mensaje || 'Esta es una notificacion de prueba',
      { tipo: 'test' }
    );
    
    logger.info(`Push de prueba enviado a ${user.email}`, {
      usuario: user.email,
      userId: user._id,
      success: result.success
    });
    console.log(`Push de prueba enviado a ${user.email}`);
    
    res.json({
      success: result.success,
      message: result.success ? 'Notificacion de prueba enviada' : 'Error enviando notificacion',
      data: result
    });
  } catch (error) {
    logger.errorWithContext('Error en test push', error, {
      userId: req.body.userId
    });
    console.error('Error en test push:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Servidor funcionando correctamente' });
});

// ============================================
// RUTA PARA OBTENER MATERIALES DEL TECNICO
// ============================================
app.get('/api/mis-materiales', protect, async (req, res) => {
  try {
    console.log('=== OBTENIENDO MATERIALES DEL TECNICO ===');
    console.log('Usuario ID:', req.user._id);
    console.log('Email:', req.user.email);
    console.log('Rol:', req.user.rol);
    
    const Bodega = require('./models/Bodega');
    
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('Bodega no encontrada, creando una vacia...');
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
      await bodega.save();
      console.log('Bodega creada para tecnico:', req.user._id);
    }
    
    console.log(`Materiales en bodega: ${bodega.materiales?.length || 0}`);
    
    res.json({
      success: true,
      data: bodega,
    });
    
  } catch (error) {
    console.error('Error obteniendo materiales del tecnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor iniciado en puerto ${PORT}`);
  logger.info(`Logs guardados en: ${__dirname}/../logs`);
  logger.info(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Zona horaria: ${process.env.TZ || 'UTC'}`);
  logger.info(`Hora actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}`);
  logger.info(`Escuchando en todas las interfaces (0.0.0.0)`);
  logger.info(`/api/auth`);
  logger.info(`/api/transferencias`);
  logger.info(`/api/servicios`);
  logger.info(`/api/cajas`);
  logger.info(`/api/reportes`);
  logger.info(`/api/visitas`);
  logger.info(`/api/bodegas`);
  logger.info(`/api/horarios`);
  logger.info(`/api/mapas`);
  logger.info(`/api/monserrath`);
  logger.info(`/api/asistencia`);
  logger.info(`/api/pedir-ausencia`);
  logger.info(`/api/clientes`);
  logger.info(`/api/notificaciones`);
  logger.info(`/api/dashboard`);
  logger.info(`/api/desconexiones`);
  logger.info(`/api/usuarios`);
  logger.info(`/api/sync`);
  logger.info(`/api/recuperacion`);
  // ✅ NUEVO: LOG DE VENTAS
  logger.info(`/api/ventas`);
});

// ============================================
// MANEJO DE SEÑALES
// ============================================
const gracefulShutdown = (signal) => {
  logger.info(`Recibida señal ${signal}, cerrando servidor...`);
  server.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Forzando cierre del servidor');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.errorWithContext('Error no capturado', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
});