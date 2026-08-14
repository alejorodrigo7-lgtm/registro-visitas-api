// backend/src/models/ReporteVenta.js
const mongoose = require('mongoose');

const ReporteVentaSchema = new mongoose.Schema({
  fechaVenta: { type: Date, required: true },
  codigo: { type: String, required: true, unique: true },
  cedula: { type: String, required: true },
  usuario: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  producto: { 
    type: String, 
    enum: ['TV', 'Internet', 'Duo'],
    required: true 
  },
  valorPagar: { type: Number, required: true },
  pagado: { type: Boolean, default: false },
  pagoInfo: {
    valorPagado: Number,
    responsable: String,
    formaPago: { 
      type: String, 
      enum: ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'] 
    },
    fechaPago: Date
  },
  ventaAsociada: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Venta' 
  },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReporteVenta', ReporteVentaSchema);