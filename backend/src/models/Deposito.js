const mongoose = require('mongoose');

const depositoSchema = new mongoose.Schema({
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
  nombre: {
    type: String,
    required: true,
  },
  cuenta: {
    type: String,
    enum: ['4738408100 MARY CORDOBA', '27230428 ISABELA CORDOBA', '27212641 ISABELA CORDOBA', 'OTROS'],
    required: true,
  },
  observaciones: {
    type: String,
    default: '',
  },
  imagen: {
    type: String,
    default: '',
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  estado: {
    type: String,
    enum: ['SUBIDO', 'REVISADO'],
    default: 'SUBIDO',
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

depositoSchema.index({ zona: 1, fecha: 1 });
depositoSchema.index({ fecha: 1 });
depositoSchema.index({ cuenta: 1 });

module.exports = mongoose.model('Deposito', depositoSchema);