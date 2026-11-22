const pool = require('../Config/database');

async function crearReporte(req, res) {

    const conexion = await pool.getConnection();

    try {

        await conexion.beginTransaction();

        const {
            titulo,
            descripcion,
            fecha_evento,
            categoria_id,
            latitud,
            longitud,
            precision_ubicacion,
            visibilidad_ubicacion,
            direccion
        } = req.body;

        if (
            !titulo ||
            !descripcion ||
            !fecha_evento ||
            !categoria_id ||
            latitud == null ||
            longitud == null
        ) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: 'Faltan datos obligatorios'
            });
        }

        const [resultado] = await conexion.query(`
            INSERT INTO reportes (
                usuario_id,
                categoria_id,
                estado_id,
                titulo,
                descripcion,
                fecha_evento,
                latitud,
                longitud,
                precision_ubicacion,
                visibilidad_ubicacion,
                direccion
            )
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                req.usuario.id,
                categoria_id,
                titulo,
                descripcion,
                fecha_evento,
                latitud,
                longitud,
                precision_ubicacion || 'APROXIMADA',
                visibilidad_ubicacion || 'RESTRINGIDA',
                direccion || null
        ]);

        const reporteId = resultado.insertId;

        await conexion.query(`
            INSERT INTO seguimientos
            (
                reporte_id,
                usuario_id,
                estado_anterior_id,
                estado_nuevo_id,
                observacion
            )
            VALUES (?, ?, NULL, 1, ?)
        `, [
            reporteId,
            req.usuario.id,
            'Reporte registrado por el ciudadano'
        ]);

        await conexion.commit();

        res.status(201).json({
            mensaje: 'Reporte registrado correctamente',
            reporteId
        });

    } catch (error) {

        await conexion.rollback();

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al registrar reporte'
        });

    } finally {

        conexion.release();
    }
}

async function obtenerReportes(req, res) {

    try {

        const [reportes] = await pool.query(`
            SELECT
                r.id,
                r.titulo,
                r.descripcion,
                r.fecha_evento,
                r.latitud,
                r.longitud,
                r.precision_ubicacion,
                r.direccion,
                r.fecha_creacion,

                c.nombre AS categoria,

                e.nombre AS estado,

                CONCAT(
                    u.nombre,
                    ' ',
                    COALESCE(u.apellido, '')
                ) AS reportante

            FROM reportes r

            INNER JOIN categorias c
                ON c.id = r.categoria_id

            INNER JOIN estados_reporte e
                ON e.id = r.estado_id

            INNER JOIN usuarios u
                ON u.id = r.usuario_id

            ORDER BY r.fecha_creacion DESC
        `);

        res.json(reportes);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener reportes'
        });
    }
}

async function obtenerReportePorId(req, res) {

    try {

        const id = req.params.id;

        const [reportes] = await pool.query(`
            SELECT
                r.*,
                c.nombre AS categoria,
                e.nombre AS estado,
                CONCAT(u.nombre, ' ', COALESCE(u.apellido,'')) AS reportante
            FROM reportes r
            INNER JOIN categorias c
                ON c.id = r.categoria_id
            INNER JOIN estados_reporte e
                ON e.id = r.estado_id
            INNER JOIN usuarios u
                ON u.id = r.usuario_id
            WHERE r.id = ?
        `, [id]);

        if (reportes.length === 0) {

            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const esPropietario = reportes[0].usuario_id === req.usuario.id;

        const esPersonal = [
            'GESTOR',
            'AUTORIDAD',
            'ADMINISTRADOR'
        ].includes(req.usuario.rol);

        if (!esPropietario && !esPersonal) {
            return res.status(403).json({
                mensaje: 'No puedes consultar este reporte'
            });
        }

        const [evidencias] = await pool.query(`
            SELECT *
            FROM evidencias
            WHERE reporte_id = ?
            ORDER BY fecha_subida DESC
        `, [id]);

        const [seguimientos] = await pool.query(`
            SELECT
                s.id,
                s.observacion,
                s.fecha,
                ea.nombre AS estado_anterior,
                en.nombre AS estado_nuevo,
                CONCAT(u.nombre, ' ', COALESCE(u.apellido,'')) AS usuario
            FROM seguimientos s
            LEFT JOIN estados_reporte ea
                ON ea.id = s.estado_anterior_id
            INNER JOIN estados_reporte en
                ON en.id = s.estado_nuevo_id
            INNER JOIN usuarios u
                ON u.id = s.usuario_id
            WHERE s.reporte_id = ?
            ORDER BY s.fecha DESC
        `, [id]);

        res.json({
            reporte: reportes[0],
            evidencias,
            seguimientos
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al obtener reporte'
        });
    }
}


async function obtenerMisReportes(req, res) {
    try {
        const esPersonal = [
            'GESTOR',
            'AUTORIDAD',
            'ADMINISTRADOR'
        ].includes(req.usuario.rol);

        const condicion = esPersonal
            ? ''
            : 'WHERE r.usuario_id = ?';

        const parametros = esPersonal
            ? []
            : [req.usuario.id];

        const [reportes] = await pool.query(`
            SELECT
                r.id,
                r.titulo,
                r.descripcion,
                r.fecha_evento,
                r.fecha_creacion,
                r.precision_ubicacion,
                r.visibilidad_ubicacion,
                r.usuario_id,
                c.nombre AS categoria,
                e.nombre AS estado,
                u.nombre AS reportante
            FROM reportes r
            INNER JOIN categorias c ON c.id = r.categoria_id
            INNER JOIN estados_reporte e ON e.id = r.estado_id
            INNER JOIN usuarios u ON u.id = r.usuario_id
            ${condicion}
            ORDER BY r.fecha_creacion DESC
        `, parametros);

        res.json(reportes);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar reportes'
        });
    }
}

async function obtenerMapaPublico(req, res) {
    try {
        const [reportes] = await pool.query(`
            SELECT
                r.id,
                r.titulo,
                c.nombre AS categoria,
                e.nombre AS estado,
                ROUND(r.latitud, 2) AS latitud,
                ROUND(r.longitud, 2) AS longitud,
                r.fecha_creacion
            FROM reportes r
            INNER JOIN categorias c ON c.id = r.categoria_id
            INNER JOIN estados_reporte e ON e.id = r.estado_id
            WHERE r.visibilidad_ubicacion = 'PUBLICA'
              AND r.precision_ubicacion = 'APROXIMADA'
            ORDER BY r.fecha_creacion DESC
        `);

        res.json(reportes);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar mapa'
        });
    }
}


module.exports = {
    crearReporte,
    obtenerReportes,
    obtenerReportePorId,
    obtenerMisReportes,
    obtenerMapaPublico
};