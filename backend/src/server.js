require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const visitaRoutes = require('./routes/visitaRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const horarioRoutes = require('./routes/horarioRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const transferenciaRoutes = require('./routes/transferenciaRoutes');

const app = express();

// Conectar a MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API Registro Visitas funcionando 🚀',
    version: '1.0.0',
    status: 'online',
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/visitas', visitaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/transferencias', transferenciaRoutes);

// Iniciar cron job
require('./services/cronService');

// Manejador de errores 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 API disponible en http://localhost:${PORT}/api`);
});