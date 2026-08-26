// ✅ MODELO CORREGIDO - VERSIÓN FINAL CON CLOUDINARY

const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  cliente: { type: String, required: true },
  codigoIdentificador: { type: String, required: true },
  barrio: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String, required: true },
  nombreServicio: {
    type: String,
    enum: [
      'INSTALACION DUO',
      'INSTALACION INTERNET',
      'INSTALACION TV',
      'SIN INTERNET (FOCO ROJO)',
      'INTERNET DEFICIENTE',
      'SIN SEÑAL DE TV',
      'TV DEFICIENTE',
      'CORTE TV',
      'CORTE INTERNET'
    ],
    required: true,
  },
  telefonos: { type: [String], required: true },
  observaciones: { type: String, required: true },
  responsable: { type: String, required: true },
  responsableId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // ✅ CAMPO PARA IMAGEN (URL DE CLOUDINARY)
  imagen: { type: String, default: '' },
  
  // ✅ CAMPO CORRECTO: tecnico como objeto completo
  tecnico: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    email: { type: String }
  },
  
  // ✅ CAMPO CORRECTO: jefe como objeto completo
  jefe: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombre: { type: String },
    email: { type: String }
  },
  
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
servicioSchema.index({ 'tecnico._id': 1 });

// ✅ MIDDLEWARE: Actualizar updatedAt antes de guardar
servicioSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ✅ MIDDLEWARE: Filtrar solo servicios activos en find
servicioSchema.pre('find', function() {
  this.where({ activo: true });
});

servicioSchema.pre('findOne', function() {
  this.where({ activo: true });
});

servicioSchema.pre('findById', function() {
  this.where({ activo: true });
});

// ✅ MÉTODOS
servicioSchema.methods.softDelete = async function() {
  this.activo = false;
  this.updatedAt = new Date();
  return await this.save();
};

servicioSchema.methods.restore = async function() {
  this.activo = true;
  this.updatedAt = new Date();
  return await this.save();
};

// ✅ STATICS
servicioSchema.statics.findActive = function() {
  return this.find({ activo: true });
};

servicioSchema.statics.findInactive = function() {
  return this.find({ activo: false });
};

// ✅ EXPORTAR CORRECTAMENTE
module.exports = mongoose.model('Servicio', servicioSchema);