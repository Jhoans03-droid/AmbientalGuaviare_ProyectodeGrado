
let mapa;
let marcador;

document.addEventListener('DOMContentLoaded', async () => {

    if (!exigirSesion()) return;

    const formulario = document.getElementById('formReporte');

    if (!formulario) return;

    // Inicializar mapa
    inicializarMapa();

    // Cargar categorías
    await cargarCategorias();

    // Registrar reporte
    formulario.addEventListener('submit', registrarReporte);

    // Botón de ubicación
    const btnUbicacion = document.getElementById('btnUbicacion');

    if (btnUbicacion) {
        btnUbicacion.addEventListener('click', utilizarUbicacion);
    }

    // Fecha máxima
    const fechaEvento = document.getElementById('fecha_evento');

    if (fechaEvento) {
        fechaEvento.max = new Date().toISOString().split('T')[0];
    }

});


/* =====================================================
   MAPA
===================================================== */

function inicializarMapa() {

    const contenedor = document.getElementById('map');

    if (!contenedor) {
        console.error('No se encontró el contenedor del mapa.');
        return;
    }

    if (typeof maplibregl === 'undefined') {
        console.error('MapLibre no está cargado.');
        return;
    }

    if (mapa) return;

    mapa = new maplibregl.Map({

        container: 'map',

        style: 'https://tiles.openfreemap.org/styles/liberty',

        center: [-72.64591, 2.57286],

        zoom: 12,

        attributionControl: true

    });

    // Controles de navegación
    mapa.addControl(
        new maplibregl.NavigationControl(),
        'top-right'
    );

    // Detectar errores de carga
    mapa.on('error', evento => {

        console.error(
            'Error al cargar el mapa:',
            evento.error
        );

    });

    // Mapa cargado
    mapa.on('load', () => {

        console.log('Mapa cargado correctamente con OpenFreeMap.');

        mapa.resize();

    });

    // Seleccionar ubicación haciendo clic
    mapa.on('click', evento => {

        const lat = evento.lngLat.lat;
        const lng = evento.lngLat.lng;

        colocarMarcador(lat, lng);

    });

}


function colocarMarcador(lat, lng) {

    if (!mapa) return;

    if (marcador) {
        marcador.remove();
    }

    marcador = new maplibregl.Marker({
        color: '#dc3545',
        draggable: false
    })
    .setLngLat([lng, lat])
    .addTo(mapa);

    document.getElementById('latitud').value =
        lat.toFixed(8);

    document.getElementById('longitud').value =
        lng.toFixed(8);

}


/* ==========================================
   UBICACIÓN ACTUAL
========================================== */

function utilizarUbicacion() {

    if (!navigator.geolocation) {

        alert('Tu navegador no permite obtener la ubicación.');

        return;

    }

    if (!mapa) {

        alert('El mapa todavía no está disponible.');

        return;

    }

    navigator.geolocation.getCurrentPosition(

        posicion => {

            const lat = posicion.coords.latitude;
            const lng = posicion.coords.longitude;

            colocarMarcador(lat, lng);

            mapa.flyTo({

                center: [lng, lat],

                zoom: 16,

                essential: true

            });

        },

        error => {

            console.error('Error de geolocalización:', error);

            alert('No fue posible obtener la ubicación.');

        },

        {

            enableHighAccuracy: true,

            timeout: 15000,

            maximumAge: 0

        }

    );

}


/* =====================================================
   UBICACIÓN ACTUAL
===================================================== */

function utilizarUbicacion() {

    if (!navigator.geolocation) {
        alert('Tu navegador no permite obtener la ubicación.');
        return;
    }

    navigator.geolocation.getCurrentPosition(

        posicion => {

            const lat = posicion.coords.latitude;
            const lng = posicion.coords.longitude;

            colocarMarcador(lat, lng);

            mapa.setView([lat, lng], 16);

        },

        () => {
            alert('No fue posible obtener la ubicación.');
        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }

    );
}


/* =====================================================
   CARGAR CATEGORÍAS DESDE MYSQL
===================================================== */

async function cargarCategorias() {

    const select = document.getElementById('categoria_id');

    if (!select) return;

    // Estado inicial
    select.innerHTML = `
        <option value="">Cargando categorías...</option>
    `;

    select.disabled = true;

    try {

        const respuesta = await fetch('/api/categorias');

        if (!respuesta.ok) {
            throw new Error(`Error del servidor: ${respuesta.status}`);
        }

        const categorias = await respuesta.json();

        select.innerHTML = `
            <option value="">Seleccionar categoría</option>
        `;

        if (!Array.isArray(categorias) || categorias.length === 0) {

            select.innerHTML = `
                <option value="">No hay categorías disponibles</option>
            `;

            return;
        }

        categorias.forEach(categoria => {

            const opcion = document.createElement('option');

            opcion.value = categoria.id;

            opcion.textContent = categoria.nombre;

            select.appendChild(opcion);

        });

        console.log('Categorías cargadas correctamente:', categorias);

    } catch (error) {

        console.error('Error al cargar categorías:', error);

        select.innerHTML = `
            <option value="">Error al cargar categorías</option>
        `;

        mostrarMensaje(
            'No fue posible cargar las categorías. Verifica la conexión con el servidor.',
            'danger'
        );

    } finally {

        select.disabled = false;

    }
}


/* =====================================================
   REGISTRAR REPORTE
===================================================== */

async function registrarReporte(event) {

    event.preventDefault();

    try {

        const archivos = document.getElementById('fotografias').files;

        // Validar cantidad de fotografías
        if (archivos.length > 5) {
            throw new Error('Solo puedes adjuntar cinco fotografías.');
        }

        // Validar tamaño
        for (const archivo of archivos) {

            if (archivo.size > 5 * 1024 * 1024) {
                throw new Error('Cada fotografía debe pesar máximo 5 MB.');
            }

        }

        // Validar ubicación
        const latitud = document.getElementById('latitud').value;
        const longitud = document.getElementById('longitud').value;

        if (latitud === '' || longitud === '') {
            throw new Error('Selecciona una ubicación en el mapa.');
        }

        // Validar categoría
        const categoriaId = document.getElementById('categoria_id').value;

        if (!categoriaId) {
            throw new Error('Selecciona una categoría para el reporte.');
        }

        // Construir datos
        const datos = {

            titulo: document.getElementById('titulo').value.trim(),

            categoria_id: Number(categoriaId),

            fecha_evento: document.getElementById('fecha_evento').value,

            descripcion: document.getElementById('descripcion').value.trim(),

            latitud: Number(latitud),

            longitud: Number(longitud),

            precision_ubicacion: document.getElementById('precision_ubicacion').value,

            visibilidad_ubicacion: document.getElementById('visibilidad_ubicacion').value,

            direccion: document.getElementById('direccion').value.trim()

        };

        // Registrar reporte
        const resultado = await API.post('/reportes', datos);

        // Subir evidencias
        if (archivos.length > 0) {

            const formData = new FormData();

            for (const archivo of archivos) {
                formData.append('fotografias', archivo);
            }

            await API.post(
                `/evidencias/${resultado.reporteId}`,
                formData
            );

        }

        mostrarMensaje(
            `Reporte #${resultado.reporteId} registrado correctamente.`,
            'success'
        );

        document.getElementById('formReporte').reset();

        if (marcador) {

            marcador.remove();

            marcador = null;

        }

        setTimeout(() => {

            location.href = `/detalle-reporte.html?id=${resultado.reporteId}`;

        }, 1200);

    } catch (error) {

        console.error('Error al registrar reporte:', error);

        mostrarMensaje(error.message, 'danger');

    }

}


/* =====================================================
   MOSTRAR MENSAJES
===================================================== */

function mostrarMensaje(texto, tipo) {

    const mensaje = document.getElementById('mensaje');

    if (!mensaje) return;

    mensaje.className = `alert alert-${tipo} mt-3`;

    mensaje.textContent = texto;

}
