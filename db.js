const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones de PostgreSQL.
// Usa la variable de entorno DATABASE_URL para conectar.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initSchema() {
  // Elimina solo las tablas de materias y relaciones, conservando usuarios
  await pool.query(`
    DROP TABLE IF EXISTS correlativas, usuario_materia, materias CASCADE;
  `);

  await pool.query(`
    -- Tabla de usuarios (NO se borra)
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'user',
      is_approved BOOLEAN NOT NULL DEFAULT false
    );

    -- Tabla global/esquemática de materias
    CREATE TABLE IF NOT EXISTS materias (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      anio INTEGER NOT NULL,
      cuatrimestre INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'obligatoria'
    );

    -- Tabla intermedia usuario_materia
    CREATE TABLE IF NOT EXISTS usuario_materia (
      usuario_id INTEGER NOT NULL,
      materia_id INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      PRIMARY KEY (usuario_id, materia_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
    );

    -- Correlativas
    CREATE TABLE IF NOT EXISTS correlativas (
      materia_id INTEGER NOT NULL,
      requiere_id INTEGER NOT NULL,
      tipo_requisito TEXT NOT NULL,
      condicion_requerida TEXT NOT NULL,
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
