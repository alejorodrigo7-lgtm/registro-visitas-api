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
    enum: ['visita', 'servicio', 'transferencia', 'sistema', 'alerta_horario', 'SERVICIO', 'BODEGA', 'ALERTA'],
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
  // ✅ NUEVO CAMPO: data (alias de datos para compatibilidad)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// ✅ Índices para mejorar el rendimiento
notificacionSchema.index({ usuario: 1, fecha: -1 });
notificacionSchema.index({ usuario: 1, leida: 1 });

// ✅ Middleware para sincronizar data y datos
notificacionSchema.pre('save', function(next) {
  // Si se envía data pero no datos, copiar
  if (this.data && !this.datos) {
    this.datos = this.data;
  }
  // Si se envía datos pero no data, copiar
  if (this.datos && !this.data) {
    this.data = this.datos;
  }
  next();
});

module.exports = mongoose.model('Notificacion', notificacionSchema);