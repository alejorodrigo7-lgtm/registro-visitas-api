// src/utils/dateHelper.js
const moment = require('moment-timezone');

const TIMEZONE = 'America/Guayaquil';

/**
 * Convierte una fecha a la zona horaria de Ecuador
 * @param {string|Date} date - Fecha a convertir
 * @returns {Date} Fecha en zona horaria de Ecuador
 */
const toEcuadorTime = (date) => {
  return moment.tz(date, TIMEZONE).toDate();
};

/**
 * Obtiene el inicio del día en Ecuador
 * @param {string|Date} date - Fecha
 * @returns {Date} Inicio del día (00:00:00) en Ecuador
 */
const startOfDay = (date) => {
  return moment.tz(date, TIMEZONE).startOf('day').toDate();
};

/**
 * Obtiene el fin del día en Ecuador
 * @param {string|Date} date - Fecha
 * @returns {Date} Fin del día (23:59:59) en Ecuador
 */
const endOfDay = (date) => {
  return moment.tz(date, TIMEZONE).endOf('day').toDate();
};

/**
 * Formatea una fecha para mostrar en Ecuador
 * @param {Date} date - Fecha a formatear
 * @param {string} format - Formato deseado
 * @returns {string} Fecha formateada
 */
const formatEcuadorDate = (date, format = 'DD/MM/YYYY HH:mm:ss') => {
  return moment.tz(date, TIMEZONE).format(format);
};

/**
 * Crea un rango de fechas para consultas MongoDB
 * @param {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @param {string} field - Campo de fecha a consultar
 * @returns {Object} Objeto de consulta para MongoDB
 */
const createDateRangeQuery = (fechaInicio, fechaFin, field = 'fecha') => {
  if (!fechaInicio || !fechaFin) {
    return {};
  }
  
  const inicio = startOfDay(fechaInicio);
  const fin = endOfDay(fechaFin);
  
  return {
    [field]: { $gte: inicio, $lte: fin }
  };
};

module.exports = {
  TIMEZONE,
  toEcuadorTime,
  startOfDay,
  endOfDay,
  formatEcuadorDate,
  createDateRangeQuery
};