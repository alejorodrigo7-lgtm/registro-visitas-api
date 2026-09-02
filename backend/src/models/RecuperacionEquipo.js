const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
  fecha: { type: Date, required: true },
  hora: { type: String, required: true },
  mac: { type: String, default: '' },
  receptor: { type: String, default: '' },
  adicionales: { type: String, default: '' },
  observaciones: { type: String, required: true },
  foto: { type: String, required: true },
  retirado: { type: Boolean, required: true },
  creadoEn: { type: Date, default: Date.now }
});

const recuperacionEquipoSchema = new mongoose.Schema({
  cliente: {
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    telefono: { type: String, required: true },
    direccion: { type: String, default: '' }
  },
  mac: { type: String, required: true },
  coordinadorAsignado: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  observacionesSubida: { type: String, default: '' },
  estado: { 
    type: String, 
    enum: ['asignada', 'no_retirado', 'retirado'], // ✅ CAMBIADO: 'no_retirado' en lugar de 'en_progreso' y 'revisar'
    default: 'asignada'
  },
  visitas: [visitaSchema],
  numeroVisitas: { type: Number, default: 0 },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fechaSubida: { type: Date, default: Date.now },
  actualizado: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecuperacionEquipo', recuperacionEquipoSchema);