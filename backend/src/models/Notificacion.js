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
    enum: ['visita', 'servicio', 'transferencia', 'sistema', 'alerta_horario', 'SERVICIO', 'BODEGA', 'ALERTA', 'DESCONEXION', 'RECONEXION', 'ASISTENCIA', 'GENERAL', 'PRUEBA'],
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
  destinatario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  datos: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware para sincronizar usuario y destinatario
notificacionSchema.pre('save', function(next) {
  if (this.destinatario && !this.usuario) {
    this.usuario = this.destinatario;
  }
  if (this.usuario && !this.destinatario) {
    this.destinatario = this.usuario;
  }
  next();
});

module.exports = mongoose.model('Notificacion', notificacionSchema);