const mongoose = require('mongoose');

const ingresoOficinaSchema = new mongoose.Schema({
  // ============================================
  // TIPO: 'tola' = Oficina Tola | 'otra' = Otras Oficinas
  // ============================================
  tipo: {
    type: String,
    enum: ['tola', 'otra'],
    required: [true, 'El tipo es obligatorio'],
    index: true
  },

  // ============================================
  // ZONA / SECTOR
  // ============================================
  zonaSector: {
    type: String,
    enum: ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'],
    default: null,
    index: true
  },

  // ============================================
  // FECHA DEL INGRESO
  // ============================================
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria'],
    index: true
  },

  // ============================================
  // VALOR (siempre en efectivo)
  // ============================================
  valor: {
    type: Number,
    required: [true, 'El valor es obligatorio'],
    min: [0, 'El valor no puede ser negativo']
  },

  // ============================================
  // NOMBRE DE LA OFICINA (solo si tipo='otra')
  // ============================================
  nombreOficina: {
    type: String,
    trim: true,
    default: null
  },

  // ============================================
  // OBSERVACION (solo si tipo='otra')
  // ============================================
  observacion: {
    type: String,
    trim: true,
    default: null
  },

  // ============================================
  // QUIEN REGISTRO
  // ============================================
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario que registra es obligatorio']
  },
  registradoPorNombre: {
    type: String,
    default: null
  },

  // ============================================
  // TIMESTAMPS
  // ============================================
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ============================================
// INDICES PARA BUSQUEDAS RAPIDAS
// ============================================
ingresoOficinaSchema.index({ tipo: 1, fecha: -1 });
ingresoOficinaSchema.index({ fecha: -1 });
ingresoOficinaSchema.index({ zonaSector: 1, fecha: -1 });

// ============================================
// ACTUALIZAR updatedAt
// ============================================
ingresoOficinaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ============================================
// VALIDACION CONDICIONAL: si tipo='otra' requiere nombreOficina
// ============================================
ingresoOficinaSchema.pre('validate', function(next) {
  if (this.tipo === 'otra') {
    if (!this.nombreOficina || this.nombreOficina.trim() === '') {
      return next(new Error('El nombre de la oficina es obligatorio para "Otras Oficinas"'));
    }
  }
  next();
});

module.exports = mongoose.model('IngresoOficina', ingresoOficinaSchema);
