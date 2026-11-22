const express = require('express');

const {
    verificarToken
} = require('../middleware/authMiddleware');

const {
    crearReporte,
    obtenerReportePorId,
    obtenerMisReportes,
    obtenerMapaPublico
} = require('../Controllers/reporteController');



const router = express.Router();


router.get(
    '/mapa/publico',
    obtenerMapaPublico
);

router.get(
    '/',
    verificarToken,
    obtenerMisReportes
);

router.post(
    '/',
    verificarToken,
    crearReporte
);


router.get(
    '/:id',
    verificarToken,
    obtenerReportePorId
);
module.exports = router;