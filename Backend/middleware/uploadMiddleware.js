
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: Number(process.env.MAX_FILE_SIZE || 5242880),
        files: 5
    },

    fileFilter: (req, file, cb) => {
        const permitidos = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!permitidos.includes(file.mimetype)) {
            return cb(
                new Error('Solo se permiten imágenes JPG, PNG y WEBP')
            );
        }

        cb(null, true);
    }
});

module.exports = upload;
