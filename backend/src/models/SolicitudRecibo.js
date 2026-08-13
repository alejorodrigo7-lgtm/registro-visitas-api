const mongoose = require('mongoose');

const solicitudReciboSchema = new mongoose.Schema({
  cliente: {
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    direccion: { type: String },
    telefono: { type: String }
  },
  observaciones: { type: String },
  estado: {
    type: String,
    enum: ['SOLICITADO', 'APROBADO', 'DENEGADO'],
    default: 'SOLICITADO'
  },
  archivo: {
    nombre: { type: String },
    url: { type: String },
    publicId: { type: String }
  },
  solicitadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String }
  },
  aprobadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    fecha: { type: Date }
  },
  denegadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    fecha: { type: Date }
  },
  fechaSolicitud: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
});

solicitudReciboSchema.index({ 'cliente.nombre': 'text', 'cliente.codigo': 'text' });
solicitudReciboSchema.index({ estado: 1 });
solicitudReciboSchema.index({ fechaSolicitud: -1 });

module.exports = mongoose.model('SolicitudRecibo', solicitudReciboSchema);