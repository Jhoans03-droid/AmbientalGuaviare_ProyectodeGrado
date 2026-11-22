const pool = require('../Config/database');

async function obtenerCategorias(req, res) {

    try {

        const [categorias] = await pool.query(`
            SELECT id, nombre, descripcion
            FROM categorias
            WHERE activo = TRUE
            ORDER BY nombre
        `);

        res.json(categorias);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener categorías'
        });
    }
}

module.exports = {
    obtenerCategorias
};