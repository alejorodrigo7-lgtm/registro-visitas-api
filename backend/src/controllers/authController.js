const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// ============================================
// REGISTRAR TOKEN DE NOTIFICACIONES PUSH
// ============================================
exports.registrarPushToken = async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    console.log('📡 Registrando token push para usuario:', userId);
    console.log('📡 Token:', token);
    
    if (!userId || !token) {
      console.log('❌ Faltan userId o token');
      return res.status(400).json({ 
        success: false, 
        message: 'UserId y token son requeridos' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
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
      user: {
        id: user._id,
        email: user.email,
        rol: user.rol,
        expoPushToken: user.expoPushToken,
      },
    });
  } catch (error) {
    console.error('❌ Error registrando token push:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ... resto de las funciones (login, register, etc.)