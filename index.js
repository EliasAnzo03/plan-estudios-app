const express = require('express');


const Database = require('better-sqlite3');

const app = express();
const port = 3000;

// Configuración de la base de datos
const db = new Database('carrera.db');

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    anio INTEGER NOT NULL,
    cuatrimestre INTEGER NOT NULL, -- 0 para anual, 1 o 2 para cuatrimestral
    estado TEXT DEFAULT 'pendiente',
    nota INTEGER,
    es_optativa BOOLEAN DEFAULT 0,
    creditos INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS correlativas (
    materia_id INTEGER NOT NULL,
    requiere_id INTEGER NOT NULL,
    tipo_requisito TEXT NOT NULL, -- 'para_cursar' o 'para_rendir'
    condicion_requerida TEXT NOT NULL, -- 'regular' o 'aprobada'
    FOREIGN KEY (materia_id) REFERENCES materias(id),
    FOREIGN KEY (requiere_id) REFERENCES materias(id),
    PRIMARY KEY (materia_id, requiere_id, tipo_requisito)
  );
`);

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos
app.use(express.static('public'));

// GET: Obtener todas las materias con sus correlativas y nombres
app.get('/api/materias', (req, res) => {
  try {
    const sqlMaterias = `SELECT * FROM materias ORDER BY anio ASC, cuatrimestre ASC`;
    // Consulta única para todas las correlativas (evita el problema N+1)
    const sqlCorrelativas = `
      SELECT materia_id, requiere_id
      FROM correlativas
      ORDER BY materia_id
    `;

    // Con better-sqlite3 usamos prepare().all() de forma sincrónica
    const materias = db.prepare(sqlMaterias).all();
    const correlativas = db.prepare(sqlCorrelativas).all();

    // Agrupamos los IDs de requisitos por materia de una sola pasada
    const requisitosPorMateria = new Map();
    for (const c of correlativas) {
      if (!requisitosPorMateria.has(c.materia_id)) {
        requisitosPorMateria.set(c.materia_id, []);
      }
      requisitosPorMateria.get(c.materia_id).push(c.requiere_id);
    }

    // Asignamos correlativas_ids a cada materia (sin duplicados)
    const resultado = materias.map(materia => {
      const ids = requisitosPorMateria.get(materia.id) || [];
      return {
        ...materia,
        correlativas_ids: [...new Set(ids)]
      };
    });

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/materias: Crea una nueva materia
app.post('/api/materias', (req, res) => {
  const { nombre, anio, cuatrimestre, es_optativa, creditos } = req.body;
  if (!nombre || anio === undefined || cuatrimestre === undefined) {
    return res.status(400).json({ error: 'Nombre, año y cuatrimestre son obligatorios' });
  }
  
  try {
    // Función para normalizar nombres: quita tildes y pasa a minúsculas
    const normalizar = (texto) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const nombreNormalizado = normalizar(nombre);

    // Obtenemos todas las materias existentes y comparamos los nombres normalizados
    const existentes = db.prepare('SELECT nombre FROM materias').all();
    const duplicado = existentes.some(
      (m) => normalizar(m.nombre) === nombreNormalizado
    );

    if (duplicado) {
      return res.status(400).json({ error: 'La materia ya existe' });
    }

    const info = db.prepare(`
      INSERT INTO materias (nombre, anio, cuatrimestre, es_optativa, creditos) 
      VALUES (?, ?, ?, ?, ?)
    `).run(nombre, anio, cuatrimestre, es_optativa || 0, creditos || 0);
    
    res.status(201).json({ 
      id: info.lastInsertRowid, 
      nombre, 
      anio, 
      cuatrimestre, 
      estado: 'pendiente' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/correlativas: Guarda la relación entre materias con tipo y condición
app.post('/api/correlativas', (req, res) => {
  const { materia_id, requiere_id, tipo_requisito, condicion_requerida } = req.body;
  
  if (!materia_id || !requiere_id || !tipo_requisito || !condicion_requerida) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios: materia_id, requiere_id, tipo_requisito, condicion_requerida' });
  }

  const tiposValidos = ['para_cursar', 'para_rendir'];
  const condicionesValidas = ['regular', 'aprobada'];

  if (!tiposValidos.includes(tipo_requisito) || !condicionesValidas.includes(condicion_requerida)) {
    return res.status(400).json({ error: 'Tipo de requisito o condición requerida inválidos' });
  }

  try {
    db.prepare(`
      INSERT INTO correlativas (materia_id, requiere_id, tipo_requisito, condicion_requerida) 
      VALUES (?, ?, ?, ?)
    `).run(materia_id, requiere_id, tipo_requisito, condicion_requerida);
    
    res.status(201).json({ message: 'Relación de correlatividad creada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/materias/:id/estado: Actualiza el estado de una materia
app.patch('/api/materias/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'en_curso', 'regular', 'aprobada'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser pendiente, en_curso, regular o aprobada' });
  }

  try {
    const result = db.prepare('UPDATE materias SET estado = ? WHERE id = ?').run(estado, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/materias/:id: Elimina una materia y sus correlativas asociadas
app.delete('/api/materias/:id', (req, res) => {
  const { id } = req.params;

  try {
    // Verificamos que la materia exista
    const materia = db.prepare('SELECT id FROM materias WHERE id = ?').get(id);
    if (!materia) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    // Eliminamos las correlativas en las que la materia interviene (como materia o como requisito)
    db.prepare('DELETE FROM correlativas WHERE materia_id = ? OR requiere_id = ?')
      .run(id, id);

    // Eliminamos la materia
    db.prepare('DELETE FROM materias WHERE id = ?').run(id);

    res.json({ message: 'Materia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/materias/:id/correlativas: Devuelve las materias que son requisito para cursar la materia solicitada
app.get('/api/materias/:id/correlativas', (req, res) => {
  const { id } = req.params;

  try {
    const correlativas = db.prepare(`
      SELECT m.id, m.nombre, m.anio, m.cuatrimestre, m.estado
      FROM correlativas c
      JOIN materias m ON c.requiere_id = m.id
      WHERE c.materia_id = ?
    `).all(id);

    res.json(correlativas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/estadisticas/titulo-intermedio: Verifica si todas las materias de 1°, 2° y 3° están aprobadas
app.get('/api/estadisticas/titulo-intermedio', (req, res) => {
  try {
    const pendientes = db.prepare(`
      SELECT COUNT(*) AS total
      FROM materias
      WHERE anio IN (1, 2, 3) AND estado != 'aprobada'
    `).get();

    // El título se obtiene si no hay ninguna materia pendiente entre los años 1, 2 y 3
    res.json({ obtenido: pendientes.total === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
