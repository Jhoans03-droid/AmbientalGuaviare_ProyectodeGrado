
// ==========================================
// AUTENTICACIÓN Y REGISTRO DE USUARIOS
// ==========================================

// Procesar respuestas del servidor
async function procesarRespuesta(respuesta) {
    const contenido = await respuesta.text();

    let data;

    try {
        data = contenido ? JSON.parse(contenido) : {};
    } catch {
        throw new Error(
            `Error del servidor (${respuesta.status}): ${contenido || 'Respuesta no válida'}`
        );
    }

    if (!respuesta.ok) {
        throw new Error(
            data.mensaje || 'No fue posible completar la solicitud.'
        );
    }

    return data;
}


// ==========================================
// INICIO DE SESIÓN
// ==========================================

async function iniciarSesion(event) {
    event.preventDefault();

    const formulario = document.getElementById('formLogin');
    const mensaje = document.getElementById('mensaje');

    const boton = formulario.querySelector(
        'button[type="submit"]'
    );

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Iniciando sesión...';
        }

        mensaje.textContent = '';

        const respuesta = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await procesarRespuesta(respuesta);

        localStorage.setItem('token', data.token);

        localStorage.setItem(
            'usuario',
            JSON.stringify(data.usuario)
        );

        window.location.href = '/dashboard.html';

    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        mensaje.textContent = error.message;
        mensaje.className = 'alert alert-danger mt-3';

    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Iniciar sesión';
        }
    }
}


// ==========================================
// REGISTRO DE USUARIOS
// ==========================================

async function registrarUsuario(event) {
    event.preventDefault();

    const formulario = document.getElementById('formRegistro');
    const mensaje = document.getElementById('mensaje');

    const boton = formulario.querySelector(
        'button[type="submit"]'
    );

    const datos = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        password: document.getElementById('password').value
    };

    try {
        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Registrando...';
        }

        mensaje.textContent = '';

        const respuesta = await fetch('/api/auth/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        await procesarRespuesta(respuesta);

        mensaje.textContent =
            'Cuenta creada correctamente. Ya puedes iniciar sesión.';

        mensaje.className = 'alert alert-success mt-3';

        formulario.reset();

    } catch (error) {
        console.error('Error al registrar usuario:', error);

        mensaje.textContent = error.message;
        mensaje.className = 'alert alert-danger mt-3';

    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = 'Registrarme';
        }
    }
}


// ==========================================
// ASOCIAR EVENTOS A LOS FORMULARIOS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    const formularioLogin = document.getElementById('formLogin');

    if (formularioLogin) {
        formularioLogin.addEventListener(
            'submit',
            iniciarSesion
        );
    }

    const formularioRegistro = document.getElementById('formRegistro');

    if (formularioRegistro) {
        formularioRegistro.addEventListener(
            'submit',
            registrarUsuario
        );
    }

});
