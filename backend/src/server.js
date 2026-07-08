require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// RUTAS DE PRUEBA
// ============================================
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

app.get('/api/auth/login', (req, res) => {
  res.json({ message: 'Ruta de login temporal' });
});

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
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔍 /api/clientes/buscar/:identificador`);
});