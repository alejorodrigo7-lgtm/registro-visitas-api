require('dotenv').config();
process.env.TZ = 'America/Guayaquil';

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { protect, authorize } = require('./middleware/auth');
const User = require('./models/User');

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

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// 🔍 RUTA DE BÚSQUEDA DE CLIENTES
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
    console.error('❌ Error al buscar cliente:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 📋 OBTENER TODOS LOS CLIENTES (CON BÚSQUEDA)
// ============================================
app.get('/api/clientes/todos', protect, async (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
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
    const clientes = await Cliente.find(query)
      .sort({ nombre: 1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: clientes.length,
      data: clientes,
    });
  } catch (error) {
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
    
    console.log(`📲 Push de prueba enviado a ${user.email}`);
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada',
      tickets,
    });
  } catch (error) {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Escuchando en todas las interfaces (0.0.0.0)`);
  console.log(`🕐 Zona horaria: ${process.env.TZ || 'UTC'}`);
  console.log(`🔍 /api/clientes/buscar/:identificador`);
  console.log(`📋 /api/clientes/todos`);
  console.log(`📤 /api/transferencias`);
  console.log(`🛠️ /api/servicios`);
  console.log(`💰 /api/cajas`);
  console.log(`📊 /api/reportes`);
  console.log(`📋 /api/visitas`);
  console.log(`🏪 /api/bodegas`);
  console.log(`📋 /api/horarios`);
  console.log(`🗺️ /api/mapas`);
  console.log(`📲 /api/test-transferencia-push`);
});