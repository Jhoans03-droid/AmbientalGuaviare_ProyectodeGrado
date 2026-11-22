
const pool = require('../Config/database');

async function listarUsuarios(req, res) {
    try {
        const [usuarios] = await pool.query(`
            SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.telefono,
                u.activo,
                u.fecha_creacion,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.id = u.rol_id
            ORDER BY u.fecha_creacion DESC
        `);

        res.json(usuarios);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar usuarios'
        });
    }
}

async function cambiarRol(req, res) {
    try {
        const usuarioId = Number(req.params.id);
        const { rol } = req.body;

        const rolesPermitidos = [
            'CIUDADANO',
            'GESTOR',
            'AUTORIDAD',
            'ADMINISTRADOR'
        ];

        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({
                mensaje: 'Rol no válido'
            });
        }

        if (usuarioId === req.usuario.id) {
            return res.status(400).json({
                mensaje: 'No puedes modificar tu propio rol'
            });
        }

        const [resultado] = await pool.query(`
            UPDATE usuarios
            SET rol_id = (
                SELECT id FROM roles WHERE nombre = ?
            )
            WHERE id = ?
        `, [rol, usuarioId]);

        if (!resultado.affectedRows) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Rol actualizado correctamente'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al actualizar rol'
        });
    }
}

async function cambiarEstadoUsuario(req, res) {
    try {
        const usuarioId = Number(req.params.id);
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                mensaje: 'Estado no válido'
            });
        }

        if (usuarioId === req.usuario.id && !activo) {
            return res.status(400).json({
                mensaje: 'No puedes desactivar tu propia cuenta'
            });
        }

        const [resultado] = await pool.query(`
            UPDATE usuarios
            SET activo = ?
            WHERE id = ?
        `, [activo, usuarioId]);

        if (!resultado.affectedRows) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Estado del usuario actualizado'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al actualizar usuario'
        });
    }
}

module.exports = {
    listarUsuarios,
    cambiarRol,
    cambiarEstadoUsuario
};
