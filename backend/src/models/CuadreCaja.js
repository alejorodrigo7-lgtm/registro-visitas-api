const mongoose = require('mongoose');

const cuadreCajaSchema = new mongoose.Schema({
  zona: {
    type: String,
    enum: ['TOLA', 'CHILIBULO', 'MAGDALENA'],
    required: true,
  },
  fecha: {
    type: String, // formato: YYYY-MM-DD
    required: true,
  },
  saldoInicial: {
    type: Number,
    default: 0,
  },
  saldoDisponible: {
    type: Number,
    default: 0,
  },
  ingresos: [{
    tipo: {
      type: String,
      enum: ['OFICINA', 'EFECTIVO COORDINADOR', 'OTRO'],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    concepto: {
      type: String,
      default: '',
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  pagos: [{
    motivo: {
      type: String,
      enum: ['PAGO PROVEEDOR', 'PAGO PERSONAL', 'PAGO SERVICIOS', 'OTROS'],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    descripcion: {
      type: String,
      default: '',
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cerrado: {
    type: Boolean,
    default: false,
  },
  fechaCierre: {
    type: Date,
  },
  enviadoCorreo: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Índice compuesto para evitar duplicados por zona y fecha
cuadreCajaSchema.index({ zona: 1, fecha: 1 }, { unique: true });

module.exports = mongoose.model('CuadreCaja', cuadreCajaSchema);