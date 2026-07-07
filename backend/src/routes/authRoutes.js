const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password, rol } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (user.rol !== rol) {
      return res.status(401).json({ message: 'Rol incorrecto' });
    }

    if (user.activo === false) {
      return res.status(401).json({ message: 'Usuario desactivado' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        telefono: user.telefono,
        especialidad: user.especialidad,
        activo: user.activo,
        expoPushToken: user.expoPushToken,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// REGISTRO - SOLO ADMIN
// ============================================
router.post('/register', protect, authorize('Admin'), async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono, especialidad } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
      rol,
      telefono,
      especialidad,
      activo: true,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= OBTENER TODOS LOS USUARIOS
// ============================================
router.get('/usuarios', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const usuarios = await User.find().select('-password');
    res.json({
      success: true,
      count: usuarios.length,
      data: usuarios,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= OBTENER UN USUARIO
// ============================================
router.get('/usuarios/:id', protect, authorize('Admin', 'Jefe'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id).select('-password');
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: usuario });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= ACTUALIZAR USUARIO - SOLO ADMIN
// ============================================
router.put('/usuarios/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const { nombre, telefono, especialidad, rol } = req.body;
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes modificarte a ti mismo' });
    }

    usuario.nombre = nombre || usuario.nombre;
    usuario.telefono = telefono !== undefined ? telefono : usuario.telefono;
    usuario.especialidad = especialidad !== undefined ? especialidad : usuario.especialidad;
    usuario.rol = rol || usuario.rol;

    await usuario.save();

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: usuario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= ELIMINAR USUARIO - SOLO ADMIN
// ============================================
router.delete('/usuarios/:id', protect, authorize('Admin'), async (req, res) => {
  try {
    const usuario = await User.findById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    await usuario.deleteOne();
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= ACTIVAR/DESACTIVAR USUARIO - SOLO ADMIN
// ============================================
router.put('/usuarios/:id/toggle', protect, authorize('Admin'), async (req, res) => {
  try {
    const { activo } = req.body;
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'No puedes desactivarte a ti mismo' });
    }

    usuario.activo = activo;
    await usuario.save();

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`,
      data: usuario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= CAMBIAR CONTRASEÑA
// ============================================
router.put('/usuarios/:id/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const usuario = await User.findById(req.params.id);
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.params.id !== req.user._id.toString() && req.user.rol !== 'Admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (req.user.rol !== 'Admin') {
      const isMatch = await bcrypt.compare(currentPassword, usuario.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }
    }

    usuario.password = await bcrypt.hash(newPassword, 10);
    await usuario.save();

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================
= REGISTRAR TOKEN PUSH
// ============================================
router.post('/registrar-push-token', protect, async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserId y token son requeridos' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    user.expoPushToken = token;
    await user.save();
    
    console.log(`✅ Token push registrado para ${user.email}`);
    
    res.json({
      success: true,
      message: 'Token push registrado correctamente',
    });
  } catch (error) {
    console.error('❌ Error registrando token push:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;