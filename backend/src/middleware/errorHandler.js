const logger = require('../config/logger');

// Manejo de errores global
const errorHandler = (err, req, res, next) => {
  // Log del error con contexto
  logger.errorWithContext('Error no manejado', err, {
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userId: req.user?._id,
    userEmail: req.user?.email
  });

  // Determinar código de error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  // Respuesta al cliente (sin detalles en producción)
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Ha ocurrido un error en el servidor' 
      : message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Middleware para rutas no encontradas
const notFoundHandler = (req, res) => {
  logger.warn('Ruta no encontrada', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};