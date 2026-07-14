const mongoose = require('mongoose');

const monserrathSchema = new mongoose.Schema({
  cliente: {
    type: String,
    required: true,
  },
  identificador: {
    type: String,
    required: true,
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
  ubicacion: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  // 🔥 CAMPO PARA BÚSQUEDA POR FECHA EXACTA (YYYY-MM-DD)
  fechaStr: {
    type: String,
    required: true,
  },
  hora_llegada: {
    type: String,
    required: true,
  },
  hora_salida: {
    type: String,
    required: true,
  },
  material_usado: {
    type: String,
    default: '',
  },
  observaciones: {
    type: String,
    default: '',
  },
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tecnicoNombre: {
    type: String,
    required: true,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Completado', 'Cancelado'],
    default: 'Pendiente',
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

monserrathSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Monserrath', monserrathSchema);