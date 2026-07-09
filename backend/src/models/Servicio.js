const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  // Datos del cliente
  cliente: {
    type: String,
    required: true,
  },
  codigoIdentificador: {
    type: String,
    required: true,
  },
  barrio: {
    type: String,
    required: true,
  },
  direccion: {
    type: String,
    required: true,
  },
  telefono: {
    type: String,
    required: true,
  },

  // Datos del servicio
  nombreServicio: {
    type: String,
    enum: ['INSTALACION DUO', 'INSTALACION INTERNET', 'INSTALACION TV', 'SIN INTERNET (FOCO ROJO)', 'INTERNET DEFICIENTE', 'SIN SEÑAL DE TV', 'TV DEFICIENTE'],
    required: true,
  },
  telefonos: {
    type: [String],
    required: true,
  },
  observaciones: {
    type: String,
    required: true,
  },

  // Responsables
  responsable: {
    type: String,
    required: true,
  },
  responsableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tecnicoAsignado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jefeAsignado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Imagen
  imagen: {
    type: String,
    default: '',
  },

  // Estados
  estado: {
    type: String,
    enum: ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'],
    default: 'TOMADO',
  },

  // Datos de ejecución
  ejecucion: {
    observaciones: { type: String, default: '' },
    materiales: [
      {
        nombre: { type: String },
        cantidad: { type: Number },
      },
    ],
    macEquipo: { type: String, default: '' },
    macRepetidor: { type: String, default: '' },
    snReceptor: { type: String, default: '' },
    responsableEjecucion: { type: String, default: '' },
    fechaEjecucion: { type: Date },
  },

  // Datos de retroalimentación
  retroalimentacion: {
    observaciones: { type: String, default: '' },
    responsable: { type: String, default: '' },
    fecha: { type: Date },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

servicioSchema.index({ codigoIdentificador: 1 });
servicioSchema.index({ cliente: 1 });
servicioSchema.index({ estado: 1 });

module.exports = mongoose.model('Servicio', servicioSchema);