// ============================================
// MIDDLEWARE DE VERIFICACIÓN DE ROLES
// ============================================

/**
 * Middleware para verificar que el usuario tenga uno de los roles permitidos
 * @param {Array} roles - Lista de roles permitidos
 * @returns {Function} Middleware de express
 */
const roleCheck = (roles) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      // Verificar que el usuario tenga un rol
      if (!req.user.rol) {
        return res.status(403).json({
          success: false,
          message: 'Usuario sin rol asignado'
        });
      }

      // Verificar si el rol del usuario está en la lista de roles permitidos
      const hasRole = roles.includes(req.user.rol);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}`
        });
      }

      // Si tiene el rol permitido, continuar
      next();
    } catch (error) {
      console.error('Error en roleCheck:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

module.exports = roleCheck;