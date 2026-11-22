
/* =====================================================
   VARIABLES GLOBALES
===================================================== */

let mapa;
let marcadoresMapa = [];


/* =====================================================
   INICIALIZACIÓN DEL DASHBOARD
===================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    if (!exigirSesion()) return;

    try {

        const usuario = JSON.parse(
            localStorage.getItem('usuario') || 'null'
        );

        if (!usuario) {
            cerrarSesion();
            return;
        }

        // Información del usuario
        document.getElementById('nombreUsuario').textContent =
            `${usuario.nombre} - ${usuario.rol}`;

        // Permisos según el rol
        if (usuario.rol !== 'CIUDADANO') {

            document.getElementById('btnNuevoReporte').hidden = true;

        }

        if (usuario.rol === 'ADMINISTRADOR') {

            document.getElementById('menuAdministracion').hidden = false;

        }

        // Botón cerrar sesión
        const btnCerrarSesion = document.getElementById('btnCerrarSesion');

        if (btnCerrarSesion) {

            btnCerrarSesion.addEventListener('click', cerrarSesion);

        }

        // Inicializar mapa
        inicializarMapa();

        // Consultar información del backend
        const [estadisticas, reportes, respuestaMapa] =
            await Promise.all([

                API.get('/dashboard/estadisticas'),

                API.get('/reportes'),

                fetch('/api/reportes/mapa/publico')

                    .then(async respuesta => {

                        if (!respuesta.ok) {

                            throw new Error(
                                `Error al consultar el mapa: ${respuesta.status}`
                            );

                        }

                        return respuesta.json();

                    })

            ]);

        // Mostrar información
        mostrarEstadisticas(estadisticas);

        mostrarReportes(reportes);

        mostrarCategorias(estadisticas.categorias || []);

        // Los marcadores se agregan cuando MapLibre termina de cargar
        mostrarMapa(respuestaMapa);

    } catch (error) {

        console.error('Error al cargar el dashboard:', error);

        alert(error.message || 'No fue posible cargar el panel.');

    }

});


/* =====================================================
   INICIALIZAR MAPA CON MAPLIBRE Y OPENFREEMAP
===================================================== */

function inicializarMapa() {

    const contenedor = document.getElementById('mapa');

    if (!contenedor) {

        console.error('No se encontró el contenedor del mapa.');

        return;

    }

    if (typeof maplibregl === 'undefined') {

        console.error('MapLibre GL no está disponible.');

        contenedor.innerHTML =
            '<p class="text-danger p-3">No fue posible cargar la biblioteca del mapa.</p>';

        return;

    }

    if (mapa) return;

    mapa = new maplibregl.Map({

        container: 'mapa',

        style: 'https://tiles.openfreemap.org/styles/liberty',

        center: [-72.64591, 2.57286],

        zoom: 10,

        minZoom: 5,

        maxZoom: 18,

        attributionControl: true

    });

    // Controles de navegación
    mapa.addControl(

        new maplibregl.NavigationControl(),

        'top-right'

    );

    // Control de pantalla completa
    mapa.addControl(

        new maplibregl.FullscreenControl(),

        'top-right'

    );

    // Evento de carga
    mapa.on('load', () => {

        console.log(
            'Mapa del dashboard cargado correctamente.'
        );

        mapa.resize();

    });

    // Detectar errores
    mapa.on('error', evento => {

        console.error(
            'Error en MapLibre:',
            evento.error
        );

    });

}


/* =====================================================
   MOSTRAR REPORTES EN EL MAPA
===================================================== */

function mostrarMapa(reportes) {

    if (!mapa) {

        console.error('El mapa no está inicializado.');

        return;

    }

    if (!Array.isArray(reportes)) {

        console.error(
            'La respuesta del mapa no contiene un arreglo:',
            reportes
        );

        return;

    }

    // Esperar a que el mapa esté disponible
    if (!mapa.isStyleLoaded()) {

        mapa.once('load', () => {

            agregarMarcadores(reportes);

        });

        return;

    }

    agregarMarcadores(reportes);

}


/* =====================================================
   AGREGAR MARCADORES
===================================================== */

function agregarMarcadores(reportes) {

    if (!mapa) return;

    const limites = new maplibregl.LngLatBounds();

    let cantidadMarcadores = 0;

    reportes.forEach(reporte => {

        const lat = Number(reporte.latitud);

        const lng = Number(reporte.longitud);

        // Validar coordenadas
        if (

            !Number.isFinite(lat) ||

            !Number.isFinite(lng) ||

            lat < -90 ||

            lat > 90 ||

            lng < -180 ||

            lng > 180 ||

            (lat === 0 && lng === 0)

        ) {

            console.warn(
                'Reporte con coordenadas inválidas:',
                reporte.id
            );

            return;

        }

        // Crear contenido del marcador
        const contenidoPopup = `

            <div class="map-popup">

                <h6>
                    ${escaparHTML(reporte.titulo || 'Reporte ambiental')}
                </h6>

                <p>
                    <strong>Categoría:</strong>
                    ${escaparHTML(reporte.categoria || 'Sin categoría')}
                </p>

                <p>
                    <strong>Estado:</strong>
                    ${escaparHTML(reporte.estado || 'Sin estado')}
                </p>

                <a
                    href="detalle-reporte.html?id=${encodeURIComponent(reporte.id)}"
                    class="btn btn-sm btn-success">

                    Consultar reporte

                </a>

            </div>

        `;

        // Crear marcador
        const marcador = new maplibregl.Marker({

            color: '#198754',

            scale: 1.1

        })

        .setLngLat([lng, lat])

        .setPopup(

            new maplibregl.Popup({

                offset: 25,

                maxWidth: '300px'

            }).setHTML(contenidoPopup)

        )

        .addTo(mapa);

        marcadoresMapa.push(marcador);

        limites.extend([lng, lat]);

        cantidadMarcadores++;

    });

    // Ajustar mapa según las ubicaciones
    if (cantidadMarcadores > 1) {

        mapa.fitBounds(limites, {

            padding: 60,

            maxZoom: 13,

            duration: 1000

        });

    } else if (cantidadMarcadores === 1) {

        mapa.flyTo({

            center: limites.getCenter(),

            zoom: 13,

            duration: 1000

        });

    }

    console.log(
        `Se visualizaron ${cantidadMarcadores} reportes en el mapa.`
    );

}


/* =====================================================
   MOSTRAR ESTADÍSTICAS
===================================================== */

function mostrarEstadisticas(data) {

    const t = data.totales || {};

    document.getElementById('total').textContent =
        t.total || 0;

    document.getElementById('registrados').textContent =
        t.registrados || 0;

    document.getElementById('revision').textContent =

        Number(t.en_revision || 0) +

        Number(t.complementarios || 0);

    document.getElementById('cerrados').textContent =
        t.cerrados || 0;

}


/* =====================================================
   MOSTRAR CATEGORÍAS
===================================================== */

function mostrarCategorias(categorias) {

    const contenedor = document.getElementById('categorias');

    if (!contenedor) return;

    if (!Array.isArray(categorias) || categorias.length === 0) {

        contenedor.innerHTML = `

            <div class="text-center text-muted py-4">

                <i class="bi bi-bar-chart fs-2"></i>

                <p class="mt-2">
                    No hay categorías registradas.
                </p>

            </div>

        `;

        return;

    }

    contenedor.innerHTML = categorias.map(c => `

        <div class="d-flex justify-content-between border-bottom py-2">

            <span>
                ${escaparHTML(c.nombre)}
            </span>

            <strong>
                ${Number(c.cantidad) || 0}
            </strong>

        </div>

    `).join('');

}


/* =====================================================
   MOSTRAR ÚLTIMOS REPORTES
===================================================== */

function mostrarReportes(reportes) {

    const contenedor = document.getElementById('ultimosReportes');

    if (!contenedor) return;

    if (!Array.isArray(reportes) || reportes.length === 0) {

        contenedor.innerHTML = `

            <div class="text-center text-muted py-4">

                <i class="bi bi-inbox fs-2"></i>

                <p class="mt-2">
                    No hay reportes registrados.
                </p>

            </div>

        `;

        return;

    }

    contenedor.innerHTML = reportes.slice(0, 5).map(r => `

        <div class="border-bottom py-3">

            <strong>
                ${escaparHTML(r.titulo)}
            </strong>

            <span class="badge bg-secondary ms-2">

                ${escaparHTML(r.estado)}

            </span>

            <br>

            <small class="text-muted">

                ${escaparHTML(r.categoria)}

            </small>

            <br>

            <a href="detalle-reporte.html?id=${encodeURIComponent(r.id)}">

                Consultar detalle

            </a>

        </div>

    `).join('');

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escaparHTML(texto) {

    return String(texto ?? '').replace(/[&<>"']/g, caracter => {

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


/* =====================================================
   CERRAR SESIÓN
===================================================== */

function cerrarSesion() {

    console.log('Cerrando sesión...');

    // Eliminar token de autenticación
    localStorage.removeItem('token');

    // Eliminar información del usuario
    localStorage.removeItem('usuario');

    // Limpiar información temporal de sesión
    sessionStorage.clear();

    // Redirigir al inicio
    window.location.replace('/index.html');

}
