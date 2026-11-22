
const express = require('express');

const {
    verificarToken
} = require('../middleware/authMiddleware');

const {
    cambiarEstado,
    obtenerHistorial,
    solicitarInformacion,
    responderSolicitud,
    obtenerSolicitudes
} = require('../controllers/seguimientoController');

const router = express.Router();

router.get('/:id', verificarToken, obtenerHistorial);

router.put('/:id/estado', verificarToken, cambiarEstado);

router.get(
    '/:id/solicitudes',
    verificarToken,
    obtenerSolicitudes
);

router.post(
    '/:id/solicitudes',
    verificarToken,
    solicitarInformacion
);

router.post(
    '/solicitudes/:id/responder',
    verificarToken,
    responderSolicitud
);

module.exports = router;
