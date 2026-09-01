const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Subir imagen a Cloudinary desde buffer
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {string} folder - Carpeta en Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = (buffer, folder = 'cuadre-egresos') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Eliminar imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen
 * @returns {Promise<boolean>}
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return true;
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    return false;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};