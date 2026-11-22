
const express = require('express');

const {
    verificarToken
} = require('../middleware/authMiddleware');

const {
    obtenerEstadisticas
} = require('../Controllers/dashboardController');

const router = express.Router();

router.get(
    '/estadisticas',
    verificarToken,
    obtenerEstadisticas
);

module.exports = router;
