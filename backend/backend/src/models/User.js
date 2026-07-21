const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ['Admin', 'Jefe', 'Coordinador', 'Tecnico'],
    default: 'Tecnico',
  },
  telefono: {
    type: String,
    default: '',
  },
  especialidad: {
    type: String,
    default: '',
  },
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

module.exports = mongoose.model('User', UserSchema);