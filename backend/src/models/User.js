const mongoose = require('mongoose');
// ✅ CAMBIAR bcryptjs POR bcrypt
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'Nombre es obligatorio'],
  },
  email: {
    type: String,
    required: [true, 'Email es obligatorio'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Contraseña es obligatoria'],
    minlength: 6,
  },
  rol: {
    type: String,
    enum: ['Admin', 'Jefe', 'Coordinador', 'Tecnico'],
    required: true,
  },
  telefono: String,
  especialidad: String,
  activo: {
    type: Boolean,
    default: true,
  },
  expoPushToken: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ CORRECTO - usa bcrypt (NO bcryptjs)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ CORRECTO - usa bcrypt (NO bcryptjs)
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);