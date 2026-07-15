const mongoose = require('mongoose');

const asistenciaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  usuarioRol: {
    type: String,
    required: true,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  fechaStr: {
    type: String,
    required: true,
  },
  hora_entrada: {
    type: String,
    default: null,
  },
  ubicacion_entrada: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: String,
    verified: Boolean,
    fakeGpsChecked: Boolean,
  },
  hora_inicio_almuerzo: {
    type: String,
    default: null,
  },
  ubicacion_inicio_almuerzo: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: String,
    verified: Boolean,
    fakeGpsChecked: Boolean,
  },
  hora_fin_almuerzo: {
    type: String,
    default: null,
  },
  ubicacion_fin_almuerzo: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: String,
    verified: Boolean,
    fakeGpsChecked: Boolean,
  },
  hora_salida: {
    type: String,
    default: null,
  },
  ubicacion_salida: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: String,
    verified: Boolean,
    fakeGpsChecked: Boolean,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Completo', 'Incompleto'],
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

asistenciaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Asistencia', asistenciaSchema);