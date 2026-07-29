const mongoose = require('mongoose');
// ✅ bcrypt ya no se usa para hashear, solo para comparar si es necesario
const bcrypt = require('bcryptjs');

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

// ✅ COMENTADO: Ya no hasheamos automáticamente
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// ✅ Función para comparar en texto plano (opcional)
userSchema.methods.matchPassword = async function(enteredPassword) {
  // Si la contraseña está en texto plano, comparar directamente
  if (this.password === enteredPassword) {
    return true;
  }
  // Si por alguna razón está hasheada, usar bcrypt
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch {
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);