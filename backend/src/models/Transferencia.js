const mongoose = require('mongoose');

const transferenciaSchema = new mongoose.Schema({
  responsable: {
    type: String,
    required: true,
  },
  responsableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fechaTransferencia: {
    type: Date,
    required: true,
  },
  codigoIdentificador: {
    type: String,
    required: true,
    trim: true,
  },
  nombreUsuario: {
    type: String,
    required: true,
  },
  numeroDocumento: {
    type: String,
    required: true,
    trim: true,
  },
  valor: {
    type: Number,
    required: true,
    min: 0,
  },
  zonaSector: {
    type: String,
    enum: ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'],
    required: true,
  },
  barrio: {
    type: String,
    required: true,
  },
  bancoCuenta: {
    type: String,
    required: true,
  },
  soporte: {
    type: String,
    required: true,
  },
  estado: {
    type: String,
    enum: ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'],
    default: 'SUBIDA',
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

transferenciaSchema.index({ codigoIdentificador: 1 });
transferenciaSchema.index({ nombreUsuario: 1 });
transferenciaSchema.index({ estado: 1 });

module.exports = mongoose.model('Transferencia', transferenciaSchema);