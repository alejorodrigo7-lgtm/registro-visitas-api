const cloudinary = require('../config/cloudinary');

// ============================================
// 📤 SUBIR IMAGEN A CLOUDINARY
// ============================================
exports.subirImagen = async (req, res) => {
    try {
        const { imagenBase64, carpeta } = req.body;

        if (!imagenBase64) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó ninguna imagen'
            });
        }

        console.log('📤 Subiendo imagen a Cloudinary...');

        // 🔥 CORRECCIÓN: Usar upload_stream con buffer
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: carpeta || 'transferencias',
                    resource_type: 'auto',
                    transformation: [
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            
            // Convertir base64 a buffer y enviar
            const buffer = Buffer.from(imagenBase64, 'base64');
            uploadStream.end(buffer);
        });

        console.log('✅ Imagen subida a Cloudinary:', result.secure_url);

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
        });

    } catch (error) {
        console.error('❌ Error al subir imagen a Cloudinary:', error);
        res.status(500).json({
            success: false,
            message: 'Error al subir la imagen',
            error: error.message
        });
    }
};

// ============================================
// 🗑️ ELIMINAR IMAGEN DE CLOUDINARY
// ============================================
exports.eliminarImagen = async (req, res) => {
    try {
        const { public_id } = req.body;

        if (!public_id) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó el public_id'
            });
        }

        const result = await cloudinary.uploader.destroy(public_id);

        res.json({
            success: true,
            message: 'Imagen eliminada correctamente',
            result
        });

    } catch (error) {
        console.error('❌ Error al eliminar imagen de Cloudinary:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la imagen',
            error: error.message
        });
    }
};