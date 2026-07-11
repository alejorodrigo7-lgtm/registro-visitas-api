const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
  // ============================================
  // DATOS DEL CLIENTE
  // ============================================
  cliente: {
    type: String,
    required: [true, 'Cliente es obligatorio'],
  },
  identificador: {
    type: String,
    required: [true, 'Identificador es obligatorio'],
  },
  barrio: {
    type: String,
    required: [true, 'Barrio es obligatorio'],
  },
  direccion: {
    type: String,
    required: [true, 'Dirección es obligatoria'],
  },
  telefono: {
    type: String,
    required: [true, 'Teléfono es obligatorio'],
  },
  codigoCliente: {
    type: String,
  },
  
  // ============================================
  // TIPO DE VISITA
  // ============================================
  tipo: {
    type: String,
    enum: ['Visita', 'Cobro', 'Instalación', 'Mantenimiento', 'Revisión', 'Otros', 'Servicio Técnico'],
    required: true,
  },
  monto: {
    type: Number,
    default: 0,
  },
  
  // ============================================
  // OBSERVACIONES, FOTO Y ESTADO
  // ============================================
  observaciones: {
    type: String,
    required: [true, 'Observaciones son obligatorias'],
  },
  foto: {
    type: String,
  },
  estado: {
    type: String,
    enum: ['Completada', 'Pendiente', 'Cancelada'],
    default: 'Pendiente',
  },
  
  // ============================================
  // TÉCNICO
  // ============================================
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // ============================================
  // 📍 UBICACIÓN (NUEVO)
  // ============================================
  ubicacion: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    registradaEn: { type: Date, default: Date.now }
  },
  
  // ============================================
  // FECHAS
  // ============================================
  fecha: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================
// MIDDLEWARE PARA ACTUALIZAR updatedAt
// ============================================
visitaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Visita', visitaSchema);