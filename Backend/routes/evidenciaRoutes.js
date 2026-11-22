
const express = require('express');

const upload = require('../middleware/uploadMiddleware');

const {
    verificarToken
} = require('../middleware/authMiddleware');

const {
    guardarEvidencias,
    obtenerEvidencia
} = require('../Controllers/evidenciaController');

const router = express.Router();

router.post(
    '/:id',
    verificarToken,
    (req, res, next) => {
        upload.array('fotografias', 5)(req, res, err => {
            if (err) {
                return res.status(400).json({
                    mensaje: err.message
                });
            }
            next();
        });
    },
    guardarEvidencias
);

router.get(
    '/archivo/:id',
    verificarToken,
    obtenerEvidencia
);

module.exports = router;
