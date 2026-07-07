exports.obtenerNotificaciones = async (req, res) => {
  res.json({ success: true, data: [] });
};

exports.marcarLeida = async (req, res) => {
  res.json({ success: true, message: 'Notificación marcada como leída' });
};