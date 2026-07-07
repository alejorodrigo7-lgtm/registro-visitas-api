const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  // Usuario que crea el horario (Admin o Jefe)
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Usuario al que se le asigna el horario
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Días laborales (0=Domingo, 1=Lunes, ... 6=Sábado)
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
  // Hora de inicio (formato: "HH:MM")
  horaInicio: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
  },
  // Hora de fin (formato: "HH:MM")
  horaFin: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
  },
  // Intervalo de alerta en minutos (ej: 60 = cada hora)
  intervaloAlerta: {
    type: Number,
    required: true,
    min: 5,
    max: 1440, // 24 horas
  },
  // Activo o inactivo
  activo: {
    type: Boolean,
    default: true,
  },
  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Última actualización
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Índices para búsquedas rápidas
horarioSchema.index({ asignadoA: 1, activo: 1 });
horarioSchema.index({ creadoPor: 1, activo: 1 });

module.exports = mongoose.model('Horario', horarioSchema);