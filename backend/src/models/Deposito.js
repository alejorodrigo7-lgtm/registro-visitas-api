const mongoose = require('mongoose');

const DepositoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usuarioNombre: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  valor: {
    type: Number,
    required: true
  },
  cuenta: {
    type: String,
    required: true
  },
  nombreCuenta: {
    type: String,
    required: true
  },
  banco: {
    type: String,
    required: true
  },
  // Para cuentas "OTRO"
  cuentaPersonalizada: {
    numero: String,
    nombre: String,
    banco: String
  },
  esCuentaPersonalizada: {
    type: Boolean,
    default: false
  },
  // Imagen comprobante
  imagenComprobante: {
    type: String,
    required: true
  },
  // Jefes seleccionados para notificación
  jefesSeleccionados: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'],
    default: 'PENDIENTE'
  },
  observaciones: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Deposito', DepositoSchema);