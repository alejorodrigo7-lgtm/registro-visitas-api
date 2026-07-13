const mongoose = require('mongoose');

const solicitudPermisoSchema = new mongoose.Schema({
  // Usuario que solicita
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  
  // Jefe al que se solicita
  jefe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jefeNombre: {
    type: String,
    required: true,
  },
  
  // Detalles de la solicitud
  tipo: {
    type: String,
    enum: ['PERMISO', 'RESESO', 'HORARIO_ESPECIAL'],
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
  },
  horaInicio: {
    type: String,
    required: true,
  },
  horaFin: {
    type: String,
    required: true,
  },
  observacion: {
    type: String,
    required: true,
  },
  
  // Estado de la solicitud
  estado: {
    type: String,
    enum: ['PENDIENTE', 'APROBADO', 'DESAPROBADO'],
    default: 'PENDIENTE',
  },
  
  // Comentario del jefe
  comentarioJefe: {
    type: String,
    default: '',
  },
  
  // Fechas
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

solicitudPermisoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SolicitudPermiso', solicitudPermisoSchema);