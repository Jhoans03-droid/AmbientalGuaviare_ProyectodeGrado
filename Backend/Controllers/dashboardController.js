
const pool = require('../Config/database');

async function obtenerEstadisticas(req, res) {
    try {
        const esCiudadano =
            req.usuario.rol === 'CIUDADANO';

        const condicion = esCiudadano
            ? 'WHERE usuario_id = ?'
            : '';

        const parametros = esCiudadano
            ? [req.usuario.id]
            : [];

        const [totales] = await pool.query(`
            SELECT
                COUNT(*) AS total,
                SUM(estado_id = 1) AS registrados,
                SUM(estado_id = 2) AS en_revision,
                SUM(estado_id = 3) AS complementarios,
                SUM(estado_id = 4) AS verificados,
                SUM(estado_id = 5) AS cerrados
            FROM reportes
            ${condicion}
        `, parametros);

        const [categorias] = await pool.query(`
            SELECT
                c.nombre,
                COUNT(r.id) AS cantidad
            FROM categorias c
            LEFT JOIN reportes r
                ON r.categoria_id = c.id
                ${esCiudadano ? 'AND r.usuario_id = ?' : ''}
            GROUP BY c.id, c.nombre
            ORDER BY cantidad DESC
        `, parametros);

        res.json({
            totales: totales[0],
            categorias
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener estadísticas'
        });
    }
}

module.exports = {
    obtenerEstadisticas
};
