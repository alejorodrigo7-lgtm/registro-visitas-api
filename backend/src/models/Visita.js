const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
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
  tipo: {
    type: String,
    enum: ['Visita', 'Cobro', 'Instalación', 'Mantenimiento', 'Revisión', 'Otros', 'Servicio Técnico'],
    required: true,
  },
  monto: {
    type: Number,
    default: 0,
  },
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
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ubicacion: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    registradaEn: { type: Date, default: Date.now }
  },
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

visitaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Visita', visitaSchema);