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
// ðŸ”’ RATE LIMITING
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
// ðŸ“Š LOGGER
// ============================================
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ðŸ”¥ GENERAR HASH PARA 123456 AL INICIAR EL SERVIDOR
const HASH_123456 = bcrypt.hashSync('123456', 10);
console.log('ðŸ”‘ Hash generado para 123456:', HASH_123456);
global.HASH_123456 = HASH_123456;

// âœ… GENERAR HASH ÃšNICO PARA REGISTRO
const SALT = bcrypt.genSaltSync(10);
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', SALT);
console.log('ðŸ”‘ Hash por defecto para registro:', DEFAULT_PASSWORD_HASH);
global.DEFAULT_PASSWORD_HASH = DEFAULT_PASSWORD_HASH;

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

// âœ… NUEVO: RUTAS DE DESCONEXIONES
const desconexionRoutes = require('./routes/desconexionRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

// Conectar a MongoDB
connectDB();

// DespuÃ©s de conectar, mostrar informaciÃ³n de la base de datos
console.log(`ðŸ“¡ Base de datos conectada: ${mongoose.connection.name}`);
console.log(`ðŸ“¡ Host: ${mongoose.connection.host}`);

app.use(cors());

// âœ… SOLUCIÃ“N PARA RATE LIMITING
app.set('trust proxy', 1);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// ðŸ“Š MIDDLEWARE DE LOGGING
// ============================================
app.use(logger.middleware);

// ============================================
// ðŸ” RUTA DE BÃšSQUEDA DE CLIENTES
// ============================================
app.get('/api/clientes/buscar/:identificador', async (req, res) => {
  try {
    const { identificador } = req.params;
    console.log(`ðŸ” Buscando cliente: ${identificador}`);
    
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
    console.error('âŒ Error al buscar cliente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ðŸ“‹ OBTENER TODOS LOS CLIENTES
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
    
    console.log(`ðŸ“‹ ${clientes.length} clientes encontrados`);
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
    logger.errorWithContext('Error en /todos', error, {
      usuario: req.user?.email
    });
    console.error('âŒ Error en /todos:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ðŸ“‹ RUTAS
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

// âœ… NUEVO: RUTAS DE DESCONEXIONES
app.use('/api/desconexiones', desconexionRoutes);
  app.use('/api/usuarios', userRoutes);

app.use('/api', generalLimiter);

// Aplicar lÃ­mites especÃ­ficos
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/visitas', visitasLimiter);
app.use('/api/asistencia', asistenciaLimiter);
app.use('/api/notificaciones', notificacionesLimiter);

// ============================================
// ðŸ“² RUTA DE PRUEBA PARA NOTIFICACIONES
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
      title: titulo || 'ðŸ”” Prueba de NotificaciÃ³n',
      body: mensaje || 'Esta es una notificaciÃ³n de prueba',
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
    console.log(`ðŸ“² Push de prueba enviado a ${user.email}`);
    
    res.json({
      success: true,
      message: 'NotificaciÃ³n de prueba enviada',
      tickets,
    });
  } catch (error) {
    logger.errorWithContext('Error en test push', error, {
      userId: req.body.userId
    });
    console.error('âŒ Error en test push:', error);
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
// ðŸ“¦ RUTA PARA OBTENER MATERIALES DEL TÃ‰CNICO
// ============================================
app.get('/api/mis-materiales', protect, async (req, res) => {
  try {
    console.log('ðŸ“¦ === OBTENIENDO MATERIALES DEL TÃ‰CNICO ===');
    console.log('ðŸ“¦ Usuario ID:', req.user._id);
    console.log('ðŸ“¦ Email:', req.user.email);
    console.log('ðŸ“¦ Rol:', req.user.rol);
    
    const Bodega = require('./models/Bodega');
    
    let bodega = await Bodega.findOne({ usuario: req.user._id });
    
    if (!bodega) {
      console.log('ðŸ“¦ Bodega no encontrada, creando una vacÃ­a...');
      bodega = new Bodega({
        usuario: req.user._id,
        usuarioNombre: req.user.nombre || req.user.email,
        nombre: `Bodega de ${req.user.nombre || req.user.email}`,
        materiales: [],
        estado: 'ACTIVA',
        creadoPor: req.user._id,
      });
      await bodega.save();
      console.log('âœ… Bodega creada para tÃ©cnico:', req.user._id);
    }
    
    console.log(`ðŸ“¦ Materiales en bodega: ${bodega.materiales?.length || 0}`);
    
    res.json({
      success: true,
      data: bodega,
    });
    
  } catch (error) {
    console.error('âŒ Error obteniendo materiales del tÃ©cnico:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ðŸ“Š MANEJO DE ERRORES
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// ðŸš€ INICIAR SERVIDOR
// ============================================
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`ðŸš€ Servidor iniciado en puerto ${PORT}`);
  logger.info(`ðŸ“Š Logs guardados en: ${__dirname}/../logs`);
  logger.info(`ðŸŒ Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`ðŸ• Zona horaria: ${process.env.TZ || 'UTC'}`);
  logger.info(`ðŸ• Hora actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}`);
  logger.info(`ðŸ“¡ Escuchando en todas las interfaces (0.0.0.0)`);
  logger.info(`ðŸ” /api/clientes/buscar/:identificador`);
  logger.info(`ðŸ“‹ /api/clientes/todos (SIN LÃMITE)`);
  logger.info(`ðŸ‘¤ /api/clientes (POST - Crear cliente)`);
  logger.info(`ðŸ“¤ /api/transferencias`);
  logger.info(`ðŸ› ï¸ /api/servicios`);
  logger.info(`ðŸ’° /api/cajas`);
  logger.info(`ðŸ“Š /api/reportes`);
  logger.info(`ðŸ“‹ /api/visitas`);
  logger.info(`ðŸª /api/bodegas`);
  logger.info(`ðŸ“‹ /api/horarios`);
  logger.info(`ðŸ—ºï¸ /api/mapas`);
  logger.info(`ðŸ“‹ /api/monserrath`);
  logger.info(`ðŸ“ /api/asistencia`);
  logger.info(`ðŸ“ /api/pedir-ausencia`);
  logger.info(`ðŸ“² /api/test-transferencia-push`);
  logger.info(`ðŸ“± /api/notificaciones`);
  logger.info(`ðŸ“Š /api/dashboard`);
  // âœ… NUEVO: LOG DE RUTAS DE DESCONEXIONES
  logger.info(`ðŸ”Œ /api/desconexiones`);
});

// ============================================
// ðŸ“Š MANEJO DE SEÃ‘ALES
// ============================================
const gracefulShutdown = (signal) => {
  logger.info(`ðŸ“¥ Recibida seÃ±al ${signal}, cerrando servidor...`);
  server.close(() => {
    logger.info('âœ… Servidor cerrado correctamente');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('âš ï¸ Forzando cierre del servidor');
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
