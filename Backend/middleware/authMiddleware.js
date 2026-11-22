
const jwt = require('jsonwebtoken');
const pool = require('../Config/database');

async function verificarToken(req, res, next) {
    try {
        const auth = req.headers.authorization;

        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({
                mensaje: 'Debes iniciar sesión'
            });
        }

        const token = auth.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const [usuarios] = await pool.query(`
            SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.activo,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.id = u.rol_id
            WHERE u.id = ?
        `, [decoded.id]);

        if (!usuarios.length || !usuarios[0].activo) {
            return res.status(401).json({
                mensaje: 'Usuario inactivo o inexistente'
            });
        }

        req.usuario = usuarios[0];

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: 'Sesión inválida o expirada'
        });
    }
}

function permitirRoles(...roles) {
    return (req, res, next) => {
        if (!req.usuario || !roles.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'No tienes permisos para esta operación'
            });
        }

        next();
    };
}

module.exports = {
    verificarToken,
    permitirRoles
};
