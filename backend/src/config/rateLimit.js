const rateLimit = require('express-rate-limit');
const logger = require('./logger');

// ============================================
// 🔒 CONFIGURACIÓN DE RATE LIMITING
// ============================================

// 1. Límite general para todas las rutas
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 peticiones por IP
  message: {
    success: false,
    message: 'Demasiadas peticiones. Por favor, espera 15 minutos.'
  },
  handler: (req, res) => {
    logger.warn('Rate limit superado', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas peticiones. Por favor, espera 15 minutos.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Límite estricto para login (5 intentos)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  handler: (req, res) => {
    logger.warn('Login rate limit superado', {
      ip: req.ip,
      email: req.body.email
    });
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No cuenta logins exitosos
});

// 3. Límite para registro de usuarios (3 intentos)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
  },
  handler: (req, res) => {
    logger.warn('Register rate limit superado', {
      ip: req.ip,
      email: req.body.email
    });
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Límite para creación de visitas (20 por minuto)
const visitasLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 visitas
  message: {
    success: false,
    message: 'Demasiadas visitas registradas. Espera un momento.'
  },
  handler: (req, res) => {
    logger.warn('Visitas rate limit superado', {
      ip: req.ip,
      usuario: req.user?.email
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas visitas registradas. Espera un momento.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Solo cuenta peticiones exitosas
});

// 5. Límite para asistencia (10 por minuto)
const asistenciaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 registros
  message: {
    success: false,
    message: 'Demasiados registros de asistencia. Espera un momento.'
  },
  handler: (req, res) => {
    logger.warn('Asistencia rate limit superado', {
      ip: req.ip,
      usuario: req.user?.email
    });
    res.status(429).json({
      success: false,
      message: 'Demasiados registros de asistencia. Espera un momento.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 6. Límite para notificaciones (5 por minuto)
const notificacionesLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 notificaciones
  message: {
    success: false,
    message: 'Demasiadas notificaciones enviadas. Espera un momento.'
  },
  handler: (req, res) => {
    logger.warn('Notificaciones rate limit superado', {
      ip: req.ip,
      usuario: req.user?.email
    });
    res.status(429).json({
      success: false,
      message: 'Demasiadas notificaciones enviadas. Espera un momento.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  loginLimiter,
  registerLimiter,
  visitasLimiter,
  asistenciaLimiter,
  notificacionesLimiter,
};