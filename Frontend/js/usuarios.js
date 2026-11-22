
/* ==========================================================
   ADMINISTRACIÓN DE USUARIOS
   PLATAFORMA AMBIENTAL DEL GUAVIARE
========================================================== */

let usuariosCargados = [];
let usuarioActual = null;


/* ==========================================================
   INICIALIZACIÓN
========================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    if (!exigirSesion()) return;

    try {

        usuarioActual = JSON.parse(
            localStorage.getItem('usuario')
        );

        if (!usuarioActual || usuarioActual.rol !== 'ADMINISTRADOR') {

            location.href = 'dashboard.html';
            return;

        }

        // Buscador
        const buscador = document.getElementById('buscarUsuario');

        if (buscador) {

            buscador.addEventListener('input', aplicarBusqueda);

        }

        // Eventos de la tabla
        document.getElementById('tablaUsuarios')
            .addEventListener('click', manejarAcciones);

        document.getElementById('tablaUsuarios')
            .addEventListener('change', manejarCambios);

        // Consultar usuarios
        await cargarUsuarios();

    } catch (error) {

        console.error('Error al inicializar usuarios:', error);

        mostrarMensaje(
            'No fue posible inicializar la administración de usuarios.',
            'danger'
        );

    }

});


/* ==========================================================
   CONSULTAR USUARIOS
========================================================== */

async function cargarUsuarios() {

    const tabla = document.getElementById('tablaUsuarios');

    try {

        tabla.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="spinner-border text-success mb-3"
                             role="status">
                        </div>

                        <p>Consultando usuarios...</p>
                    </div>
                </td>
            </tr>
        `;

        const respuesta = await API.get('/usuarios');

        if (!Array.isArray(respuesta)) {

            throw new Error('La respuesta del servidor no es válida.');

        }

        usuariosCargados = respuesta;

        aplicarBusqueda();

    } catch (error) {

        console.error('Error al consultar usuarios:', error);

        usuariosCargados = [];

        tabla.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="bi bi-exclamation-circle"></i>
                        </div>

                        <h5>No fue posible cargar los usuarios</h5>

                        <p>${escaparHTML(error.message)}</p>

                        <button class="btn btn-primary btn-sm"
                                data-action="recargar">
                            <i class="bi bi-arrow-clockwise"></i>
                            Intentar nuevamente
                        </button>
                    </div>
                </td>
            </tr>
        `;

    }

}


/* ==========================================================
   BUSCADOR
========================================================== */

function aplicarBusqueda() {

    const buscador = document.getElementById('buscarUsuario');

    const texto = buscador
        ? buscador.value.toLowerCase().trim()
        : '';

    const usuariosFiltrados = usuariosCargados.filter(usuario => {

        const nombre = `${usuario.nombre || ''} ${usuario.apellido || ''}`
            .toLowerCase();

        const correo = (usuario.email || '').toLowerCase();

        return nombre.includes(texto) || correo.includes(texto);

    });

    renderizarUsuarios(usuariosFiltrados);

}


/* ==========================================================
   RENDERIZAR TABLA
========================================================== */

function renderizarUsuarios(usuarios) {

    const tabla = document.getElementById('tablaUsuarios');

    const total = document.getElementById('totalUsuarios');

    if (total) {

        total.textContent = usuariosCargados.length;

    }

    if (!usuarios.length) {

        tabla.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">

                        <div class="empty-state-icon">
                            <i class="bi bi-search"></i>
                        </div>

                        <h5>No se encontraron usuarios</h5>

                        <p>
                            No hay registros que coincidan con tu búsqueda.
                        </p>

                    </div>
                </td>
            </tr>
        `;

        return;

    }

    tabla.innerHTML = usuarios.map(usuario => {

        const esPropio = Number(usuario.id) === Number(usuarioActual.id);

        const activo =
            usuario.activo === true ||
            usuario.activo === 1 ||
            usuario.activo === '1';

        const nombreCompleto = `
            ${escaparHTML(usuario.nombre)}
            ${escaparHTML(usuario.apellido || '')}
        `;

        const opcionesRoles = [
            'CIUDADANO',
            'GESTOR',
            'AUTORIDAD',
            'ADMINISTRADOR'
        ];

        return `

            <tr data-id="${Number(usuario.id)}">

                <!-- USUARIO -->
                <td>

                    <div class="user-info">

                        <div class="user-avatar">
                            <i class="bi bi-person-fill"></i>
                        </div>

                        <div>
                            <strong>${nombreCompleto}</strong>

                            ${esPropio
                                ? '<small class="user-own-label">Tu cuenta</small>'
                                : ''
                            }
                        </div>

                    </div>

                </td>


                <!-- CORREO -->
                <td>
                    <span class="user-email">
                        <i class="bi bi-envelope"></i>
                        ${escaparHTML(usuario.email)}
                    </span>
                </td>


                <!-- ROL -->
                <td>

                    <select
                        class="form-select role-select"
                        data-role-id="${Number(usuario.id)}"
                        ${esPropio ? 'disabled' : ''}>

                        ${opcionesRoles.map(rol => `

                            <option value="${rol}"
                                ${rol === usuario.rol ? 'selected' : ''}>

                                ${rol}

                            </option>

                        `).join('')}

                    </select>

                </td>


                <!-- ESTADO -->
                <td>

                    ${activo
                        ? `
                            <span class="status-badge status-active">
                                <span class="status-dot"></span>
                                Activo
                            </span>
                        `
                        : `
                            <span class="status-badge status-inactive">
                                <span class="status-dot"></span>
                                Inactivo
                            </span>
                        `
                    }

                </td>


                <!-- ACCIONES -->
                <td>

                    <div class="user-actions">

                        <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            data-action="guardar-rol"
                            data-id="${Number(usuario.id)}"
                            ${esPropio ? 'disabled' : ''}>

                            <i class="bi bi-save"></i>
                            Guardar

                        </button>

                        <button
                            type="button"
                            class="btn ${activo ? 'btn-outline-danger' : 'btn-outline-success'} btn-sm"
                            data-action="cambiar-estado"
                            data-id="${Number(usuario.id)}"
                            data-activo="${!activo}"
                            ${esPropio && activo ? 'disabled' : ''}>

                            <i class="bi ${activo ? 'bi-person-x' : 'bi-person-check'}"></i>

                            ${activo ? 'Desactivar' : 'Activar'}

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }).join('');

}


/* ==========================================================
   DETECTAR ACCIONES
========================================================== */

async function manejarAcciones(evento) {

    const boton = evento.target.closest('[data-action]');

    if (!boton) return;

    const accion = boton.dataset.action;

    const id = Number(boton.dataset.id);

    if (accion === 'guardar-rol') {

        await guardarRol(id, boton);

    }

    if (accion === 'cambiar-estado') {

        const activo = boton.dataset.activo === 'true';

        await cambiarEstado(id, activo);

    }

    if (accion === 'recargar') {

        await cargarUsuarios();

    }

}


/* ==========================================================
   DETECTAR CAMBIOS DE ROL
========================================================== */

function manejarCambios(evento) {

    if (!evento.target.matches('[data-role-id]')) return;

    const id = Number(evento.target.dataset.roleId);

    const usuario = usuariosCargados.find(
        u => Number(u.id) === id
    );

    if (!usuario) return;

    const boton = document.querySelector(
        `[data-action="guardar-rol"][data-id="${id}"]`
    );

    if (boton) {

        const cambio = evento.target.value !== usuario.rol;

        boton.disabled = !cambio;

        boton.classList.toggle('btn-primary', cambio);

        boton.classList.toggle('btn-light', !cambio);

    }

}


/* ==========================================================
   GUARDAR ROL
========================================================== */

async function guardarRol(id, boton) {

    const selector = document.querySelector(
        `[data-role-id="${id}"]`
    );

    if (!selector) return;

    const rolSeleccionado = selector.value;

    const usuario = usuariosCargados.find(
        u => Number(u.id) === id
    );

    if (!usuario) return;

    if (usuario.rol === rolSeleccionado) {

        mostrarMensaje(
            'No has realizado ningún cambio en el rol.',
            'warning'
        );

        return;

    }

    if (!confirm(
        `¿Deseas cambiar el rol de este usuario a ${rolSeleccionado}?`
    )) {

        return;

    }

    try {

        boton.disabled = true;

        boton.innerHTML = `
            <span class="spinner-border spinner-border-sm"></span>
            Guardando...
        `;

        // Actualizar rol en la base de datos
        await API.put(`/usuarios/${id}/rol`, {
            rol: rolSeleccionado
        });

        mostrarMensaje(
            'El rol del usuario se actualizó correctamente.',
            'success'
        );

        await cargarUsuarios();

    } catch (error) {

        console.error('Error al cambiar rol:', error);

        mostrarMensaje(
            error.message || 'No fue posible actualizar el rol.',
            'danger'
        );

        boton.disabled = false;

        boton.innerHTML = `
            <i class="bi bi-save"></i>
            Guardar
        `;

    }

}


/* ==========================================================
   ACTIVAR / DESACTIVAR USUARIO
========================================================== */

async function cambiarEstado(id, activo) {

    const usuario = usuariosCargados.find(
        u => Number(u.id) === id
    );

    if (!usuario) return;

    const accion = activo ? 'activar' : 'desactivar';

    const nombre = `${usuario.nombre} ${usuario.apellido || ''}`;

    if (!confirm(
        `¿Deseas ${accion} la cuenta de ${nombre}?`
    )) {

        return;

    }

    try {

        await API.put(`/usuarios/${id}/estado`, {
            activo: activo
        });

        mostrarMensaje(
            activo
                ? 'Usuario activado correctamente.'
                : 'Usuario desactivado correctamente.',
            'success'
        );

        await cargarUsuarios();

    } catch (error) {

        console.error('Error al cambiar estado:', error);

        mostrarMensaje(
            error.message || 'No fue posible actualizar el estado.',
            'danger'
        );

    }

}


/* ==========================================================
   MENSAJES
========================================================== */

function mostrarMensaje(texto, tipo) {

    const elemento = document.getElementById('mensaje');

    elemento.innerHTML = '';

    const alerta = document.createElement('div');

    alerta.className = `alert alert-${tipo} alert-dismissible fade show`;

    alerta.setAttribute('role', 'alert');

    alerta.textContent = texto;

    const cerrar = document.createElement('button');

    cerrar.type = 'button';

    cerrar.className = 'btn-close';

    cerrar.setAttribute('data-bs-dismiss', 'alert');

    cerrar.setAttribute('aria-label', 'Cerrar');

    alerta.appendChild(cerrar);

    elemento.appendChild(alerta);

}


/* ==========================================================
   PROTECCIÓN CONTRA HTML INYECTADO
========================================================== */

function escaparHTML(valor) {

    return String(valor ?? '').replace(/[&<>"']/g, caracter => {

        const entidades = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return entidades[caracter];

    });

}
