const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');
// Conexión centralizada y esquema multitenant definidos en db.js
const { pool } = require('./db.js');

const app = express();
const port = 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Clave secreta para firmar los JWT.
// En producción debe salir de una variable de entorno (process.env.JWT_SECRET).
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

// Validación crítica: si no hay secret, la app no debe arrancar
// (un fallback en texto plano sería un riesgo de seguridad).
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET no está definido.');
  process.exit(1);
}

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
      `SELECT u.id, u.username, u.password_hash, u.rol, u.is_approved,
              c.nombre AS carrera_nombre, c.plan AS carrera_plan
       FROM usuarios u
       LEFT JOIN carreras c ON c.id = u.carrera_id
       WHERE u.username = $1`,
      [username]
    );
    const usuario = resultado.rows[0];

    // Verificación de la contraseña (bcrypt iguala el hash)
    const passwordCorrecta =
      usuario && (await bcrypt.compare(password, usuario.password_hash));

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
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        is_approved: usuario.is_approved,
        carrera_nombre: usuario.carrera_nombre || null,
        carrera_plan: usuario.carrera_plan || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/carreras
// Pública. Devuelve todas las carreras (id, nombre, plan) para que el frontend
// pueda armar el menú desplegable del registro.
// ---------------------------------------------------------------------------
app.get('/api/carreras', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nombre, plan FROM carreras ORDER BY id ASC'
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// AUTH: POST /api/register
// Registro público. Crea un usuario con rol 'user' e is_approved = false.
// Acepta carrera_id (opcional) para asociar al usuario a una carrera.
// Un administrador deberá aprobar la cuenta antes de que pueda iniciar sesión.
// ---------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  const { username, password, carrera_id } = req.body;

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

    // Si viene carrera_id, validamos que la carrera exista
    if (carrera_id !== undefined && carrera_id !== null) {
      const carreraResult = await pool.query('SELECT id FROM carreras WHERE id = $1', [carrera_id]);
      if (carreraResult.rows.length === 0) {
        return res.status(400).json({ error: 'La carrera especificada no existe' });
      }
    }

    const SALT_ROUNDS = 10;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Guardamos el usuario con rol 'user' y sin aprobación (pendiente de admin).
    // carrera_id es opcional: si no se envía, se guarda null (legacy).
    await pool.query(`
      INSERT INTO usuarios (username, password_hash, rol, is_approved, carrera_id)
      VALUES ($1, $2, 'user', false, $3)
    `, [username, passwordHash, carrera_id || null]);

    res.status(201).json({
      message: 'Cuenta creada. Esperá a que el administrador la apruebe',
      usuario: { username, rol: 'user', is_approved: false, carrera_id: carrera_id || null }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
// HELPER: resolverUsuarioId
// Resuelve el usuario_id a partir de una autenticación híbrida:
//   1) Token JWT en el header Authorization (Bearer).
//   2) En su defecto, modo público (?view=public&user=<id>), si es válido.
// Devuelve { usuario_id, esPublico } o null si no se pudo resolver ninguna.
// Se usa en GET /api/materias y GET /api/estadisticas/titulo-intermedio
// para evitar duplicar la lógica de autenticación.
// ---------------------------------------------------------------------------
async function resolverUsuarioId(req) {
  let usuario_id = null;
  let esPublico = false;

  // 1) Intentar autenticar con el token (si viene presente y es válido).
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      usuario_id = payload.id;
    } catch (error) {
      // Token inválido: se intentará el modo público a continuación.
    }
  }

  // 2) Si no hay token válido, intentamos el modo público con el query param
  //    `user`. Requiere que `view=public` esté presente para ser explícito.
  if (usuario_id === null) {
    if (req.query.view === 'public' && req.query.user) {
      esPublico = true;
      const idPublico = Number(req.query.user);
      if (!Number.isNaN(idPublico)) {
        // Verificamos que el usuario exista (no exponer datos de ids inexistentes)
        const existe = await pool.query('SELECT id FROM usuarios WHERE id = $1', [idPublico]);
        if (existe.rows.length > 0) {
          usuario_id = idPublico;
        }
      }
    }
  }

  // Sin token válido y sin usuario público válido => no se pudo resolver.
  if (usuario_id === null) {
    return null;
  }

  return { usuario_id, esPublico };
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
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Creamos el usuario con rol 'user' (invitado) y aprobado (lo da de alta el admin)
    const info = await pool.query(`
      INSERT INTO usuarios (username, password_hash, rol, is_approved)
      VALUES ($1, $2, 'user', true)
      RETURNING id
    `, [username, passwordHash]);

    const nuevoUsuarioId = info.rows[0].id;

    // Asignación inicial: todas las materias existentes en estado 'pendiente'.
    // Bulk insert de una sola vez (evita el problema N+1 de un INSERT por materia).
    const materiasResult = await pool.query('SELECT id FROM materias');
    const materias = materiasResult.rows;

    let materiasAsignadas = 0;
    if (materias.length > 0) {
      const valores = materias
        .map(() => `($1, $2, 'pendiente')`)
        .join(', ');
      const resultado = await pool.query(`
        INSERT INTO usuario_materia (usuario_id, materia_id, estado)
        VALUES ${valores}
        ON CONFLICT (usuario_id, materia_id) DO NOTHING
      `, [nuevoUsuarioId, ...materias.map((m) => m.id)]);
      materiasAsignadas = resultado.rowCount;
    }

    res.status(201).json({
      message: 'Usuario creado correctamente',
      usuario: { id: nuevoUsuarioId, username, rol: 'user' },
      materias_asignadas: materiasAsignadas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    // Devuelve SOLO los usuarios aprobados (is_approved = true), con un LEFT JOIN
    // a carreras para traer el nombre de cada carrera.
    const resultado = await pool.query(`
      SELECT u.id, u.username, u.rol, u.is_approved,
             c.nombre AS carrera_nombre,
             (SELECT COUNT(*) FROM materias m WHERE m.carrera_id = u.carrera_id) AS materias_totales,
             (SELECT COUNT(*) FROM usuario_materia um
               WHERE um.usuario_id = u.id AND um.estado = 'aprobada') AS materias_aprobadas
      FROM usuarios u
      LEFT JOIN carreras c ON c.id = u.carrera_id
      WHERE u.is_approved = true
      ORDER BY u.id ASC
    `);
    const usuarios = resultado.rows;

    res.json({
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
      SELECT u.id, u.username, u.rol, u.is_approved,
             c.nombre AS carrera_nombre
      FROM usuarios u
      LEFT JOIN carreras c ON c.id = u.carrera_id
      WHERE u.is_approved = false
      ORDER BY u.id ASC
    `);

    const usuarios = resultado.rows;

    res.json({
      total: usuarios.length,
      usuarios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
// ---------------------------------------------------------------------------
// GET /api/materias
// Devuelve la grilla global de materias con el estado INDIVIDUAL del usuario.
//
// Dos modos de uso:
//  - Autenticado (header Bearer): usa el usuario del token (req.usuarioId).
//  - Público / Solo lectura (?view=public&user=<id>): permite solicitudes sin
//    token y resuelve el usuario a partir del query param `user`. Esto habilita
//    el "Compartir mi progreso" con un link público. Los endpoints de
//    MODIFICACIÓN (PUT/PATCH/POST/DELETE) siguen estrictamente protegidos por
//    verificarToken / requiereRol.
// ---------------------------------------------------------------------------
app.get('/api/materias', async (req, res) => {
  // Resolución híbrida de usuario (token o modo público) mediante helper.
  const autenticado = await resolverUsuarioId(req);
  if (!autenticado) {
    return res.status(401).json({ error: 'Token no proporcionado o usuario público inválido' });
  }
  const { usuario_id, esPublico } = autenticado;

  try {
    // Obtenemos el carrera_id del usuario autenticado.
    // Los usuarios "legacy" (creados antes de la multi-carrera) tienen
    // carrera_id en null: en ese caso asumimos por defecto carrera_id = 1
    // (Ingeniería Informática).
    const usuarioResult = await pool.query(
      'SELECT carrera_id FROM usuarios WHERE id = $1',
      [usuario_id]
    );
    const usuarioCarrera = usuarioResult.rows[0];
    let carrera_id = (usuarioCarrera && usuarioCarrera.carrera_id) || 1;

    // LEFT JOIN: si el usuario no tiene registro en usuario_materia,
    // COALESCE devuelve 'pendiente' como estado por defecto.
    // Filtramos por m.carrera_id para que el usuario solo reciba la grilla
    // de asignación de materias correspondiente a SU carrera.
    const sqlMaterias = `
      SELECT m.id, m.nombre, m.anio, m.cuatrimestre, m.tipo,
             COALESCE(um.estado, 'pendiente') AS estado,
             um.nota AS nota
      FROM materias m
      LEFT JOIN usuario_materia um
        ON um.materia_id = m.id AND um.usuario_id = $1
      WHERE m.carrera_id = $2
      ORDER BY m.anio ASC, m.cuatrimestre ASC
    `;
    // Solo se traen las correlativas de la carrera del usuario (optimización:
    // evita cargar correlativas de otras carreras, p. ej. Lic. en Educación).
    const sqlCorrelativas = `
      SELECT c.materia_id, c.requiere_id, c.tipo_requisito, c.condicion_requerida,
             req.id AS req_id, req.nombre AS req_nombre
      FROM correlativas c
      JOIN materias req ON req.id = c.requiere_id
      JOIN materias m ON m.id = c.materia_id
      WHERE m.carrera_id = $1
      ORDER BY c.materia_id ASC
    `;

    const materiasResult = await pool.query(sqlMaterias, [usuario_id, carrera_id]);
    const correlativasResult = await pool.query(sqlCorrelativas, [carrera_id]);
    const materias = materiasResult.rows;
    const correlativas = correlativasResult.rows;

    // Agrupamos por materia discriminando 'para_cursar' / 'para_rendir'
    // y la condición (regular / aprobada) de cada requisito.
    const requisitosPorMateria = new Map();
    for (const c of correlativas) {
      if (!requisitosPorMateria.has(c.materia_id)) {
        requisitosPorMateria.set(c.materia_id, {
          paraCursar: [],
          paraRendir: [],
          ids: new Set()
        });
      }
      const grupo = requisitosPorMateria.get(c.materia_id);
      const requerimiento = {
        id: c.req_id,
        nombre: c.req_nombre,
        condicion: c.condicion_requerida
      };
      if (c.tipo_requisito === 'para_rendir') {
        grupo.paraRendir.push(requerimiento);
      } else {
        grupo.paraCursar.push(requerimiento);
      }
      grupo.ids.add(c.requiere_id);
    }

    // Respuesta con el esquema nuevo (correlativas) y mantenemos
    // correlativas_ids (sin duplicados) para compatibilidad.
    const resultado = materias.map(materia => {
      const req = requisitosPorMateria.get(materia.id) || { paraCursar: [], paraRendir: [], ids: new Set() };
      return {
        ...materia,
        // En modo público se oculta la nota por privacidad (solo estado).
        nota: esPublico ? null : materia.nota,
        correlativas: {
          paraCursar: req.paraCursar,
          paraRendir: req.paraRendir
        },
        correlativas_ids: [...req.ids]
      };
    });
    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/materias/:id/nota
// Inserta o actualiza la nota de una materia aprobada para el usuario autenticado.
// Acepta un número entre 1 y 10 (admite decimales) o null para limpiarla.
// UPSERT mediante ON CONFLICT.
// ---------------------------------------------------------------------------
app.put('/api/materias/:id/nota', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nota } = req.body;
  const usuario_id = req.usuarioId;

  // La nota puede ser null (para limpiarla) o un número entre 1 y 10
  if (nota !== null) {
    if (typeof nota !== 'number' || isNaN(nota) || nota < 1 || nota > 10) {
      return res.status(400).json({
        error: 'La nota debe ser un número entre 1 y 10, o null para limpiarla'
      });
    }
  }

  try {
    const materiaResult = await pool.query(
      'SELECT id FROM materias WHERE id = $1',
      [id]
    );
    if (materiaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    // UPSERT: inserta la fila usuario_materia si no existe (con su estado actual)
    // o actualiza la nota si ya existía.
    await pool.query(`
      INSERT INTO usuario_materia (usuario_id, materia_id, estado, nota)
      VALUES ($1, $2, 'pendiente', $3)
      ON CONFLICT (usuario_id, materia_id)
      DO UPDATE SET nota = excluded.nota
    `, [usuario_id, Number(id), nota]);

    res.json({
      message: 'Nota guardada correctamente',
      nota,
      materia_id: Number(id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/estadisticas/titulo-intermedio
// Verifica si todas las materias de 1°, 2° y 3° del USUARIO están aprobadas.
// Igual que GET /api/materias, admite modo público (?view=public&user=<id>).
// ---------------------------------------------------------------------------
app.get('/api/estadisticas/titulo-intermedio', async (req, res) => {
  // Resolución híbrida de usuario (token o modo público) mediante helper.
  const autenticado = await resolverUsuarioId(req);
  if (!autenticado) {
    return res.status(401).json({ error: 'Token no proporcionado o usuario público inválido' });
  }

  // Obtenemos el carrera_id del usuario autenticado.
  // Los usuarios "legacy" (creados antes de la multi-carrera) tienen
  // carrera_id en null: en ese caso asumimos por defecto carrera_id = 1
  // (Ingeniería Informática).
  const usuarioResult = await pool.query(
    'SELECT carrera_id FROM usuarios WHERE id = $1',
    [autenticado.usuario_id]
  );
  const usuarioCarrera = usuarioResult.rows[0];
  const carrera_id = (usuarioCarrera && usuarioCarrera.carrera_id) || 1;
  const usuario_id = autenticado.usuario_id;

  try {
    // Total de materias del título intermedio (1°, 2° y 3°) que el usuario
    // NO tiene aprobadas, filtradas a las de SU carrera (m.carrera_id).
    const resultado = await pool.query(`
      SELECT COUNT(*) AS total
      FROM materias m
      LEFT JOIN usuario_materia um
        ON um.materia_id = m.id AND um.usuario_id = $1
      WHERE m.anio IN (1, 2, 3)
        AND m.carrera_id = $2
        AND COALESCE(um.estado, 'pendiente') != 'aprobada'
    `, [usuario_id, carrera_id]);

    const total = Number(resultado.rows[0].total);
    res.json({ obtenido: total === 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parciales
// Devuelve todos los parciales del usuario autenticado, ordenados por fecha.
// ---------------------------------------------------------------------------
app.get('/api/parciales', verificarToken, async (req, res) => {
  const usuario_id = req.usuarioId;

  try {
    const resultado = await pool.query(
      `SELECT * FROM parciales
       WHERE usuario_id = $1
       ORDER BY fecha ASC`,
      [usuario_id]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/parciales
// Crea un parcial para el usuario autenticado vinculado a una materia.
// Recibe materia_id, titulo y fecha desde req.body.
// ---------------------------------------------------------------------------
app.post('/api/parciales', verificarToken, async (req, res) => {
  const { materia_id, titulo, fecha } = req.body;
  const usuario_id = req.usuarioId;

  if (!materia_id || !titulo || !fecha) {
    return res.status(400).json({
      error: 'materia_id, titulo y fecha son obligatorios'
    });
  }

  try {
    // Verificamos que la materia exista en la grilla global
    const materiaResult = await pool.query(
      'SELECT id FROM materias WHERE id = $1',
      [materia_id]
    );
    if (materiaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    const resultado = await pool.query(`
      INSERT INTO parciales (usuario_id, materia_id, titulo, fecha)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [usuario_id, Number(materia_id), titulo, fecha]);

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/parciales/:id
// Elimina un parcial del usuario autenticado. El WHERE incluye usuario_id
// para que cada usuario solo pueda eliminar sus propios parciales.
// ---------------------------------------------------------------------------
app.delete('/api/parciales/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.usuarioId;

  try {
    const resultado = await pool.query(
      'DELETE FROM parciales WHERE id = $1 AND usuario_id = $2',
      [Number(id), usuario_id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        error: 'Parcial no encontrado o no pertenece al usuario'
      });
    }

    res.json({ message: 'Parcial eliminado correctamente', id: Number(id) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Inicializar el esquema y luego iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

