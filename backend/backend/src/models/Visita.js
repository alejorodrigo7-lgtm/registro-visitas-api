const mongoose = require('mongoose');

const VisitaSchema = new mongoose.Schema({
  cliente: {
    type: String,
    required: true,
  },
  identificador: {
    type: String,
    required: true,
  },
  barrio: {
    type: String,
    required: true,
  },
  direccion: {
    type: String,
    required: true,
  },
  telefono: {
    type: String,
    required: true,
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
    required: true,
  },
  foto: {
    type: String,
    default: '',
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Completada', 'Cancelada'],
    default: 'Pendiente',
  },
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tecnicoNombre: {
    type: String,
  },
  ubicacion: {
    latitude: Number,
    longitude: Number,
    address: String,
    registradaEn: Date,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Visita', VisitaSchema);