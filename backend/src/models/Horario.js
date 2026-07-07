const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  diasLaborales: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0 && v.every(d => d >= 0 && d <= 6);
      },
      message: 'Días laborales inválidos',
    },
  },
  horaInicio: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
  },
  horaFin: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
  },
  intervaloAlerta: {
    type: Number,
    required: true,
    min: 5,
    max: 1440,
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

horarioSchema.index({ asignadoA: 1, activo: 1 });
horarioSchema.index({ creadoPor: 1, activo: 1 });

module.exports = mongoose.model('Horario', horarioSchema);