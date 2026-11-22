
let reporteActual;
let usuarioActual;
let evidenciasActuales = [];

const idReporte = new URLSearchParams(location.search).get('id');

document.addEventListener('DOMContentLoaded', async () => {

    if (!exigirSesion()) return;

    if (!idReporte || !/^\d+$/.test(idReporte)) {
        location.href = 'reportes.html';
        return;
    }

    usuarioActual = JSON.parse(localStorage.getItem('usuario'));

    try {

        await cargarDetalle();
        await cargarHistorial();
        await cargarEvidencias();
        await cargarSolicitudes();

        configurarGestion();

    } catch (error) {

        mostrarMensaje(error.message, 'danger');

    }

});


function mostrarMensaje(texto, tipo) {

    const mensaje = document.getElementById('mensaje');

    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo} mt-3`;

}


async function cargarDetalle() {

    const data = await API.get(`/reportes/${idReporte}`);

    reporteActual = data.reporte;

    // Guardar las imágenes asociadas al reporte
    evidenciasActuales = Array.isArray(data.evidencias)
        ? data.evidencias
        : [];

    const esPersonal = [
        'GESTOR',
        'AUTORIDAD',
        'ADMINISTRADOR'
    ].includes(usuarioActual.rol);

    // Botón para visualizar el soporte
    const botonSoporte = evidenciasActuales.length > 0
        ? `
            <button
                type="button"
                class="btn btn-outline-success btn-sm mt-3"
                onclick="verSoporte(${Number(evidenciasActuales[0].id)})">

                <i class="bi bi-image me-2"></i>
                Ver soporte

            </button>
        `
        : `
            <div class="text-muted small mt-3">
                <i class="bi bi-image me-1"></i>
                Este reporte no tiene imágenes adjuntas.
            </div>
        `;

    document.getElementById('detalle').innerHTML = `

        <div class="card shadow-sm p-4">

            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">

                <div>

                    <h2>${escaparHTML(reporteActual.titulo)}</h2>

                    <p class="text-muted">
                        Reporte #${escaparHTML(reporteActual.id)}
                    </p>

                </div>

                <span class="badge bg-success">
                    ${escaparHTML(reporteActual.estado)}
                </span>

            </div>

            <hr>

            <p>
                <strong>Categoría:</strong>
                ${escaparHTML(reporteActual.categoria)}
            </p>

            <p>
                <strong>Fecha del evento:</strong>
                ${escaparHTML(reporteActual.fecha_evento)}
            </p>

            <p><strong>Descripción:</strong></p>

            <p>
                ${escaparHTML(reporteActual.descripcion)}
            </p>

            ${esPersonal ? `

                <hr>

                <p>
                    <strong>Reportante:</strong>
                    ${escaparHTML(reporteActual.reportante)}
                </p>

                <p>
                    <strong>Ubicación:</strong>
                    ${escaparHTML(reporteActual.latitud)},
                    ${escaparHTML(reporteActual.longitud)}
                </p>

            ` : ''}

            ${botonSoporte}

        </div>

    `;

    const puedeGestionar = [
        'GESTOR',
        'AUTORIDAD'
    ].includes(usuarioActual.rol);

    document.getElementById('panelGestion').hidden = !puedeGestionar;

    document.getElementById('panelCiudadano').hidden =
        usuarioActual.rol !== 'CIUDADANO';

}


// =============================================
// HISTORIAL
// =============================================

async function cargarHistorial() {

    const historial = await API.get(`/seguimientos/${idReporte}`);

    const contenedor = document.getElementById('historial');

    if (!historial.length) {

        contenedor.textContent = 'No hay movimientos registrados.';
        return;

    }

    contenedor.innerHTML = historial.map(h => `

        <div class="border-start border-success border-3 ps-3 mb-3">

            <strong>${escaparHTML(h.estado_nuevo)}</strong>

            <p>${escaparHTML(h.observacion || '')}</p>

            <small class="text-muted">

                ${escaparHTML(h.nombre)}
                ${escaparHTML(h.apellido || '')}

                · ${escaparHTML(h.fecha)}

            </small>

        </div>

    `).join('');

}


// =============================================
// EVIDENCIAS
// =============================================


async function cargarEvidencias() {

    const contenedor = document.getElementById('evidencias');

    contenedor.innerHTML = '';

    if (!evidenciasActuales.length) {

        contenedor.innerHTML = `
            <div class="col-12">
                <p class="text-muted">
                    <i class="bi bi-image me-2"></i>
                    No se han adjuntado fotografías.
                </p>
            </div>
        `;

        return;
    }

    for (const e of evidenciasActuales) {

        const id = Number(e.id);

        const columna = document.createElement('div');

        columna.className = 'col-md-4 col-lg-3 mb-3';

        columna.innerHTML = `
            <div class="evidencia-card">

                <div class="evidencia-preview" id="preview-${id}">
                    <span class="text-muted small">
                        <i class="bi bi-hourglass-split"></i>
                        Cargando imagen...
                    </span>
                </div>

                <div class="evidencia-actions">

                    <button
                        type="button"
                        class="btn-soporte"
                        onclick="verSoporte(${id})">

                        <i class="bi bi-eye"></i>
                        Ver soporte

                    </button>

                    <button
                        type="button"
                        class="btn-soporte-icon"
                        title="Abrir en otra pestaña"
                        aria-label="Abrir imagen en otra pestaña"
                        onclick="abrirSoporteNuevaPestana(${id})">

                        <i class="bi bi-box-arrow-up-right"></i>

                    </button>

                </div>

            </div>
        `;

        contenedor.appendChild(columna);

        // Obtener imagen con el token JWT
        try {

            const url = await obtenerImagenAutorizada(id);

            const preview = document.getElementById(`preview-${id}`);

            if (!preview) {
                URL.revokeObjectURL(url);
                continue;
            }

            const imagen = document.createElement('img');

            imagen.src = url;
            imagen.alt = 'Soporte del reporte';
            imagen.className = 'evidencia-thumbnail';
            imagen.loading = 'lazy';

            preview.innerHTML = '';
            preview.appendChild(imagen);

        } catch (error) {

            const preview = document.getElementById(`preview-${id}`);

            if (preview) {
                preview.innerHTML = `
                    <div class="text-danger small p-3">
                        <i class="bi bi-exclamation-circle"></i>
                        No se pudo cargar la imagen.
                    </div>
                `;
            }

            console.error('Error cargando evidencia:', error);

        }

    }

}



// =============================================
// VISUALIZAR SOPORTE
// =============================================

// =============================================
// OBTENER IMAGEN CON AUTENTICACIÓN
// =============================================

async function obtenerImagenAutorizada(id) {

    // Ajustar esta clave si api.js guarda el JWT con otro nombre
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No se encontró el token de autenticación.');
    }

    const respuesta = await fetch(
        `/api/evidencias/archivo/${encodeURIComponent(id)}`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'same-origin'
        }
    );

    if (!respuesta.ok) {

        if (respuesta.status === 401) {
            throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
        }

        if (respuesta.status === 403) {
            throw new Error('No tienes permisos para visualizar esta imagen.');
        }

        throw new Error('No fue posible cargar el soporte.');

    }

    const blob = await respuesta.blob();

    if (!blob.type.startsWith('image/')) {
        throw new Error('El archivo recibido no es una imagen.');
    }

    return URL.createObjectURL(blob);
}


// =============================================
// VISUALIZAR SOPORTE EN MODAL
// =============================================

let imagenSoporteURL = null;

async function verSoporte(id) {

    const existe = evidenciasActuales.some(
        e => Number(e.id) === Number(id)
    );

    if (!existe) {
        mostrarMensaje('No se encontró la evidencia del reporte.', 'danger');
        return;
    }

    const imagen = document.getElementById('imagenSoporte');

    try {

        imagen.alt = 'Cargando soporte...';

        const nuevaURL = await obtenerImagenAutorizada(id);

        // Liberar la URL anterior
        if (imagenSoporteURL) {
            URL.revokeObjectURL(imagenSoporteURL);
        }

        imagenSoporteURL = nuevaURL;

        imagen.src = nuevaURL;
        imagen.alt = 'Soporte del reporte';

        bootstrap.Modal
            .getOrCreateInstance(document.getElementById('modalSoporte'))
            .show();

    } catch (error) {

        mostrarMensaje(error.message, 'danger');

    }

}


// =============================================
// ABRIR SOPORTE EN OTRA PESTAÑA
// =============================================

async function abrirSoporteNuevaPestana(id) {

    const existe = evidenciasActuales.some(
        e => Number(e.id) === Number(id)
    );

    if (!existe) {
        mostrarMensaje('No se encontró la evidencia.', 'danger');
        return;
    }

    // Abrir la pestaña inmediatamente para evitar bloqueadores
    const nuevaPestana = window.open('about:blank', '_blank');

    if (!nuevaPestana) {
        mostrarMensaje('El navegador bloqueó la nueva pestaña.', 'warning');
        return;
    }

    try {

        nuevaPestana.document.write(
            '<p style="font-family:Arial;text-align:center;margin-top:50px">Cargando imagen...</p>'
        );

        const url = await obtenerImagenAutorizada(id);

        nuevaPestana.location.href = url;

        // Liberar la URL cuando se cierre la pestaña
        const liberarURL = setInterval(() => {

            if (nuevaPestana.closed) {
                URL.revokeObjectURL(url);
                clearInterval(liberarURL);
            }

        }, 1000);

    } catch (error) {

        nuevaPestana.close();

        mostrarMensaje(error.message, 'danger');

    }

}


// =============================================
// LIBERAR IMAGEN DEL MODAL
// =============================================

document.getElementById('modalSoporte')?.addEventListener(
    'hidden.bs.modal',
    () => {

        document.getElementById('imagenSoporte').src = '';

        if (imagenSoporteURL) {
            URL.revokeObjectURL(imagenSoporteURL);
            imagenSoporteURL = null;
        }

    }
);


// Limpiar imagen al cerrar el modal
document.getElementById('modalSoporte')?.addEventListener(
    'hidden.bs.modal',
    () => {

        document.getElementById('imagenSoporte').src = '';

    }
);


// =============================================
// SOLICITUDES
// =============================================

async function cargarSolicitudes() {

    if (usuarioActual.rol !== 'CIUDADANO') return;

    const solicitudes = await API.get(
        `/seguimientos/${idReporte}/solicitudes`
    );

    const contenedor = document.getElementById('solicitudes');

    if (!solicitudes.length) {

        contenedor.textContent = 'No hay solicitudes de información.';

        return;

    }

    contenedor.innerHTML = solicitudes.map(s => `

        <div class="border rounded p-3 mb-3">

            <p>${escaparHTML(s.descripcion)}</p>

            <span class="badge bg-secondary">
                ${escaparHTML(s.estado)}
            </span>

            ${s.estado === 'PENDIENTE' ? `

                <textarea
                    id="respuesta-${Number(s.id)}"
                    class="form-control my-2"
                    placeholder="Escribe tu respuesta...">
                </textarea>

                <button
                    class="btn btn-success btn-sm"
                    onclick="responderSolicitud(${Number(s.id)})">

                    Responder

                </button>

            ` : `

                <p>${escaparHTML(s.respuesta || '')}</p>

            `}

        </div>

    `).join('');

}


// =============================================
// GESTIÓN
// =============================================

function configurarGestion() {

    if (!['GESTOR', 'AUTORIDAD'].includes(usuarioActual.rol)) {
        return;
    }

    const btnEstado = document.getElementById('btnEstado');

    const select = document.getElementById('nuevoEstado');

    if (usuarioActual.rol === 'GESTOR') {

        select.querySelector('[value="VERIFICADO"]')?.remove();

        select.querySelector('[value="CERRADO"]')?.remove();

    }

    btnEstado.addEventListener('click', async () => {

        try {

            await API.put(`/seguimientos/${idReporte}/estado`, {

                nuevoEstado: select.value,

                observacion: document.getElementById('observacion').value

            });

            mostrarMensaje('Seguimiento actualizado.', 'success');

            await cargarDetalle();

            await cargarHistorial();

        } catch (error) {

            mostrarMensaje(error.message, 'danger');

        }

    });


    document.getElementById('btnSolicitud')
        .addEventListener('click', async () => {

            try {

                await API.post(
                    `/seguimientos/${idReporte}/solicitudes`,
                    {
                        descripcion: document.getElementById('solicitudTexto').value
                    }
                );

                mostrarMensaje('Solicitud enviada.', 'success');

            } catch (error) {

                mostrarMensaje(error.message, 'danger');

            }

        });

}


// =============================================
// RESPONDER SOLICITUD
// =============================================

async function responderSolicitud(id) {

    try {

        const respuesta = document
            .getElementById(`respuesta-${id}`)
            .value;

        await API.post(
            `/seguimientos/solicitudes/${id}/responder`,
            { respuesta }
        );

        mostrarMensaje('Respuesta enviada.', 'success');

        await cargarSolicitudes();

    } catch (error) {

        mostrarMensaje(error.message, 'danger');

    }

}
