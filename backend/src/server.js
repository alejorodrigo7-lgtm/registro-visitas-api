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
const desconexionRoutes = require('./routes/desconexionRoutes');
const userRoutes = require('./routes/userRoutes');
const syncRoutes = require('./routes/syncRoutes'); // 👈 NUEVA

// ...

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
app.use('/api/desconexiones', desconexionRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/sync', syncRoutes); // 👈 NUEVA