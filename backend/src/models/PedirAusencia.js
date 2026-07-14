const mongoose = require('mongoose');

const pedirAusenciaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  usuarioRol: {
    type: String,
    required: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  fechaStr: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ['Entrada', 'Inicio Almuerzo', 'Fin Almuerzo', 'Salida'],
    required: true,
  },
  motivo: {
    type: String,
    required: true,
  },
  observaciones: {
    type: String,
    default: '',
  },
  documento: {
    type: String,
    default: null,
  },
  documentoNombre: {
    type: String,
    default: null,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Aprobado', 'Rechazado'],
    default: 'Pendiente',
  },
  aprobadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  aprobadoPorNombre: {
    type: String,
    default: null,
  },
  fechaAprobacion: {
    type: Date,
    default: null,
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

pedirAusenciaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PedirAusencia', pedirAusenciaSchema);