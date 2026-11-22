
let todosLosReportes = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!exigirSesion()) return;

    todosLosReportes = await API.get('/reportes');

    document.getElementById('busqueda')
        .addEventListener('input', filtrar);

    document.getElementById('filtroEstado')
        .addEventListener('change', filtrar);

    filtrar();
});

function filtrar() {
    const texto = document.getElementById('busqueda').value.toLowerCase();
    const estado = document.getElementById('filtroEstado').value;

    const resultado = todosLosReportes.filter(r => {
        const coincideTexto =
            `${r.titulo} ${r.categoria}`.toLowerCase().includes(texto);

        return coincideTexto && (!estado || r.estado === estado);
    });

    const contenedor = document.getElementById('listaReportes');

    if (!resultado.length) {
        contenedor.innerHTML = '<div class="alert alert-info">No se encontraron reportes.</div>';
        return;
    }

    contenedor.innerHTML = resultado.map(r => `
        <div class="card shadow-sm mb-3">
            <div class="card-body">
                <h5>${escaparHTML(r.titulo)}</h5>
                <p>${escaparHTML(r.descripcion)}</p>
                <p class="text-muted">
                    Categoría: ${escaparHTML(r.categoria)}<br>
                    Fecha: ${escaparHTML(r.fecha_evento)}<br>
                    Estado: ${escaparHTML(r.estado)}
                </p>
                <a class="btn btn-success btn-sm"
                   href="detalle-reporte.html?id=${encodeURIComponent(r.id)}">
                    Consultar
                </a>
            </div>
        </div>
    `).join('');
}
