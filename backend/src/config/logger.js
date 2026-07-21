const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Eliminar información sensible
    const sanitizedMeta = { ...meta };
    if (sanitizedMeta.password) delete sanitizedMeta.password;
    if (sanitizedMeta.token) delete sanitizedMeta.token;
    if (sanitizedMeta.authorization) delete sanitizedMeta.authorization;
    
    // Convertir a JSON
    const metaStr = Object.keys(sanitizedMeta).length 
      ? JSON.stringify(sanitizedMeta) 
      : '';
    
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Transport para archivos rotativos diarios
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: customFormat
});

// Transport para errores (solo errores)
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: customFormat
});

// Transport para consola (desarrollo)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { 
    service: 'ra2p-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    fileRotateTransport,
    errorRotateTransport,
    consoleTransport
  ],
  exitOnError: false
});

// Middleware para Express
logger.middleware = (req, res, next) => {
  const start = Date.now();
  
  // Capturar respuesta
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?._id,
      userEmail: req.user?.email
    });
  });

  next();
};

// Logger para errores
logger.errorWithContext = (message, error, context = {}) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  });
};

// Logger para operaciones críticas
logger.audit = (action, user, data = {}) => {
  logger.info(`AUDIT: ${action}`, {
    user: user?.email || 'anonymous',
    userId: user?._id,
    action,
    ...data
  });
};

// Logger para rendimiento
logger.performance = (operation, duration, metadata = {}) => {
  logger.info(`PERFORMANCE: ${operation}`, {
    duration: `${duration}ms`,
    ...metadata
  });
};

module.exports = logger;