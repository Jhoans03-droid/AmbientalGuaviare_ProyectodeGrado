
CREATE DATABASE IF NOT EXISTS plataforma_ambiental
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE plataforma_ambiental;

-- 1. ROLES
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

INSERT INTO roles(nombre, descripcion) VALUES
('CIUDADANO', 'Registra y consulta sus propios reportes'),
('GESTOR', 'Revisa reportes y solicita información'),
('AUTORIDAD', 'Realiza verificaciones y cierres autorizados'),
('ADMINISTRADOR', 'Administra usuarios y configuración');

-- 2. USUARIOS
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    rol_id INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- 3. CATEGORÍAS
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE
);

INSERT INTO categorias(nombre, descripcion) VALUES
('Deforestación', 'Pérdida de cobertura forestal'),
('Contaminación hídrica', 'Posible afectación de fuentes hídricas'),
('Residuos sólidos', 'Disposición inadecuada de residuos'),
('Quemas e incendios', 'Eventos relacionados con fuego'),
('Afectación de fauna', 'Posible afectación de fauna silvestre'),
('Afectación de flora', 'Posible afectación de flora'),
('Contaminación del suelo', 'Posible contaminación del suelo'),
('Otro', 'Otra situación ambiental');

-- 4. ESTADOS
CREATE TABLE estados_reporte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

INSERT INTO estados_reporte(nombre, descripcion) VALUES
('REGISTRADO', 'Reporte recibido desde la comunidad'),
('EN_REVISION', 'Reporte en revisión por el gestor'),
('INFORMACION_COMPLEMENTARIA', 'Se requiere información adicional'),
('VERIFICADO', 'Situación verificada por autoridad competente'),
('CERRADO', 'Proceso de seguimiento cerrado');

-- 5. REPORTES
CREATE TABLE reportes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    categoria_id INT NOT NULL,
    estado_id INT NOT NULL DEFAULT 1,

    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_evento DATE NOT NULL,

    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,

    precision_ubicacion ENUM('PRECISA','APROXIMADA')
        NOT NULL DEFAULT 'APROXIMADA',

    visibilidad_ubicacion ENUM('PUBLICA','RESTRINGIDA','PRIVADA')
        NOT NULL DEFAULT 'RESTRINGIDA',

    direccion VARCHAR(255),

    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (estado_id) REFERENCES estados_reporte(id),

    INDEX idx_usuario(usuario_id),
    INDEX idx_estado(estado_id),
    INDEX idx_categoria(categoria_id),
    INDEX idx_fecha(fecha_creacion)
);

-- 6. EVIDENCIAS
CREATE TABLE evidencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporte_id INT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL UNIQUE,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanio INT NOT NULL,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (reporte_id)
        REFERENCES reportes(id)
        ON DELETE CASCADE
);

-- 7. SEGUIMIENTOS
CREATE TABLE seguimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporte_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado_anterior_id INT NULL,
    estado_nuevo_id INT NOT NULL,
    observacion TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (reporte_id)
        REFERENCES reportes(id)
        ON DELETE CASCADE,

    FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id),

    FOREIGN KEY (estado_anterior_id)
        REFERENCES estados_reporte(id),

    FOREIGN KEY (estado_nuevo_id)
        REFERENCES estados_reporte(id),

    INDEX idx_seguimiento_reporte(reporte_id, fecha)
);

-- 8. SOLICITUDES DE INFORMACIÓN
CREATE TABLE solicitudes_informacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporte_id INT NOT NULL,
    usuario_solicitante_id INT NOT NULL,
    descripcion TEXT NOT NULL,
    respuesta TEXT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta DATETIME NULL,
    estado ENUM('PENDIENTE','RESPONDIDA','CANCELADA')
        DEFAULT 'PENDIENTE',

    FOREIGN KEY (reporte_id)
        REFERENCES reportes(id)
        ON DELETE CASCADE,

    FOREIGN KEY (usuario_solicitante_id)
        REFERENCES usuarios(id)
);

-- 9. AUDITORÍA
CREATE TABLE auditoria (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    entidad_id INT NULL,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE SET NULL,

    INDEX idx_auditoria_fecha(fecha),
    INDEX idx_auditoria_usuario(usuario_id)
);
