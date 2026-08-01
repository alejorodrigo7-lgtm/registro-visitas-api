// src/models/DesconexionReconexion.js
const mongoose = require('mongoose');

const DesconexionReconexionSchema = new mongoose.Schema({
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
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
  },
  observaciones: {
    type: String,
    default: '',
  },
  estado: {
    type: String,
    enum: ['PENDIENTE', 'REALIZADO', 'ANULADO'],
    default: 'PENDIENTE',
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creadoPorNombre: {
    type: String,
    required: true,
  },
  realizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  realizadoPorNombre: {
    type: String,
  },
  fechaRealizado: {
    type: Date,
  },
  anuladoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  anuladoPorNombre: {
    type: String,
  },
  fechaAnulado: {
    type: Date,
  },
  notificacionEnviada: {
    type: Boolean,
    default: false,
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

module.exports = mongoose.model('DesconexionReconexion', DesconexionReconexionSchema);