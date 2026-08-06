const bcrypt = require('bcrypt');

// Usamos el esquema centralizado definido en db.js (multitenant)
const { pool, initSchema } = require('./db.js');

// Array de materias con sus requerimientos
const materias = [
  { "nro": 1, "nombre": "Introducción al Cálculo", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 2, "nombre": "Álgebra I", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 3, "nombre": "Resolución de Problemas y Algoritmos", "anio": 1, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 4, "nombre": "Programación I", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [3], "req_aprob_cursar": [], "req_aprob_rendir": [3] },
  { "nro": 5, "nombre": "Matemática Discreta", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [2], "req_aprob_cursar": [], "req_aprob_rendir": [2] },
  { "nro": 6, "nombre": "Cálculo I", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [1], "req_aprob_cursar": [], "req_aprob_rendir": [1] },
  { "nro": 7, "nombre": "Álgebra II", "anio": 1, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [2], "req_aprob_cursar": [], "req_aprob_rendir": [2] },
  { "nro": 8, "nombre": "Probabilidad y Estadística", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [5], "req_aprob_cursar": [], "req_aprob_rendir": [5] },
  { "nro": 9, "nombre": "Inglés", "anio": 2, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [3], "req_aprob_cursar": [], "req_aprob_rendir": [3] },
  { "nro": 10, "nombre": "Programación II", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [4], "req_aprob_cursar": [1], "req_aprob_rendir": [4] },
  { "nro": 11, "nombre": "Organización y Arquitectura de Computadoras", "anio": 2, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [4], "req_aprob_cursar": [3], "req_aprob_rendir": [4] },
  { "nro": 12, "nombre": "Programación III", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [10], "req_aprob_cursar": [3], "req_aprob_rendir": [10] },
  { "nro": 13, "nombre": "Estructuras de Datos y Algoritmos", "anio": 2, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [4, 8], "req_aprob_cursar": [], "req_aprob_rendir": [4, 8] },
  { "nro": 14, "nombre": "Física", "anio": 2, "cuatrimestre": "A", "tipo": "obligatoria", "req_reg_cursar": [2, 6], "req_aprob_cursar": [1], "req_aprob_rendir": [2] },
  { "nro": 15, "nombre": "Ingeniería de Software I", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [10], "req_aprob_cursar": [4], "req_aprob_rendir": [10] },
  { "nro": 16, "nombre": "Ética y Legislación", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [10], "req_aprob_cursar": [4], "req_aprob_rendir": [10] },
  { "nro": 17, "nombre": "Base de Datos", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [13], "req_aprob_cursar": [4], "req_aprob_rendir": [13] },
  { "nro": 18, "nombre": "Modelos y Simulación", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [8, 10], "req_aprob_cursar": [6], "req_aprob_rendir": [8, 10] },
  { "nro": 19, "nombre": "Fundamentos de Computación", "anio": 3, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [13], "req_aprob_cursar": [2, 5], "req_aprob_rendir": [] },
  { "nro": 20, "nombre": "Ingeniería de Software II", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [15, 17], "req_aprob_cursar": [10], "req_aprob_rendir": [15, 17] },
  { "nro": 21, "nombre": "Laboratorio de Tecnologías", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [12, 15, 17], "req_aprob_cursar": [10], "req_aprob_rendir": [12, 15, 17] },
  { "nro": 22, "nombre": "Redes de Computadoras", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [10, 11], "req_aprob_cursar": [5], "req_aprob_rendir": [10, 11] },
  { "nro": 23, "nombre": "Sistemas Operativos", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [11, 18], "req_aprob_cursar": [5], "req_aprob_rendir": [11, 18] },
  { "nro": 24, "nombre": "Análisis Numérico", "anio": 3, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [10], "req_aprob_cursar": [6, 7], "req_aprob_rendir": [10] },
  { "nro": 25, "nombre": "Planeamiento Estratégico de Sistemas de Información", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [20], "req_aprob_cursar": [], "req_aprob_rendir": [20] },
  { "nro": 26, "nombre": "Sistemas Críticos", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [20, 24], "req_aprob_cursar": [12, 15], "req_aprob_rendir": [] },
  { "nro": 27, "nombre": "Ingeniería Web", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [20, 21], "req_aprob_cursar": [12, 17], "req_aprob_rendir": [] },
  { "nro": 28, "nombre": "Teoría de la Información y la Comunicación", "anio": 4, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [19, 21], "req_aprob_cursar": [13], "req_aprob_rendir": [19, 21] },
  { "nro": 29, "nombre": "Calidad y Certificación del Proceso y del Producto de Software", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [20, 21], "req_aprob_cursar": [17, 18], "req_aprob_rendir": [] },
  { "nro": 30, "nombre": "Auditoría Informática", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [16, 25], "req_aprob_cursar": [12], "req_aprob_rendir": [] },
  { "nro": 31, "nombre": "Sistemas Inteligentes", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [22, 23], "req_aprob_cursar": [12], "req_aprob_rendir": [] },
  { "nro": 32, "nombre": "Diseño y Paradigmas de Lenguajes", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [19], "req_aprob_cursar": [13], "req_aprob_rendir": [19] },
  { "nro": 33, "nombre": "Seguridad de Sistemas Informáticos", "anio": 4, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [21, 22], "req_aprob_cursar": [18], "req_aprob_rendir": [21, 22] },
  { "nro": 34, "nombre": "Arquitectura de Software", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [27], "req_aprob_cursar": [20], "req_aprob_rendir": [27] },
  { "nro": 35, "nombre": "Reingeniería de las Organizaciones y de los Sist. de Información", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [25, 27], "req_aprob_cursar": [20, 21], "req_aprob_rendir": [25, 27] },
  { "nro": 36, "nombre": "Administración y Evaluación Financiera de Proyectos Informáticos", "anio": 5, "cuatrimestre": "1", "tipo": "obligatoria", "req_reg_cursar": [25], "req_aprob_cursar": [21], "req_aprob_rendir": [25] },
  { "nro": 37, "nombre": "Optativa (Mínimo 75 hs.)", "anio": 5, "cuatrimestre": "1", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 38, "nombre": "Optativa (Mínimo 75 hs.)", "anio": 5, "cuatrimestre": "2", "tipo": "optativa", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 39, "nombre": "Práctica Profesional Supervisada", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] },
  { "nro": 40, "nombre": "Proyecto Integrador", "anio": 5, "cuatrimestre": "2", "tipo": "obligatoria", "req_reg_cursar": [], "req_aprob_cursar": [], "req_aprob_rendir": [] }
];

// Función para convertir el cuatrimestre del JSON al valor numérico que usa la tabla
// 'A' (anual) → 0, '1' → 1, '2' → 2
function convertirCuatrimestre(cuatrimestre) {
  if (cuatrimestre === 'A') return 0;
  return parseInt(cuatrimestre, 10);
}

async function ejecutarSeed() {
  // Garantizar que el esquema esté creado antes de insertar
  await initSchema();

  console.log('=== Iniciando seeder ===\n');

  // Vaciar las tablas para empezar desde cero (respetando FKs: primero las hijas)
  await pool.query('DELETE FROM usuario_materia');
  await pool.query('DELETE FROM correlativas');
  await pool.query('DELETE FROM materias');
  await pool.query('DELETE FROM usuarios');

  // Restablecer los contadores de autoincremento (SERIAL usa secuencias)
  for (const tabla of ['usuarios', 'materias']) {
    await pool.query(`ALTER SEQUENCE ${tabla}_id_seq RESTART WITH 1`);
  }

  // Mapeo en memoria: nro de la materia -> id real en la base de datos
  const mapaIds = {};

  console.log('Insertando materias (grilla global)...');
  for (const materia of materias) {
    const resultado = await pool.query(`
      INSERT INTO materias (nombre, anio, cuatrimestre, tipo)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      materia.nombre,
      materia.anio,
      convertirCuatrimestre(materia.cuatrimestre),
      materia.tipo
    ]);
    mapaIds[materia.nro] = resultado.rows[0].id;
  }
  console.log(`Materias insertadas: ${materias.length}\n`);

  console.log('Insertando requisitos en la tabla correlativas...');
  let requisitosCount = 0;

  for (const materia of materias) {
    const materiaIdReal = mapaIds[materia.nro];

    // req_reg_cursar: tipo_requisito='para_cursar', condicion_requerida='regular'
    for (const reqNro of materia.req_reg_cursar) {
      await pool.query(`
        INSERT INTO correlativas (materia_id, requiere_id, tipo_requisito, condicion_requerida)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (materia_id, requiere_id, tipo_requisito) DO NOTHING
      `, [materiaIdReal, mapaIds[reqNro], 'para_cursar', 'regular']);
      requisitosCount++;
    }

    // req_aprob_cursar: tipo_requisito='para_cursar', condicion_requerida='aprobada'
    for (const reqNro of materia.req_aprob_cursar) {
      await pool.query(`
        INSERT INTO correlativas (materia_id, requiere_id, tipo_requisito, condicion_requerida)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (materia_id, requiere_id, tipo_requisito) DO NOTHING
      `, [materiaIdReal, mapaIds[reqNro], 'para_cursar', 'aprobada']);
      requisitosCount++;
    }

    // req_aprob_rendir: tipo_requisito='para_rendir', condicion_requerida='aprobada'
    for (const reqNro of materia.req_aprob_rendir) {
      await pool.query(`
        INSERT INTO correlativas (materia_id, requiere_id, tipo_requisito, condicion_requerida)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (materia_id, requiere_id, tipo_requisito) DO NOTHING
      `, [materiaIdReal, mapaIds[reqNro], 'para_rendir', 'aprobada']);
      requisitosCount++;
    }
  }

  console.log(`Requisitos insertados: ${requisitosCount}\n`);

  // --- MULTITENANT: usuario administrador por defecto + asignación de materias ---

  console.log('Creando usuario administrador por defecto...');

  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = '123456'; // Solo para desarrollo - cambiar en producción
  const SALT_ROUNDS = 10;

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);

  // Se usa ON CONFLICT DO NOTHING para no fallar si el admin ya existe.
  // No podemos usar RETURNING junto a DO NOTHING sin poder distinguir fácilmente
  // el caso "ya existía", así que primero intentamos insertar y
  // recuperamos el id por username al final.
  await pool.query(`
    INSERT INTO usuarios (username, password_hash, rol, is_approved)
    VALUES ($1, $2, 'admin', true)
    ON CONFLICT (username) DO NOTHING
  `, [ADMIN_USERNAME, passwordHash]);

  const adminResult = await pool.query(
    'SELECT id FROM usuarios WHERE username = $1',
    [ADMIN_USERNAME]
  );
  const adminId = adminResult.rows[0].id;
  console.log(`Usuario administrador '${ADMIN_USERNAME}' listo (id=${adminId})`);

  console.log('Asignando todas las materias al administrador en estado pendiente...');

  let asignadasCount = 0;
  for (const materia of materias) {
    const materiaIdReal = mapaIds[materia.nro];
    const resumen = await pool.query(`
      INSERT INTO usuario_materia (usuario_id, materia_id, estado)
      VALUES ($1, $2, 'pendiente')
      ON CONFLICT (usuario_id, materia_id) DO NOTHING
    `, [adminId, materiaIdReal]);
    asignadasCount += resumen.rowCount;
  }

  console.log(`Materias asignadas al admin: ${asignadasCount}/${materias.length}\n`);
  console.log('=== Seeder completado correctamente ===');

  await pool.end();
}

ejecutarSeed().catch((error) => {
  console.error('Error ejecutando el seeder:', error);
  process.exit(1);
});
