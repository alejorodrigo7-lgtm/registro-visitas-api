const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  cliente: { type: String, required: true },
  direccion: { type: String, required: true },
  estado: {
    type: String,
    enum: ['Pendiente', 'Confirmado', 'Rechazado', 'Completado'],
    default: 'Pendiente',
  },
  tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fechaSolicitud: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Servicio', servicioSchema);