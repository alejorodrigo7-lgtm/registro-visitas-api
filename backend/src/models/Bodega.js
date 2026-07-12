const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  unidad: { type: String, required: true },
  cantidad: { type: Number, required: true, default: 0 },
  minimo: { type: Number, default: 0 },
  fechaAsignacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now },
});

const bodegaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: { type: String, required: true },
  materiales: [materialSchema],
  estado: {
    type: String,
    enum: ['ACTIVA', 'INACTIVA'],
    default: 'ACTIVA',
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

bodegaSchema.index({ nombre: 1 });
bodegaSchema.index({ usuario: 1 });
bodegaSchema.index({ estado: 1 });

bodegaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Bodega', bodegaSchema);