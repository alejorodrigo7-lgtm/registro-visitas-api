// backend/src/models/Venta.js
const mongoose = require('mongoose');

const VentaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  usuario: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  cedulaDelantera: { type: String, required: true }, // Base64
  cedulaTrasera: { type: String, required: true }, // Base64
  fotoDomicilio: { type: String, required: true }, // Base64
  selfieCedula: { type: String, required: true }, // Base64
  direccionCompleta: { type: String, required: true },
  telefono1: { type: String, required: true },
  telefono2: { type: String, required: true },
  email: { type: String, required: true },
  plan: { type: String, required: true },
  ingresada: { type: Boolean, default: false },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venta', VentaSchema);