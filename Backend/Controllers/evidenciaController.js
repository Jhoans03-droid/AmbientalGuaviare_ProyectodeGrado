
const pool = require('../Config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const CARPETA = path.join(__dirname, '../private_uploads');

async function guardarEvidencias(req, res) {
    const conexion = await pool.getConnection();
    const archivosGuardados = [];

    try {
        const reporteId = Number(req.params.id);

        const [reportes] = await conexion.query(`
            SELECT id, usuario_id
            FROM reportes
            WHERE id = ?
        `, [reporteId]);

        if (!reportes.length) {
            return res.status(404).json({
                mensaje: 'Reporte no encontrado'
            });
        }

        const reporte = reportes[0];

        const esPropietario =
            reporte.usuario_id === req.usuario.id;

        const puedeGestionar = [
            'GESTOR',
            'AUTORIDAD'
        ].includes(req.usuario.rol);

        if (!esPropietario && !puedeGestionar) {
            return res.status(403).json({
                mensaje: 'No puedes modificar este reporte'
            });
        }

        if (!req.files || !req.files.length) {
            return res.status(400).json({
                mensaje: 'Debes adjuntar al menos una fotografía'
            });
        }

        await fs.mkdir(CARPETA, { recursive: true });

        await conexion.beginTransaction();

        for (const archivo of req.files) {
            const imagen = sharp(archivo.buffer, {
                limitInputPixels: 25000000
            });

            const metadata = await imagen.metadata();

            if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
                throw new Error('El contenido del archivo no es una imagen permitida');
            }

            if (!metadata.width || !metadata.height) {
                throw new Error('Imagen no válida');
            }

            const nombre = crypto.randomUUID() + '.jpg';

            const destino = path.join(CARPETA, nombre);

            const resultado = await imagen
                .rotate()
                .resize({
                    width: 2000,
                    height: 2000,
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 85 })
                .toBuffer();

            await fs.writeFile(destino, resultado);

            archivosGuardados.push(destino);

            await conexion.query(`
                INSERT INTO evidencias
                (
                    reporte_id,
                    nombre_original,
                    nombre_archivo,
                    tipo_mime,
                    tamanio
                )
                VALUES (?, ?, ?, 'image/jpeg', ?)
            `, [
                reporteId,
                path.basename(archivo.originalname).slice(0, 255),
                nombre,
                resultado.length
            ]);
        }

        await conexion.commit();

        res.status(201).json({
            mensaje: 'Evidencias almacenadas correctamente',
            cantidad: archivosGuardados.length
        });

    } catch (error) {
        await conexion.rollback();

        await Promise.all(
            archivosGuardados.map(file =>
                fs.unlink(file).catch(() => {})
            )
        );

        console.error(error);

        res.status(400).json({
            mensaje: error.message || 'No fue posible guardar las evidencias'
        });

    } finally {
        conexion.release();
    }
}

async function obtenerEvidencia(req, res) {
    try {
        const id = Number(req.params.id);

        const [filas] = await pool.query(`
            SELECT
                e.nombre_archivo,
                r.usuario_id
            FROM evidencias e
            INNER JOIN reportes r ON r.id = e.reporte_id
            WHERE e.id = ?
        `, [id]);

        if (!filas.length) {
            return res.status(404).json({
                mensaje: 'Evidencia no encontrada'
            });
        }

        const evidencia = filas[0];

        const puedeVer =
            evidencia.usuario_id === req.usuario.id ||
            ['GESTOR', 'AUTORIDAD', 'ADMINISTRADOR']
                .includes(req.usuario.rol);

        if (!puedeVer) {
            return res.status(403).json({
                mensaje: 'No tienes permiso para visualizar esta evidencia'
            });
        }

        const archivo = path.join(
            CARPETA,
            path.basename(evidencia.nombre_archivo)
        );

        res.type('jpeg');
        res.setHeader('Cache-Control', 'private, no-store');
        res.sendFile(archivo);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            mensaje: 'Error al consultar evidencia'
        });
    }
}

module.exports = {
    guardarEvidencias,
    obtenerEvidencia
};
