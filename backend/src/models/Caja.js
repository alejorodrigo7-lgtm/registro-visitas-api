const mongoose = require('mongoose');

const cajaSchema = new mongoose.Schema({
  zona: {
    type: String,
    enum: ['TOLA', 'MAGDALENA', 'CHILIBULO'],
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now,
  },
  saldoInicial: {
    type: Number,
    required: true,
    default: 0,
  },
  cobroOficina: {
    type: Number,
    default: 0,
  },
  cobroCoordinador: {
    type: Number,
    default: 0,
  },
  egresos: [{
    descripcion: { type: String, required: true },
    valor: { type: Number, required: true },
    imagen: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
  saldoFinal: {
    type: Number,
    default: 0,
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  estado: {
    type: String,
    enum: ['ABIERTA', 'CERRADA'],
    default: 'ABIERTA',
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

cajaSchema.index({ zona: 1, fecha: 1 });
cajaSchema.index({ fecha: 1 });

module.exports = mongoose.model('Caja', cajaSchema);