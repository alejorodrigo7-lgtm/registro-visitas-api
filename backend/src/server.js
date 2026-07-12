require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { protect } = require('./middleware/auth');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const transferenciaRoutes = require('./routes/transferenciaRoutes');
const servicioRoutes = require('./routes/servicioRoutes');
const cajaRoutes = require('./routes/cajaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const visitaRoutes = require('./routes/visitaRoutes');
const bodegaRoutes = require('./routes/bodegaRoutes');

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
  console.log(`🔍 /api/clientes/buscar/:identificador`);
  console.log(`📋 /api/clientes/todos`);
  console.log(`📤 /api/transferencias`);
  console.log(`🛠️ /api/servicios`);
  console.log(`💰 /api/cajas`);
  console.log(`📊 /api/reportes`);
  console.log(`📋 /api/visitas`);
  console.log(`🏪 /api/bodegas`);
});