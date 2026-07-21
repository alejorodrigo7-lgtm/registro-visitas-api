const mongoose = require('mongoose');

const ClienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
  },
  identificador: {
    type: String,
    required: true,
    unique: true,
  },
  barrio: {
    type: String,
    required: true,
  },
  direccion: {
    type: String,
    required: true,
  },
  telefono: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Cliente', ClienteSchema);