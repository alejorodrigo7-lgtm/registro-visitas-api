const mongoose = require('mongoose');

const cuadreCajaSchema = new mongoose.Schema({
  zona: {
    type: String,
    enum: ['TOLA', 'CHILIBULO', 'MAGDALENA'],
    required: true,
  },
  fecha: {
    type: String, // formato: YYYY-MM-DD
    required: true,
  },
  saldoInicial: {
    type: Number,
    default: 0,
  },
  saldoDisponible: {
    type: Number,
    default: 0,
  },
  ingresos: [{
    tipo: {
      type: String,
      enum: ['OFICINA', 'EFECTIVO COORDINADOR', 'OTRO'],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    concepto: {
      type: String,
      default: '',
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  pagos: [{
    motivo: {
      type: String,
      enum: ['EGRESO'],
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cerrado: {
    type: Boolean,
    default: false,
  },
  fechaCierre: {
    type: Date,
  },
  enviadoCorreo: {
    type: Boolean,
    default: false,
  },
  intentosCorreo: {
    type: Number,
    default: 0,
  },
  ultimoEnvioCorreo: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Índice compuesto para evitar duplicados por zona y fecha
cuadreCajaSchema.index({ zona: 1, fecha: 1 }, { unique: true });

// Índice para búsquedas por fecha
cuadreCajaSchema.index({ fecha: 1 });

// Índice para búsquedas por zona
cuadreCajaSchema.index({ zona: 1 });

// ✅ MÉTODO PARA VERIFICAR SI ESTÁ CERRADO
cuadreCajaSchema.methods.estaCerrado = function() {
  return this.cerrado === true;
};

// ✅ MÉTODO PARA VERIFICAR SI EL CORREO YA FUE ENVIADO
cuadreCajaSchema.methods.correoEnviado = function() {
  return this.enviadoCorreo === true;
};

// ✅ MÉTODO PARA REGISTRAR UN ENVÍO DE CORREO
cuadreCajaSchema.methods.registrarEnvioCorreo = function() {
  this.enviadoCorreo = true;
  this.intentosCorreo = (this.intentosCorreo || 0) + 1;
  this.ultimoEnvioCorreo = new Date();
  return this.save();
};

// ✅ MÉTODO PARA OBTENER EL SALDO DISPONIBLE
cuadreCajaSchema.methods.calcularSaldoDisponible = function() {
  const totalIngresos = this.ingresos.reduce((sum, i) => sum + i.monto, 0);
  const totalPagos = this.pagos.reduce((sum, p) => sum + p.monto, 0);
  return this.saldoInicial + totalIngresos - totalPagos;
};

// ✅ STATIC PARA OBTENER SALDO DE UN DÍA ANTERIOR
cuadreCajaSchema.statics.obtenerSaldoAnterior = async function(zona, fecha) {
  try {
    const fechaObj = new Date(fecha);
    const diaAnterior = new Date(fechaObj);
    diaAnterior.setDate(diaAnterior.getDate() - 1);
    const fechaAnterior = diaAnterior.toISOString().split('T')[0];
    
    const cuadreAnterior = await this.findOne({ 
      zona, 
      fecha: fechaAnterior,
      cerrado: true,
    });
    
    return cuadreAnterior ? cuadreAnterior.saldoDisponible : 0;
  } catch (error) {
    console.error('Error obteniendo saldo anterior:', error);
    return 0;
  }
};

// ✅ STATIC PARA OBTENER TODOS LOS CUADRES DE UNA FECHA
cuadreCajaSchema.statics.obtenerPorFecha = async function(fecha) {
  return this.find({ fecha });
};

// ✅ STATIC PARA OBTENER CUADRES DE UNA ZONA
cuadreCajaSchema.statics.obtenerPorZona = async function(zona) {
  return this.find({ zona });
};

module.exports = mongoose.model('CuadreCaja', cuadreCajaSchema);