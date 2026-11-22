
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno antes de importar controladores
const resultadoEnv = dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

// Verificar configuración
console.log('================================');
console.log('CONFIGURACIÓN DEL BACKEND');
console.log('================================');

if (resultadoEnv.error) {
    console.error('Error cargando .env:', resultadoEnv.error.message);
} else {
    console.log('Archivo .env cargado correctamente');
}

console.log('JWT_SECRET disponible:', !!process.env.JWT_SECRET);
console.log('Longitud JWT_SECRET:', process.env.JWT_SECRET?.length || 0);
console.log('DB_HOST disponible:', !!process.env.DB_HOST);
console.log('DB_NAME disponible:', !!process.env.DB_NAME);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const evidenciaRoutes = require('./routes/evidenciaRoutes');
const seguimientoRoutes = require('./routes/seguimientoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    },

    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],

            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com"
            ],

            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com"
            ],

            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://*.tile.openstreetmap.org",
                "https://*.openfreemap.org"
            ],

            fontSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
                "data:"
            ],

            connectSrc: [
                "'self'",
                "https://*.openfreemap.org",
                "https://*.openstreetmap.org"
            ],

            workerSrc: [
                "'self'",
                "blob:"
            ],

            childSrc: [
                "'self'",
                "blob:"
            ]
        }
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || false
}));

app.use(express.json({
    limit: '1mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '1mb'
}));

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    // Los inicios de sesión exitosos no consumen el límite
    skipSuccessfulRequests: true,

    // Respuesta JSON cuando se supera el límite
    handler: (req, res) => {
        return res.status(429).json({
            mensaje: 'Has realizado demasiados intentos de inicio de sesión. Espera 15 minutos antes de intentarlo nuevamente.'
        });
    }
});

app.use('/api/auth/login', limiteLogin);

app.use('/api/auth', authRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/evidencias', evidenciaRoutes);
app.use('/api/seguimientos', seguimientoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(express.static(
    path.join(__dirname, '../frontend')
));

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../frontend/index.html')
    );
});

app.use((req, res) => {
    res.status(404).json({
        mensaje: 'Recurso no encontrado'
    });
});

app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
        mensaje: 'Error interno del servidor'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Plataforma Ambiental: http://localhost:${PORT}`);
});
