
const pool = require('../Config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// REGISTRAR USUARIO
// ==========================================

async function registrar(req, res) {
    try {
        const {
            nombre,
            apellido,
            email,
            password,
            telefono
        } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({
                mensaje: 'Nombre, correo y contraseña son obligatorios'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                mensaje: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        const [existente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (existente.length > 0) {
            return res.status(409).json({
                mensaje: 'El correo ya está registrado'
            });
        }

        const hash = await bcrypt.hash(password, 10);

        const [resultado] = await pool.query(`
            INSERT INTO usuarios
            (nombre, apellido, email, password_hash, telefono, rol_id)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [
            nombre.trim(),
            apellido || null,
            email.trim().toLowerCase(),
            hash,
            telefono || null
        ]);

        return res.status(201).json({
            mensaje: 'Usuario registrado correctamente',
            id: resultado.insertId
        });

    } catch (error) {
        console.error('ERROR REGISTRO:', error);

        return res.status(500).json({
            mensaje: 'Error interno al registrar usuario'
        });
    }
}


// ==========================================
// INICIAR SESIÓN
// ==========================================

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                mensaje: 'Debes ingresar correo y contraseña'
            });
        }

        console.log('========== VALIDACIÓN LOGIN ==========');
        console.log('JWT_SECRET existe:', !!process.env.JWT_SECRET);
        console.log('JWT_SECRET longitud:', process.env.JWT_SECRET?.length || 0);
        console.log('Proceso:', process.pid);
        console.log('======================================');

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET no está configurado');

            return res.status(500).json({
                mensaje: 'Configuración de autenticación incompleta'
            });
        }

        // Buscar usuario
        const [usuarios] = await pool.query(`
            SELECT
                u.id,
                u.nombre,
                u.apellido,
                u.email,
                u.password_hash,
                u.activo,
                u.rol_id,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON r.id = u.rol_id
            WHERE LOWER(u.email) = LOWER(?)
            LIMIT 1
        `, [email.trim()]);

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        const usuario = usuarios[0];

        // Comprobar estado
        if (!usuario.activo) {
            return res.status(403).json({
                mensaje: 'Tu cuenta está desactivada. Contacta al administrador.'
            });
        }

        // Comprobar contraseña
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: 'Correo o contraseña incorrectos'
            });
        }

        // Generar token
        const token = jwt.sign(
            {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        return res.status(200).json({
            mensaje: 'Inicio de sesión correcto',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('ERROR COMPLETO EN LOGIN:', error);

        return res.status(500).json({
            mensaje: 'Error interno al iniciar sesión'
        });
    }
}

module.exports = {
    registrar,
    login
};
