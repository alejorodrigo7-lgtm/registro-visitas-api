const mongoose = require('mongoose');

const UbicacionSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  usuarioNombre: {
    type: String,
    required: true,
  },
  coordenadas: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  direccion: {
    type: String,
  },
  tipo: {
    type: String,
    enum: ['visita', 'asistencia', 'manual'],
    default: 'manual',
  },
  datos: {
    type: mongoose.Schema.Types.Mixed,
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
});

UbicacionSchema.index({ coordenadas: '2dsphere' });

module.exports = mongoose.model('Ubicacion', UbicacionSchema);