const mongoose = require('mongoose');

const AsistenciaSchema = new mongoose.Schema({
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
  fechaStr: {
    type: String,
    required: true,
  },
  hora_entrada: {
    type: String,
  },
  hora_inicio_almuerzo: {
    type: String,
  },
  hora_fin_almuerzo: {
    type: String,
  },
  hora_salida: {
    type: String,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Entrada', 'Almuerzo', 'Completo'],
    default: 'Pendiente',
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
  ubicacion_salida: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: String,
    verified: Boolean,
    fakeGpsChecked: Boolean,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Asistencia', AsistenciaSchema);