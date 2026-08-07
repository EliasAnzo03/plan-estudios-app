const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones de PostgreSQL.
// Usa la variable de entorno DATABASE_URL para conectar.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initSchema() {
  await pool.query(`
    -- Tabla de carreras (multi-tenant / multi-carrera)
    CREATE TABLE IF NOT EXISTS carreras (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      plan TEXT NOT NULL,
      UNIQUE (nombre, plan)
    );

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
      nota NUMERIC(4,1) DEFAULT NULL,
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

    -- Parciales
    CREATE TABLE IF NOT EXISTS parciales (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      materia_id INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Asegurar la columna `nota` en tablas existentes (migración segura)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuario_materia' AND column_name = 'nota'
      ) THEN
        ALTER TABLE usuario_materia ADD COLUMN nota NUMERIC(4,1) DEFAULT NULL;
      END IF;
    END $$
  `);

  // Migración segura multi-carrera:
  // Agregar carrera_id a `usuarios` (permite nulos temporalmente para no romper usuarios actuales)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'usuarios' AND column_name = 'carrera_id'
      ) THEN
        ALTER TABLE usuarios ADD COLUMN carrera_id INTEGER REFERENCES carreras(id);
      END IF;
    END $$
  `);

  // Agregar carrera_id a `materias`
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'materias' AND column_name = 'carrera_id'
      ) THEN
        ALTER TABLE materias ADD COLUMN carrera_id INTEGER REFERENCES carreras(id);
      END IF;
    END $$
  `);

  // Migración segura: constraint UNIQUE en materias (carrera_id, nombre)
  // Evita que se dupliquen materias dentro de una misma carrera.
  // El DROP previo garantiza idempotencia aunque un intento anterior haya
  // dejado la constraint con un nombre distinto o columnas diferentes.
  await pool.query(`
    ALTER TABLE materias DROP CONSTRAINT IF EXISTS materias_carrera_id_nombre_key;
    ALTER TABLE materias ADD CONSTRAINT materias_carrera_id_nombre_key UNIQUE (carrera_id, nombre);
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
