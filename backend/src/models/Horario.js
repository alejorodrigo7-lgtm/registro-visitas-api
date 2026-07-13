const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creadoPorNombre: {
    type: String,
    required: true,
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  asignadoNombre: {
    type: String,
    required: true,
  },
  diasLaborales: {
    type: [Number],
    required: true,
    // ✅ REMOVER EL VALIDADOR QUE CAUSA EL ERROR
  },
  horaInicio: {
    type: String,
    required: true,
  },
  horaFin: {
    type: String,
    required: true,
  },
  intervaloAlerta: {
    type: Number,
    required: true,
    default: 30,
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

horarioSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Horario', horarioSchema);