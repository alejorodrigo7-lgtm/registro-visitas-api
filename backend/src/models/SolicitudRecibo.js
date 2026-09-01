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
  // ✅ CAMBIADO: De 'archivo' (objeto único) a 'archivos' (array de hasta 3)
  archivos: [{
    nombre: { type: String, required: true },
    url: { type: String, required: true },
    publicId: { type: String, default: '' }
  }],
  // ✅ Mantenemos el campo antiguo por compatibilidad (opcional)
  // Se puede eliminar después de migrar
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
  // ✅ NUEVO: Motivo de denegación
  motivoDenegacion: { type: String, default: '' },
  fechaSolicitud: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
}, { timestamps: true });

// Índices existentes
solicitudReciboSchema.index({ 'cliente.nombre': 'text', 'cliente.codigo': 'text' });
solicitudReciboSchema.index({ estado: 1 });
solicitudReciboSchema.index({ fechaSolicitud: -1 });

// ✅ NUEVO: Índice para búsquedas por archivos
solicitudReciboSchema.index({ 'archivos.nombre': 1 });

module.exports = mongoose.model('SolicitudRecibo', solicitudReciboSchema);