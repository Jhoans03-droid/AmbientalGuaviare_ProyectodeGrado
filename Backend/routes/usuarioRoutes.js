
const express = require('express');

const {
    verificarToken,
    permitirRoles
} = require('../middleware/authMiddleware');

const {
    listarUsuarios,
    cambiarRol,
    cambiarEstadoUsuario
} = require('../Controllers/usuarioController');

const router = express.Router();

router.get(
    '/',
    verificarToken,
    permitirRoles('ADMINISTRADOR'),
    listarUsuarios
);

router.put(
    '/:id/rol',
    verificarToken,
    permitirRoles('ADMINISTRADOR'),
    cambiarRol
);

router.put(
    '/:id/estado',
    verificarToken,
    permitirRoles('ADMINISTRADOR'),
    cambiarEstadoUsuario
);

module.exports = router;
