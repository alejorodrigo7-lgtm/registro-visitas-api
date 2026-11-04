const mongoose = require('mongoose');

const zonaSchema = new mongoose.Schema({
  zona: { type: String, required: true },
  cobrosVisitas: { type: Number, default: 0 },
  transferencias: { type: Number, default: 0 },
  oficinaTola: { type: Number, default: 0 },
  otrasOficinas: { type: Number, default: 0 },
  totalZona: { type: Number, default: 0 },
}, { _id: false });

const ingresoMensualManualSchema = new mongoose.Schema({
  mes: { type: Number, required: true, min: 1, max: 12 },
  anio: { type: Number, required: true },
  zonas: { type: [zonaSchema], default: [] },
  totalGeneral: { type: Number, default: 0 },
  editadoPor: {
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String, default: '' },
  },
  fechaEdicion: { type: Date, default: Date.now },
}, { timestamps: true });

ingresoMensualManualSchema.index({ mes: 1, anio: 1 }, { unique: true });

module.exports = mongoose.model('IngresoMensualManual', ingresoMensualManualSchema);