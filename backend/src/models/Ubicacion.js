const mongoose = require('mongoose');

const ubicacionSchema = new mongoose.Schema({
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
    default: '',
  },
  tipo: {
    type: String,
    enum: ['visita', 'servicio', 'registro'],
    default: 'visita',
  },
  fecha: {
    type: Date,
    default: Date.now,
  },
  datos: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

ubicacionSchema.index({ coordenadas: '2dsphere' });
ubicacionSchema.index({ usuario: 1 });
ubicacionSchema.index({ fecha: -1 });

module.exports = mongoose.model('Ubicacion', ubicacionSchema);