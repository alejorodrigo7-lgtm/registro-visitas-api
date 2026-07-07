const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
  cliente: {
    type: String,
    required: [true, 'Cliente es obligatorio'],
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
    enum: ['Visita', 'Cobro', 'Instalación', 'Mantenimiento', 'Revisión', 'Otros'],
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
  fecha: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Visita', visitaSchema);