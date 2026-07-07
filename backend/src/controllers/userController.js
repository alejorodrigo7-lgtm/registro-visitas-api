exports.obtenerUsuarios = async (req, res) => {
  const User = require('../models/User');
  const users = await User.find().select('-password');
  res.json({ success: true, data: users });
};