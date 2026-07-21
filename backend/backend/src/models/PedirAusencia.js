const mongoose = require('mongoose');

const PedirAusenciaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  fechaStr: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ['Enfermedad', 'Personal', 'Vacaciones', 'Otro'],
    required: true,
  },
  motivo: {
    type: String,
    required: true,
  },
  observaciones: {
    type: String,
  },
  documento: {
    type: String,
  },
  estado: {
    type: String,
    enum: ['Pendiente', 'Aprobado', 'Rechazado'],
    default: 'Pendiente',
  },
  aprobadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  aprobadoPorNombre: {
    type: String,
  },
  fecha_aprobacion: {
    type: Date,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PedirAusencia', PedirAusenciaSchema);