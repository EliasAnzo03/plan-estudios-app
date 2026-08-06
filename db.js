const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones de PostgreSQL.
// Usa la variable de entorno DATABASE_URL para conectar.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función asíncrona para crear/verificar el esquema (idempotente)
async function initSchema() {
  // Elimina primero cualquier tabla existente y sus secuencias asociadas
  await pool.query(`
    DROP TABLE IF EXISTS usuarios, materias, usuario_materia, correlativas CASCADE;
  `);

  await pool.query(`
    -- Tabla de usuarios (arrendatarios del sistema)
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'user', -- 'admin' o 'user'
      is_approved BOOLEAN NOT NULL DEFAULT false -- aprobación del administrador
    );

    -- Tabla global/esquemática de materias (compartida por todos los usuarios).
    CREATE TABLE IF NOT EXISTS materias (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      anio INTEGER NOT NULL,
      cuatrimestre INTEGER NOT NULL, -- 0 para anual, 1 o 2 para cuatrimestral
      tipo TEXT NOT NULL DEFAULT 'obligatoria' -- 'obligatoria' u 'optativa'
    );

    -- Tabla intermedia: relaciona cada usuario con sus materias y el estado INDIVIDUAL.
    CREATE TABLE IF NOT EXISTS usuario_materia (
      usuario_id INTEGER NOT NULL,
      materia_id INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente','en_curso','regular','aprobada'
      PRIMARY KEY (usuario_id, materia_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
    );

    -- Correlativas: definición única por materia, compartida globalmente.
    CREATE TABLE IF NOT EXISTS correlativas (
      materia_id INTEGER NOT NULL,
      requiere_id INTEGER NOT NULL,
      tipo_requisito TEXT NOT NULL, -- 'para_cursar' o 'para_rendir'
      condicion_requerida TEXT NOT NULL, -- 'regular' o 'aprobada'
      FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
      FOREIGN KEY (requiere_id) REFERENCES materias(id) ON DELETE CASCADE,
      PRIMARY KEY (materia_id, requiere_id, tipo_requisito)
    );
  `);
}

// Inicializamos el esquema al cargar el módulo.
// index.js y seeder.js deben llamar a initSchema() antes de operar.
initSchema()
  .catch((error) => {
    console.error('Error inicializando el esquema de PostgreSQL:', error);
    process.exit(1);
  });

module.exports = {
  pool,
  initSchema
};
