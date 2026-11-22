
require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});

const pool = require('./Config/database');
const bcrypt = require('bcryptjs');

async function crearAdministrador() {
    try {
        const [existente] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            ['admin@ambientalguaviare.local']
        );

        if (existente.length) {
            console.log('El administrador ya existe.');
            return;
        }

        const password = 'Cambiar_Admin_2026!';
        const hash = await bcrypt.hash(password, 12);

        await pool.query(`
            INSERT INTO usuarios
            (nombre, apellido, email, password_hash, rol_id)
            VALUES (?, ?, ?, ?, 4)
        `, [
            'Administrador',
            'Sistema',
            'admin@ambientalguaviare.local',
            hash
        ]);

        console.log('Administrador creado.');
        console.log('Correo: admin@ambientalguaviare.local');
        console.log('Contraseña inicial: Cambiar_Admin_2026!');
        console.log('Cambia esta contraseña antes de desplegar.');

    } catch (error) {
        console.error(error);
    } finally {
        await pool.end();
    }
}

crearAdministrador();
