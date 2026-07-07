const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  // Mapeo directo con tu CSV
  nombre: {
    type: String,
    required: [true, 'Nombre es obligatorio'],
  },
  identificador: {
    type: String,
    required: [true, 'Identificador es obligatorio'],
    unique: true,
    index: true,
  },
  barrio: {
    type: String,
    required: [true, 'Barrio es obligatorio'],
  },
  direccion: {
    type: String,
    required: [true, 'Dirección es obligatoria'],
  },
  telefono: {
    type: String,
    required: [true, 'Teléfono es obligatorio'],
  },
  // Campos adicionales (opcionales)
  email: {
    type: String,
    default: '',
  },
  activo: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now,
  },
});

// Índice para búsquedas rápidas
clienteSchema.index({ identificador: 1 });
clienteSchema.index({ nombre: 1 });

module.exports = mongoose.model('Cliente', clienteSchema);