const express = require('express');

const {
    obtenerCategorias
} = require('../Controllers/categoriaController');

const router = express.Router();

router.get('/', obtenerCategorias);

module.exports = router;