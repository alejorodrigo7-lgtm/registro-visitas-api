const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
  },
  mensaje: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ['visita', 'servicio', 'transferencia', 'sistema', 'alerta_horario'],
    required: true,
  },
  leida: {
    type: Boolean,
    default: false,
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  datos: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notificacion', notificacionSchema);