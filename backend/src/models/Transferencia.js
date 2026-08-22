const mongoose = require('mongoose');

const transferenciaSchema = new mongoose.Schema({
  responsable: { 
    type: String, 
    required: true 
  },
  responsableId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  fechaTransferencia: { 
    type: Date, 
    required: true 
  },
  codigoIdentificador: { 
    type: String, 
    required: true, 
    trim: true 
  },
  nombreUsuario: { 
    type: String, 
    required: true 
  },
  numeroDocumento: { 
    type: String, 
    required: true, 
    trim: true 
  },
  valor: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  zonaSector: { 
    type: String, 
    enum: ['TOLA', 'SAN JOSE DE CHILIBULO', 'MAGDALENA'], 
    required: true 
  },
  barrio: { 
    type: String, 
    required: true 
  },
  bancoCuenta: { 
    type: String, 
    required: true 
  },
  soporte: { 
    type: String, 
    required: true 
  },
  
  // ============================================
  // 📷 CAMPO PARA LA IMAGEN DEL COMPROBANTE
  // ============================================
  imagenComprobante: { 
    type: String,
    required: false,
    default: null
  },
  
  // ============================================
  // ESTADO DE LA TRANSFERENCIA
  // ============================================
  estado: { 
    type: String, 
    enum: ['SUBIDA', 'CONFIRMADA', 'DENEGADA', 'INGRESADA', 'EN_REVISION'], 
    default: 'SUBIDA' 
  },
  
  // ============================================
  // 🆕 NOTA DE DENEGACIÓN
  // ============================================
  notaDenegacion: {
    type: String,
    default: null
  },
  denegadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fechaDenegacion: {
    type: Date,
    default: null
  },
  confirmadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  fechaConfirmacion: {
    type: Date,
    default: null
  },
  
  // ============================================
  // FECHAS DE CREACIÓN Y ACTUALIZACIÓN
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
// ÍNDICES PARA BÚSQUEDAS RÁPIDAS
// ============================================
transferenciaSchema.index({ codigoIdentificador: 1 });
transferenciaSchema.index({ nombreUsuario: 1 });
transferenciaSchema.index({ estado: 1 });
transferenciaSchema.index({ fechaTransferencia: -1 });
transferenciaSchema.index({ zonaSector: 1 });

// ============================================
// MIDDLEWARE PARA ACTUALIZAR updatedAt
// ============================================
transferenciaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ============================================
// MÉTODO PARA OBTENER LA IMAGEN FORMATEADA
// ============================================
transferenciaSchema.methods.getImagenFormateada = function() {
  if (!this.imagenComprobante) return null;
  
  if (this.imagenComprobante.startsWith('data:image')) {
    return this.imagenComprobante;
  }
  
  return `data:image/jpeg;base64,${this.imagenComprobante}`;
};

module.exports = mongoose.model('Transferencia', transferenciaSchema);