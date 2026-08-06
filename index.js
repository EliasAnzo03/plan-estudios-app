const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Conexión centralizada y esquema multitenant definidos en db.js
const { pool, initSchema } = require('./db.js');

const app = express();
const port = 3000;

// Clave secreta para firmar los JWT.
// En producción debe salir de una variable de entorno (process.env.JWT_SECRET).
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_de_desarrollo';
const JWT_EXPIRES_IN = '8h';

// Estados válidos para una materia
const ESTADOS_VALIDOS = ['pendiente', 'en_curso', 'regular', 'aprobada'];

// Middleware para parsear JSON
app.use(express.json());

// Servir archivos estáticos
app.use(express.static('public'));

// ---------------------------------------------------------------------------
// AUTH: POST /api/login
// ---------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password son obligatorios' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, username, password_hash, rol, is_approved FROM usuarios WHERE username = $1',
      [username]
    );
    const usuario = resultado.rows[0];

    // Verificación de la contraseña (bcrypt iguala el hash)
    const passwordCorrecta =
      usuario && bcrypt.compareSync(password, usuario.password_hash);

    if (!usuario || !passwordCorrecta) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si la cuenta aún no fue aprobada por el administrador, no permitir el ingreso
    if (!usuario.is_approved) {
      return res.status(403).json({
        error: 'Cuenta pendiente de aprobación por el administrador'
      });
    }

    // Firmamos el token con datos no sensibles del usuario
    const token = jwt.sign(
      { id: usuario.id, username: usuario.username, rol: usuario.rol, is_approved: usuario.is_approved },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol, is_approved: usuario.is_approved }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// AUTH: POST /api/register
// Registro público. Crea un usuario con rol 'user' e is_approved = false.
// Un administrador deberá aprobar la cuenta antes de que pueda iniciar sesión.
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password son obligatorios' });
  }

  try {
    // Evitar duplicados de username
    const existenteResult = await pool.query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );
    if (existenteResult.rows.length > 0) {
      return res.status(409).json({ error: `El usuario '${username}' ya existe` });
    }

    const SALT_ROUNDS = 10;
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

    // Guardamos el usuario con rol 'user' y sin aprobación (pendiente de admin)
    await pool.query(`
      INSERT INTO usuarios (username, password_hash, rol, is_approved)
      VALUES ($1, $2, 'user', false)
    `, [username, passwordHash]);

    res.status(201).json({
      message: 'Cuenta creada. Esperá a que el administrador la apruebe',
      usuario: { username, rol: 'user', is_approved: false }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// MIDDLEWARE: verificarToken
// Intercepta las peticiones, valida el JWT del header Authorization y
// "inyecta" el usuario_id (y el resto del payload) en la request.
// ---------------------------------------------------------------------------
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Inyectamos el usuario autenticado en la request
    req.usuarioId = payload.id;
    req.usuario = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ---------------------------------------------------------------------------
// MIDDLEWARE: requiereRol
// Debe ejecutarse DESPUÉS de verificarToken. Valida que el rol del usuario
// autenticado (req.usuario.rol) coincida con el esperado por la ruta.
// ---------------------------------------------------------------------------
function requiereRol(rolEsperado) {
  return (req, res, next) => {
  // req.usuario lo inyecta verificarToken
  if (!req.usuario || req.usuario.rol !== rolEsperado) {
    return res.status(403).json({ error: `Acceso denegado. Se requiere rol '${rolEsperado}'` });
  }
  next();
  };
}

// ---------------------------------------------------------------------------
// POST /api/admin/usuarios  (solo admin) - Sistema Invite-Only
// El admin crea la cuenta de un compañero con rol 'user'. El sistema es
// cerrado: no hay registro público, solo el admin puede dar de alta usuarios.
// Al crearse, se le asignan automáticamente todas las materias existentes
// con estado 'pendiente'.
// ---------------------------------------------------------------------------
app.post('/api/admin/usuarios', verificarToken, requiereRol('admin'), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
  return res.status(400).json({ error: 'Username y password son obligatorios' });
  }

  try {
    // Evitar duplicados de username
    const existenteResult = await pool.query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );
    if (existenteResult.rows.length > 0) {
      return res.status(409).json({ error: `El usuario '${username}' ya existe` });
    }

    const SALT_ROUNDS = 10;
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

    // Creamos el usuario con rol 'user' (invitado) y aprobado (lo da de alta el admin)
    const info = await pool.query(`
      INSERT INTO usuarios (username, password_hash, rol, is_approved)
      VALUES ($1, $2, 'user', true)
      RETURNING id
    `, [username, passwordHash]);

    const nuevoUsuarioId = info.rows[0].id;

    // Asignación inicial: todas las materias existentes en estado 'pendiente'
    const materiasResult = await pool.query('SELECT id FROM materias');
    const materias = materiasResult.rows;

    let materiasAsignadas = 0;
    for (const materia of materias) {
      const resumen = await pool.query(`
        INSERT INTO usuario_materia (usuario_id, materia_id, estado)
        VALUES ($1, $2, 'pendiente')
        ON CONFLICT (usuario_id, materia_id) DO NOTHING
      `, [nuevoUsuarioId, materia.id]);
      materiasAsignadas += resumen.rowCount;
    }

    res.status(201).json({
      message: 'Usuario creado correctamente',
      usuario: { id: nuevoUsuarioId, username, rol: 'user' },
      materias_asignadas: materiasAsignadas
    });
  } catch (error) {
  res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/usuarios/:id  (solo admin) - Baja de usuario / revocar acceso
// Elimina a un usuario del sistema (Invite-Only: el admin controla el alta
// y la baja). Las filas de usuario_materia del usuario se borran
// automáticamente gracias al ON DELETE CASCADE de la FK.
// ---------------------------------------------------------------------------
app.delete('/api/admin/usuarios/:id', verificarToken, requiereRol('admin'), async (req, res) => {
  const { id } = req.params;
  const usuarioId = Number(id);

  try {
    // Evitar que el admin se elimine a sí mismo (quedaría sin administrador)
    if (usuarioId === req.usuarioId) {
      return res.status(400).json({ error: 'No podés eliminar tu propia cuenta de administrador' });
    }

    const usuarioResult = await pool.query(
      'SELECT id, username, rol FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    const usuario = usuarioResult.rows[0];
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // El DELETE en cascada elimina también sus registros en usuario_materia.
    // Eliminamos primero usuario_materia por seguridad explícita aunque la FK
    // ya lo manejase, y después el usuario.
    await pool.query('DELETE FROM usuario_materia WHERE usuario_id = $1', [usuarioId]);
    await pool.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);

    res.json({
      message: `Usuario '${usuario.username}' eliminado correctamente`,
      usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/usuarios  (solo admin) - Listado de usuarios del sistema
// Devuelve todos los usuarios dados de alta, con un resumen de su progreso
// (materias asignadas y aprobadas). Pensado para que el admin gestione
// (ver, eliminar) a los compañeros en el sistema Invite-Only.
// ---------------------------------------------------------------------------
app.get('/api/admin/usuarios', verificarToken, requiereRol('admin'), async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT u.id, u.username, u.rol,
             (SELECT COUNT(*) FROM usuario_materia um WHERE um.usuario_id = u.id) AS materias_totales,
             (SELECT COUNT(*) FROM usuario_materia um
               WHERE um.usuario_id = u.id AND um.estado = 'aprobada') AS materias_aprobadas
      FROM usuarios u
      ORDER BY u.id ASC
    `);
    const usuarios = resultado.rows;

    res.json({
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/users  (solo admin) - Usuarios pendientes de aprobación
// Devuelve únicamente los usuarios registrados por /api/register que todavía
// NO fueron aprobados (is_approved = false).
// ---------------------------------------------------------------------------
app.get('/api/admin/users', verificarToken, requiereRol('admin'), async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, username, rol, is_approved
      FROM usuarios
      WHERE is_approved = false
      ORDER BY id ASC
    `);

    const usuarios = resultado.rows;

    res.json({
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/approve  (solo admin)
// Aprueba el acceso de un usuario pendiente (cambia is_approved = true).
// ---------------------------------------------------------------------------
app.put('/api/admin/users/:id/approve', verificarToken, requiereRol('admin'), async (req, res) => {
  const { id } = req.params;
  const usuarioId = Number(id);

  try {
    const usuarioResult = await pool.query(
      'SELECT id, username, rol, is_approved FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    const usuario = usuarioResult.rows[0];

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.is_approved) {
      return res.status(400).json({
        error: `El usuario '${usuario.username}' ya estaba aprobado`
      });
    }

    await pool.query(
      'UPDATE usuarios SET is_approved = true WHERE id = $1',
      [usuarioId]
    );

    res.json({
      message: `Usuario '${usuario.username}' aprobado correctamente`,
      usuario: { id: usuario.id, username: usuario.username, rol: usuario.rol, is_approved: true }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ---------------------------------------------------------------------------
// GET /api/materias
// Devuelve la grilla global de materias con el estado INDIVIDUAL del usuario
// autenticado (LEFT JOIN con usuario_materia, filtrado por req.usuarioId).
// ---------------------------------------------------------------------------
app.get('/api/materias', verificarToken, async (req, res) => {
  try {
    const usuario_id = req.usuarioId;

    // LEFT JOIN: si el usuario no tiene registro en usuario_materia,
    // COALESCE devuelve 'pendiente' como estado por defecto.
    const sqlMaterias = `
      SELECT m.id, m.nombre, m.anio, m.cuatrimestre, m.tipo,
             COALESCE(um.estado, 'pendiente') AS estado
      FROM materias m
      LEFT JOIN usuario_materia um
        ON um.materia_id = m.id AND um.usuario_id = $1
      ORDER BY m.anio ASC, m.cuatrimestre ASC
    `;
    const sqlCorrelativas = `
      SELECT materia_id, requiere_id
      FROM correlativas
      ORDER BY materia_id
    `;

    const materiasResult = await pool.query(sqlMaterias, [usuario_id]);
    const correlativasResult = await pool.query(sqlCorrelativas);
    const materias = materiasResult.rows;
    const correlativas = correlativasResult.rows;

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

// ---------------------------------------------------------------------------
// PATCH /api/materias/:id/estado
// Inserta o actualiza el estado EXCLUSIVAMENTE en usuario_materia, siempre
// con el usuario_id del token. UPSERT mediante ON CONFLICT.
// ---------------------------------------------------------------------------
app.patch('/api/materias/:id/estado', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const usuario_id = req.usuarioId;

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Debe ser ${ESTADOS_VALIDOS.join(', ')}`
    });
  }

  try {
    // Verificamos que la materia exista en la grilla global
    const materiaResult = await pool.query(
      'SELECT id FROM materias WHERE id = $1',
      [id]
    );
    if (materiaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    // UPSERT: inserta si no existe la dupla (usuario_id, materia_id),
    // o actualiza el estado si ya existía.
    await pool.query(`
      INSERT INTO usuario_materia (usuario_id, materia_id, estado)
      VALUES ($1, $2, $3)
      ON CONFLICT (usuario_id, materia_id)
      DO UPDATE SET estado = excluded.estado
    `, [usuario_id, Number(id), estado]);

    res.json({ message: 'Estado actualizado correctamente', estado, materia_id: Number(id) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/materias/:id/correlativas
// Devuelve las materias requisito para cursar la consultada, con el estado
// individual del usuario autenticado.
// ---------------------------------------------------------------------------
app.get('/api/materias/:id/correlativas', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuarioId;

  try {
    const resultado = await pool.query(`
      SELECT m.id, m.nombre, m.anio, m.cuatrimestre, m.tipo,
             COALESCE(um.estado, 'pendiente') AS estado
      FROM correlativas c
      JOIN materias m ON c.requiere_id = m.id
      LEFT JOIN usuario_materia um
        ON um.materia_id = m.id AND um.usuario_id = $1
      WHERE c.materia_id = $2
    `, [usuario_id, id]);

    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/estadisticas/titulo-intermedio
// Verifica si todas las materias de 1°, 2° y 3° del USUARIO están aprobadas.
// ---------------------------------------------------------------------------
app.get('/api/estadisticas/titulo-intermedio', verificarToken, async (req, res) => {
  const usuario_id = req.usuarioId;

  try {
    const resultado = await pool.query(`
      SELECT COUNT(*) AS total
      FROM materias m
      LEFT JOIN usuario_materia um
        ON um.materia_id = m.id AND um.usuario_id = $1
      WHERE m.anio IN (1, 2, 3)
        AND COALESCE(um.estado, 'pendiente') != 'aprobada'
    `, [usuario_id]);

    const total = Number(resultado.rows[0].total);
    res.json({ obtenido: total === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Rutas de administración de la grilla global (protegidas con token)
// ---------------------------------------------------------------------------

// POST /api/materias: Crea una nueva materia en la grilla global (solo admin)
app.post('/api/materias', verificarToken, requiereRol('admin'), async (req, res) => {
  const { nombre, anio, cuatrimestre, tipo = 'obligatoria' } = req.body;

  if (!nombre || anio === undefined || cuatrimestre === undefined) {
    return res.status(400).json({ error: 'Nombre, año y cuatrimestre son obligatorios' });
  }

  try {
    const normalizar = (texto) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const nombreNormalizado = normalizar(nombre);
    const existentesResult = await pool.query('SELECT nombre FROM materias');
    const existentes = existentesResult.rows;
    const duplicado = existentes.some((m) => normalizar(m.nombre) === nombreNormalizado);

    if (duplicado) {
      return res.status(400).json({ error: 'La materia ya existe' });
    }

    const info = await pool.query(`
      INSERT INTO materias (nombre, anio, cuatrimestre, tipo)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [nombre, anio, cuatrimestre, tipo]);

    res.status(201).json({
      id: info.rows[0].id,
      nombre,
      anio,
      cuatrimestre,
      tipo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/correlativas: Guarda la relación entre materias con tipo y condición (solo admin)
app.post('/api/correlativas', verificarToken, requiereRol('admin'), async (req, res) => {
  const { materia_id, requiere_id, tipo_requisito, condicion_requerida } = req.body;

  if (!materia_id || !requiere_id || !tipo_requisito || !condicion_requerida) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios: materia_id, requiere_id, tipo_requisito, condicion_requerida'
    });
  }

  const tiposValidos = ['para_cursar', 'para_rendir'];
  const condicionesValidas = ['regular', 'aprobada'];

  if (!tiposValidos.includes(tipo_requisito) || !condicionesValidas.includes(condicion_requerida)) {
    return res.status(400).json({ error: 'Tipo de requisito o condición requerida inválidos' });
  }

  try {
    await pool.query(`
      INSERT INTO correlativas (materia_id, requiere_id, tipo_requisito, condicion_requerida)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (materia_id, requiere_id, tipo_requisito) DO NOTHING
    `, [materia_id, requiere_id, tipo_requisito, condicion_requerida]);

    res.status(201).json({ message: 'Relación de correlatividad creada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/materias/:id: Elimina una materia y sus correlativas asociadas (solo admin)
app.delete('/api/materias/:id', verificarToken, requiereRol('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const materiaResult = await pool.query(
      'SELECT id FROM materias WHERE id = $1',
      [id]
    );
    if (materiaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    await pool.query('DELETE FROM correlativas WHERE materia_id = $1 OR requiere_id = $1', [id]);
    await pool.query('DELETE FROM usuario_materia WHERE materia_id = $1', [id]);
    await pool.query('DELETE FROM materias WHERE id = $1', [id]);

    res.json({ message: 'Materia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inicializar el esquema y luego iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

