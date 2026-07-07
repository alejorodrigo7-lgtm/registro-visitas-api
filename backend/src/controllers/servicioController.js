// Controladores vacíos para evitar errores
exports.crearServicio = async (req, res) => {
  res.json({ success: true, message: 'Servicio creado' });
};

exports.obtenerServicios = async (req, res) => {
  res.json({ success: true, data: [] });
};