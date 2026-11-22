
const pool = require('../Config/database');

const transiciones = {
    REGISTRADO: ['EN_REVISION'],
    EN_REVISION: [
        'INFORMACION_COMPLEMENTARIA',
        'VERIFICADO'
    ],
    INFORMACION_COMPLEMENTARIA: [
        'EN_REVISION'
    ],
    VERIFICADO: ['CERRADO'],
    CERRADO: []
};

async function cambiarEstado(req, res) {
    const conexion = await pool.getConnection();

    try {
        const reporteId = Number(req.params.id);
        const { nuevoEstado, observacion } = req.body;

        if (!observacion || observacion.trim().length < 5) {
            return res.status(400).json({
                mensaje: 'Debes registrar una observación de al menos 5 caracteres'
            });
        }

        await conexion.beginTransaction();

        const [reportes] = await conexion.query(`
            SELECT
                r.id,
                r.estado_id,
                e.nombre AS estado
            FROM reportes r
            INNER JOIN estados_reporte e ON e.id = r.estado_id
            WHERE r.id = ?
            FOR UPDATE
        `, [reporteId]);

        if (!reportes.length) {
            await conexion.rollback();

            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const reporte = reportes[0];

        const [estados] = await conexion.query(
            'SELECT id, nombre FROM estados_reporte WHERE nombre = ?',
            [nuevoEstado]
        );

        if (!estados.length) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: 'Estado no válido'
            });
        }

        const esAutoridad = req.usuario.rol === 'AUTORIDAD';
        const esGestor = req.usuario.rol === 'GESTOR';

        if (nuevoEstado === 'VERIFICADO' && !esAutoridad) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: 'Solo una autoridad competente puede verificar un reporte'
            });
        }

        if (nuevoEstado === 'CERRADO' && !esAutoridad) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: 'Solo una autoridad autorizada puede cerrar el reporte'
            });
        }

        if (!esAutoridad && !esGestor) {
            await conexion.rollback();

            return res.status(403).json({
                mensaje: 'No tienes permisos para cambiar estados'
            });
        }

        if (!transiciones[reporte.estado].includes(nuevoEstado)) {
            await conexion.rollback();

            return res.status(400).json({
                mensaje: `No se permite pasar de ${reporte.estado} a ${nuevoEstado}`
            });
        }

        const estadoNuevo = estados[0];

        await conexion.query(`
            UPDATE reportes
            SET estado_id = ?
            WHERE id = ?
        `, [
            estadoNuevo.id,
            reporteId
        ]);

        await conexion.query(`
            INSERT INTO seguimientos (
                reporte_id,
                usuario_id,
                estado_anterior_id,
                estado_nuevo_id,
                observacion
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            reporteId,
            req.usuario.id,
            reporte.estado_id,
            estadoNuevo.id,
            observacion.trim()
        ]);

        await conexion.commit();

        res.json({
            mensaje: 'Seguimiento registrado correctamente',
            estadoAnterior: reporte.estado,
            estadoNuevo: nuevoEstado
        });

    } catch (error) {
        await conexion.rollback();

        console.error(error);

        res.status(500).json({
            mensaje: 'Error al actualizar el seguimiento'
        });

    } finally {
        conexion.release();
    }
}

async function obtenerHistorial(req, res) {
    try {
        const reporteId = Number(req.params.id);

        const [reportes] = await pool.query(`
            SELECT usuario_id
            FROM reportes
            WHERE id = ?
        `, [reporteId]);

        if (!reportes.length) {
            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const esPropietario =
            reportes[0].usuario_id === req.usuario.id;

        const esPersonal =
            ['GESTOR', 'AUTORIDAD', 'ADMINISTRADOR']
                .includes(req.usuario.rol);

        if (!esPropietario && !esPersonal) {
            return res.status(403).json({
                mensaje: 'No tienes permiso para consultar este historial'
            });
        }

        const [historial] = await pool.query(`
            SELECT
                s.id,
                s.observacion,
                s.fecha,
                ea.nombre AS estado_anterior,
                en.nombre AS estado_nuevo,
                u.nombre,
                u.apellido,
                r.nombre AS rol
            FROM seguimientos s
            INNER JOIN estados_reporte en
                ON en.id = s.estado_nuevo_id
            LEFT JOIN estados_reporte ea
                ON ea.id = s.estado_anterior_id
            INNER JOIN usuarios u
                ON u.id = s.usuario_id
            INNER JOIN roles r
                ON r.id = u.rol_id
            WHERE s.reporte_id = ?
            ORDER BY s.fecha DESC, s.id DESC
        `, [reporteId]);

        res.json(historial);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar historial'
        });
    }
}



async function solicitarInformacion(req, res) {
    try {
        const reporteId = Number(req.params.id);
        const { descripcion } = req.body;

        if (!descripcion || descripcion.trim().length < 5) {
            return res.status(400).json({
                mensaje: 'Debes explicar qué información necesitas'
            });
        }

        const [reportes] = await pool.query(`
            SELECT id, usuario_id, estado_id
            FROM reportes
            WHERE id = ?
        `, [reporteId]);

        if (!reportes.length) {
            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const [estados] = await pool.query(
            'SELECT nombre FROM estados_reporte WHERE id = ?',
            [reportes[0].estado_id]
        );

        if (!['GESTOR', 'AUTORIDAD'].includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'No tienes permiso para solicitar información'
            });
        }

        if (estados[0].nombre !== 'EN_REVISION') {
            return res.status(400).json({
                mensaje: 'El reporte debe estar en revisión'
            });
        }

        await pool.query(`
            INSERT INTO solicitudes_informacion
            (reporte_id, usuario_solicitante_id, descripcion)
            VALUES (?, ?, ?)
        `, [
            reporteId,
            req.usuario.id,
            descripcion.trim()
        ]);

        res.status(201).json({
            mensaje: 'Solicitud de información creada'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al crear solicitud'
        });
    }
}

async function responderSolicitud(req, res) {
    try {
        const solicitudId = Number(req.params.id);
        const { respuesta } = req.body;

        if (!respuesta || respuesta.trim().length < 2) {
            return res.status(400).json({
                mensaje: 'Debes escribir una respuesta'
            });
        }

        const [solicitudes] = await pool.query(`
            SELECT
                s.id,
                s.estado,
                r.usuario_id
            FROM solicitudes_informacion s
            INNER JOIN reportes r ON r.id = s.reporte_id
            WHERE s.id = ?
        `, [solicitudId]);

        if (!solicitudes.length) {
            return res.status(404).json({
                mensaje: 'Solicitud no encontrada'
            });
        }

        const solicitud = solicitudes[0];

        if (solicitud.usuario_id !== req.usuario.id) {
            return res.status(403).json({
                mensaje: 'Solo el propietario del reporte puede responder'
            });
        }

        if (solicitud.estado !== 'PENDIENTE') {
            return res.status(400).json({
                mensaje: 'Esta solicitud ya fue respondida o cancelada'
            });
        }

        await pool.query(`
            UPDATE solicitudes_informacion
            SET respuesta = ?,
                fecha_respuesta = NOW(),
                estado = 'RESPONDIDA'
            WHERE id = ?
        `, [
            respuesta.trim(),
            solicitudId
        ]);

        res.json({
            mensaje: 'Respuesta registrada correctamente'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al responder solicitud'
        });
    }
}

async function obtenerSolicitudes(req, res) {
    try {
        const reporteId = Number(req.params.id);

        const [reportes] = await pool.query(
            'SELECT usuario_id FROM reportes WHERE id = ?',
            [reporteId]
        );

        if (!reportes.length) {
            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const propietario =
            reportes[0].usuario_id === req.usuario.id;

        const personal = [
            'GESTOR',
            'AUTORIDAD',
            'ADMINISTRADOR'
        ].includes(req.usuario.rol);

        if (!propietario && !personal) {
            return res.status(403).json({
                mensaje: 'No tienes permiso'
            });
        }

        const [datos] = await pool.query(`
            SELECT *
            FROM solicitudes_informacion
            WHERE reporte_id = ?
            ORDER BY fecha_solicitud DESC
        `, [reporteId]);

        res.json(datos);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar solicitudes'
        });
    }
}


module.exports = {
    cambiarEstado,
    obtenerHistorial,
    solicitarInformacion,
    responderSolicitud,
    obtenerSolicitudes
};
