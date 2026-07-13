const mongoose = require('mongoose');

const kmzSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
    default: '',
  },
  archivo: {
    type: String,
    required: true, // Base64 del archivo KMZ
  },
  tipo: {
    type: String,
    enum: ['kmz', 'kml'],
    default: 'kmz',
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creadoPorNombre: {
    type: String,
    required: true,
  },
  activo: {
    type: Boolean,
    default: true,
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

kmzSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('KMZ', kmzSchema);