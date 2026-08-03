const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  codigoIdentificador: { type: String, required: true },
  barrio: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String, required: true },
  nombreServicio: {
    type: String,
    enum: ['INSTALACION DUO', 'INSTALACION INTERNET', 'INSTALACION TV', 'SIN INTERNET (FOCO ROJO)', 'INTERNET DEFICIENTE', 'SIN SEÑAL DE TV', 'TV DEFICIENTE'],
    required: true,
  },
  telefonos: { type: [String], required: true },
  observaciones: { type: String, required: true },
  responsable: { type: String, required: true },
  responsableId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // ✅ CAMBIADO: Ahora es un OBJETO COMPLETO con _id, nombre y email
  tecnicoAsignado: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    email: { type: String }
  },
  
  // ✅ CAMBIADO: Ahora es un OBJETO COMPLETO con _id, nombre y email
  jefeAsignado: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    email: { type: String }
  },
  
  imagen: { type: String, default: '' },
  estado: {
    type: String,
    enum: ['TOMADO', 'EJECUTADO', 'PENDIENTE', 'RETROALIMENTADO'],
    default: 'TOMADO',
  },
  ejecucion: {
    observaciones: { type: String, default: '' },
    materiales: [{ nombre: String, cantidad: Number }],
    macEquipo: { type: String, default: '' },
    macRepetidor: { type: String, default: '' },
    snReceptor: { type: String, default: '' },
    responsableEjecucion: { type: String, default: '' },
    fechaEjecucion: { type: Date },
  },
  retroalimentacion: {
    observaciones: { type: String, default: '' },
    responsable: { type: String, default: '' },
    fecha: { type: Date },
  },
  
  activo: {
    type: Boolean,
    default: true,
    required: true
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ ÍNDICES
servicioSchema.index({ codigoIdentificador: 1 });
servicioSchema.index({ cliente: 1 });
servicioSchema.index({ estado: 1 });
servicioSchema.index({ activo: 1 });
// ✅ ÍNDICE PARA BUSQUEDA POR TÉCNICO (OBJETO COMPLETO)
servicioSchema.index({ 'tecnicoAsignado._id': 1 });

// ✅ MIDDLEWARE: Actualizar updatedAt antes de guardar
servicioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ✅ MIDDLEWARE: Filtrar solo servicios activos en find
servicioSchema.pre('find', function() {
  this.where({ activo: true });
});

// ✅ MIDDLEWARE: Filtrar solo servicios activos en findOne
servicioSchema.pre('findOne', function() {
  this.where({ activo: true });
});

// ✅ MIDDLEWARE: Filtrar solo servicios activos en findById
servicioSchema.pre('findById', function() {
  this.where({ activo: true });
});

// ✅ MÉTODO: Soft delete (ocultar servicio)
servicioSchema.methods.softDelete = async function() {
  this.activo = false;
  this.updatedAt = new Date();
  return await this.save();
};

// ✅ MÉTODO: Restaurar servicio
servicioSchema.methods.restore = async function() {
  this.activo = true;
  this.updatedAt = new Date();
  return await this.save();
};

// ✅ STATIC: Obtener solo servicios activos
servicioSchema.statics.findActive = function() {
  return this.find({ activo: true });
};

// ✅ STATIC: Obtener servicios inactivos (para admin)
servicioSchema.statics.findInactive = function() {
  return this.find({ activo: false });
};

module.exports = mongoose.model('Servicio', servicioSchema);