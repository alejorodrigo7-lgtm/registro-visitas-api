const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true, required: true },
  cliente: {
    nombre: { type: String, required: true },
    telefono: { type: String, default: '' },
    email: { type: String, default: '' },
    direccion: { type: String, default: '' }
  },
  tipo: {
    type: String,
    enum: ['Sin conexión', 'Velocidad lenta', 'Intermitencia', 'Problemas router', 'Falla TV', 'Otro'],
    required: true
  },
  zona: { type: String, default: 'No especificada' },
  descripcion: { type: String, default: '' },
  
  // ✅ ESTADO - INCLUYE TOMADO
  estado: {
    type: String,
    enum: ['Nuevo', 'Asignado', 'TOMADO', 'En Progreso', 'Resuelto', 'Cerrado'],
    default: 'Nuevo'
  },
  
  tecnicoAsignado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tecnicoNombre: { type: String, default: '' },
  
  historial: [{
    estado: { type: String },
    fecha: { type: Date, default: Date.now },
    observacion: { type: String },
    usuario: { type: String }
  }],
  
  fechaCreacion: { type: Date, default: Date.now },
  fechaAsignacion: { type: Date },
  fechaInicio: { type: Date },
  fechaResolucion: { type: Date },
  fechaCierre: { type: Date },
  
  observaciones: { type: String, default: '' },
  solucion: { type: String, default: '' },
  
  origen: { type: String, default: 'web' },
  ultimaActualizacion: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices
TicketSchema.index({ ticketId: 1 });
TicketSchema.index({ estado: 1 });
TicketSchema.index({ 'cliente.email': 1 });
TicketSchema.index({ tecnicoAsignado: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);