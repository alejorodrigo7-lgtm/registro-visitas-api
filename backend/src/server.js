require('dotenv').config();
process.env.TZ = 'America/Guayaquil';

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const { protect, authorize } = require('./middleware/auth');
const User = require('./models/User');
const bcrypt = require('bcrypt');
// ============================================
// 🔒 RATE LIMITING
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
// 📊 LOGGER
// ============================================
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 🔥 GENERAR HASH PARA 123456 AL INICIAR EL SERVIDOR
const HASH_123456 = bcrypt.hashSync('123456', 10);
console.log('🔑 Hash generado para 123456:', HASH_123456);
global.HASH_123456 = HASH_123456;

// Importar rutas
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

const app = express();

// Conectar a MongoDB
connectDB();

// Después de conectar, mostrar información de la base de datos
console.log(`📡 Base de datos conectada: ${mongoose.connection.name}`);
console.log(`📡 Host: ${mongoose.connection.host}`);

app.use(cors());

// ✅ SOLUCIÓN PARA RATE LIMITING - AGREGAR ESTA LÍNEA
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 📊 MIDDLEWARE DE LOGGING
// ============================================
app.use(logger.middleware);

// ============================================
// 🔍 RUTA DE BÚSQUEDA DE CLIENTES (DEPRECATED - USAR clienteRoutes)
// ============================================
app.get('/api/clientes/buscar/:identificador', async (req, res) => {
  try {
    const { identificador } = req.params;
    console.log(`🔍 Buscando cliente: ${identificador}`);
    
    const Cliente = require('./models/Cliente');
    const cliente = await Cliente.findOne({ identificador: identificador.trim() });
    
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
      identificador: req.params.identificador
    });
    console.error('❌ Error al buscar cliente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (DEPRECATED - USAR clienteRoutes)
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
    
    console.log(`📋 ${clientes.length} clientes encontrados`);
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    logger.errorWithContext('Error en /todos', error, {
      usuario: req.user?.email
    });
    console.error('❌ Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// RUTAS
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
// Aplicar límite general a todas las rutas API
app.use('/api', generalLimiter);

// Aplicar límites específicos
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/visitas', visitasLimiter);
app.use('/api/asistencia', asistenciaLimiter);
app.use('/api/notificaciones', notificacionesLimiter);

// ============================================
// 📲 RUTA DE PRUEBA PARA NOTIFICACIONES
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
    
    if (!user.expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene token push registrado'
      });
    }
    
    const { Expo } = require('expo-server-sdk');
    const expo = new Expo();
    
    const messages = [{
      to: user.expoPushToken,
      sound: 'default',
      title: titulo || '🔔 Prueba de Notificación',
      body: mensaje || 'Esta es una notificación de prueba',
      data: { tipo: 'test' },
    }];
    
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(ticketChunk);
    }
    
    logger.info(`Push de prueba enviado a ${user.email}`, {
      usuario: user.email,
      userId: user._id
    });
    console.log(`📲 Push de prueba enviado a ${user.email}`);
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada',
      tickets,
    });
  } catch (error) {
    logger.errorWithContext('Error en test push', error, {
      userId: req.body.userId
    });
    console.error('❌ Error en test push:', error);
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
// 📦 RUTA PARA OBTENER MATERIALES DEL TÉCNICO
// ============================================
app.get('/api/mis-materiales', protect, async (req, res) => {
  try {
    console.log('📦 === OBTENIENDO MATERIALES DEL TÉCNICO ===');
    console.log('📦 Usuario ID:', req.user._id);
    console.log('📦 Email:', req.user.email);
    console.log('📦 Rol:', req.user.rol);
    
    const Bodega = require('./models/Bodega');
    
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('📦 Bodega no encontrada, creando una vacía...');
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
      await bodega.save();
      console.log('✅ Bodega creada para técnico:', req.user._id);
    }
    
    console.log(`📦 Materiales en bodega: ${bodega.materiales?.length || 0}`);
    
    res.json({
      success: true,
      data: bodega,
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo materiales del técnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// 📊 MANEJO DE ERRORES
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// 🚀 INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
  logger.info(`📊 Logs guardados en: ${__dirname}/../logs`);
  logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🕐 Zona horaria: ${process.env.TZ || 'UTC'}`);
  logger.info(`🕐 Hora actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}`);
  logger.info(`📡 Escuchando en todas las interfaces (0.0.0.0)`);
  logger.info(`🔍 /api/clientes/buscar/:identificador`);
  logger.info(`📋 /api/clientes/todos (SIN LÍMITE)`);
  logger.info(`👤 /api/clientes (POST - Crear cliente)`);
  logger.info(`📤 /api/transferencias`);
  logger.info(`🛠️ /api/servicios`);
  logger.info(`💰 /api/cajas`);
  logger.info(`📊 /api/reportes`);
  logger.info(`📋 /api/visitas`);
  logger.info(`🏪 /api/bodegas`);
  logger.info(`📋 /api/horarios`);
  logger.info(`🗺️ /api/mapas`);
  logger.info(`📋 /api/monserrath`);
  logger.info(`📍 /api/asistencia`);
  logger.info(`📝 /api/pedir-ausencia`);
  logger.info(`📲 /api/test-transferencia-push`);
  logger.info(`📱 /api/notificaciones`);
  logger.info(`📊 /api/dashboard`);
});

// ============================================
// 📊 MANEJO DE SEÑALES
// ============================================
const gracefulShutdown = (signal) => {
  logger.info(`📥 Recibida señal ${signal}, cerrando servidor...`);
  server.close(() => {
    logger.info('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('⚠️ Forzando cierre del servidor');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.errorWithContext('Error no capturado', error);
  // No cerrar el proceso, pero loggear
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
});