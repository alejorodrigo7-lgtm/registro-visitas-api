const mongoose = require('mongoose');

const productoReciboSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['INTERNET', 'TELEVISION'], required: true },
  codigo: { type: String, required: true },
  valor: { type: Number, required: true, min: 0 },
}, { _id: false });

const reciboImpresionSchema = new mongoose.Schema({
  numeroRC: { type: String, required: true, unique: true, index: true },
  clienteNombre: { type: String, required: true },
  clienteCedula: { type: String, required: true, index: true },
  clienteDireccion: { type: String, default: '' },
  fecha: { type: Date, required: true },
  productos: {
    type: [productoReciboSchema],
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: 'El recibo debe tener al menos un producto',
    },
  },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  formaPago: {
    type: String,
    enum: ['EFECTIVO COBRADOR', 'EFECTIVO CAJA', 'TRANSFERENCIA', 'DEPOSITO'],
    default: 'EFECTIVO COBRADOR',
  },
  digitadorUsuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  digitadorNombre: { type: String, required: true },
  digitadorRol: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

reciboImpresionSchema.index({ createdAt: -1 });
reciboImpresionSchema.index({ clienteCedula: 1, createdAt: -1 });

module.exports = mongoose.model('ReciboImpresion', reciboImpresionSchema);