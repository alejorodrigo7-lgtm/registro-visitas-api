const mongoose = require('mongoose');

const DesconexionSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['DESCONEXION', 'RECONEXION'],
    required: true,
  },
  cliente: {
    type: String,
    required: true,
  },
  codigoCliente: {
    type: String,
    default: '',
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  observaciones: {
    type: String,
    default: '',
  },
  estado: {
    type: String,
    enum: ['PENDIENTE', 'EJECUTADO', 'RECHAZADO'],
    default: 'PENDIENTE',
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  ejecutadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  ejecutadoPorNombre: {
    type: String,
  },
  observacionEjecucion: {
    type: String,
    default: '',
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

module.exports = mongoose.model('Desconexion', DesconexionSchema);
