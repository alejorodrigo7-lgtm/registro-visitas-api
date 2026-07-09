require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const transferenciaRoutes = require('./routes/transferenciaRoutes');
const servicioRoutes = require('./routes/servicioRoutes');

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api/servicios', servicioRoutes);

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
// RUTAS DE AUTENTICACIÓN
// ============================================
app.use('/api/auth', authRoutes);

// ============================================
// RUTAS DE TRANSFERENCIAS
// ============================================
app.use('/api/transferencias', transferenciaRoutes);

// ============================================
// RUTA DE PRUEBA
// ============================================
app.get('/api/clientes/test', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔍 /api/clientes/buscar/:identificador`);
  console.log(`📤 /api/transferencias`);
});
