const bcrypt = require('bcrypt');

// Usamos el esquema centralizado definido en db.js (multitenant)
const { pool, initSchema } = require('./db.js');

// Array de materias de Ingeniería Informática (plan 2/25) - extraído a módulo propio
const { materiasInformatica } = require('./ingenieria_informatica.js');

// El array de materias de Informática ahora proviene del módulo externo.
const materias = materiasInformatica;

// Array de materias de la Licenciatura en Ciencias de la Educación (plan 20/99)
const materiasEducacion = require('./licenciatura_educacion.js').materiasEducacion;

// Función para convertir el cuatrimestre del JSON al valor numérico que usa la tabla
// 'A' (anual) → 0, '1' → 1, '2' → 2
function convertirCuatrimestre(cuatrimestre) {
  if (cuatrimestre === 'A') return 0;
  return parseInt(cuatrimestre, 10);
}

async function ejecutarSeed() {
  // initSchema() es seguro (usa CREATE TABLE IF NOT EXISTS y migraciones idempotentes).
  await initSchema();

  console.log('=== Iniciando seeder (modo NO destructivo / idempotente) ===\n');

  // NOTA IMPORTANTE: este seeder es 100% NO destructivo.
  // - NO se borran carreras, materias ni correlativas.
  // - NO se reinicia ningún contador de secuencia (ALTER SEQUENCE).
  // - NO se toca ninguna tabla de usuarios, roles, parciales ni las relaciones
  //   usuario_materia que ya existan. Solo se AGREGAN los datos que falten.

  // --- MULTICARRERA: definir las carreras a sembrar con sus respectivas materias ---
  const carreras = [
    { nombre: 'Ingeniería Informática', plan: '2/25', materias: materiasInformatica },
    { nombre: 'Licenciatura en Ciencias de la Educación', plan: '20/99', materias: materiasEducacion },
  ];

  // Mapeo global por carrera: nro de la materia -> id real en la base de datos
  const mapaIdsPorCarrera = {};

  for (const carrera of carreras) {
    console.log(`\n--- Procesando carrera: ${carrera.nombre} (plan ${carrera.plan}) ---`);

    // VERIFICAR primero si la carrera ya existe (upsert no destructivo).
    // Usamos ON CONFLICT (nombre, plan) DO UPDATE para que la query
    // SIEMPRE devuelva el id (sea nuevo o existente) y no duplicarla.
    const insCarrera = await pool.query(`
      INSERT INTO carreras (nombre, plan)
      VALUES ($1, $2)
      ON CONFLICT (nombre, plan)
      DO UPDATE SET nombre = EXCLUDED.nombre
      RETURNING id
    `, [carrera.nombre, carrera.plan]);
    const carreraId = insCarrera.rows[0].id;
    console.log(`Carrera sincronizada (id=${carreraId}, ${carrera.nombre})`);

    const mapaIds = {};
    let nuevasMaterias = 0;
    console.log(`Sincronizando materias de ${carrera.materias.length} materias...`);
    for (const materia of carrera.materias) {
      // Gracias a la constraint UNIQUE (carrera_id, nombre) definida en db.js,
      // las materias ya cargadas se ignoran (ON CONFLICT DO NOTHING) y no se
      // duplican dentro de una misma carrera.
      const resultado = await pool.query(`
        INSERT INTO materias (nombre, anio, cuatrimestre, tipo, carrera_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (carrera_id, nombre) DO NOTHING
        RETURNING id
      `, [
        materia.nombre,
        materia.anio,
        convertirCuatrimestre(materia.cuatrimestre),
        materia.tipo,
        carreraId
      ]);

      let materiaId;
      if (resultado.rowCount > 0) {
        // Materia insertada nueva: usamos su id directamente.
        materiaId = resultado.rows[0].id;
        nuevasMaterias++;
      } else {
        // La materia ya existía en esta carrera (conflicto ignorado):
        // recuperamos su id existente para mantener referencias estables.
        const existente = await pool.query(
          'SELECT id FROM materias WHERE nombre = $1 AND carrera_id = $2',
          [materia.nombre, carreraId]
        );
        materiaId = existente.rows[0].id;
      }
      mapaIds[materia.nro] = materiaId;
    }
    console.log(`Materias nuevas insertadas: ${nuevasMaterias}/${carrera.materias.length}`);
    mapaIdsPorCarrera[carreraId] = mapaIds;

    // --- CORRELATIVAS: idempotentes gracias a la PRIMARY KEY (materia_id, requiere_id, tipo_requisito) ---
    console.log('Sincronizando requisitos en la tabla correlativas...');
    let requisitosCount = 0;
    for (const materia of carrera.materias) {
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
    console.log(`Requisitos sincronizados (procesados): ${requisitosCount}`);
  }
  console.log('');

  // --- MULTITENANT: usuario administrador por defecto + asignación de materias ---

  // NUEVO: si el admin ya existe, NO pisamos su contraseña ni sus datos.
  console.log('Verificando/creando usuario administrador por defecto...');

  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = '123456'; // Solo para desarrollo - cambiar en producción
  const SALT_ROUNDS = 10;

  let adminRow = await pool.query(
    'SELECT id FROM usuarios WHERE username = $1',
    [ADMIN_USERNAME]
  );

  let adminId;
  if (adminRow.rows.length > 0) {
    // El usuario ya existe: NO tocamos su hash ni sus datos.
    adminId = adminRow.rows[0].id;
    console.log(`Usuario administrador '${ADMIN_USERNAME}' ya existía (id=${adminId}), se conserva tal cual`);
  } else {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, SALT_ROUNDS);
    const ins = await pool.query(`
      INSERT INTO usuarios (username, password_hash, rol, is_approved)
      VALUES ($1, $2, 'admin', true)
      RETURNING id
    `, [ADMIN_USERNAME, passwordHash]);
    adminId = ins.rows[0].id;
    console.log(`Usuario administrador '${ADMIN_USERNAME}' creado (id=${adminId})`);
  }

  // Asignamos las materias al admin solo si no están asignadas (ON CONFLICT DO NOTHING).
  console.log('Asignando materias al administrador (solo las que falten, en estado pendiente)...');

  let asignadasCount = 0;
  let yaAsignadasCount = 0;
  let totalMaterias = 0;
  const mapasIds = Object.values(mapaIdsPorCarrera);
  for (let i = 0; i < carreras.length; i++) {
    const carrera = carreras[i];
    const mapaIds = mapasIds[i];
    for (const materia of carrera.materias) {
      const materiaIdReal = mapaIds[materia.nro];
      const resumen = await pool.query(`
        INSERT INTO usuario_materia (usuario_id, materia_id, estado)
        VALUES ($1, $2, 'pendiente')
        ON CONFLICT (usuario_id, materia_id) DO NOTHING
      `, [adminId, materiaIdReal]);
      if (resumen.rowCount > 0) {
        asignadasCount++;
      } else {
        yaAsignadasCount++;
      }
      totalMaterias++;
    }
  }

  console.log(`Materias nuevas asignadas al admin: ${asignadasCount}/${totalMaterias}`);
  console.log(`Materias ya asignadas (sin tocar): ${yaAsignadasCount}`);
  console.log('\n=== Seeder completado correctamente (sin pérdida de datos) ===');

  await pool.end();
}

ejecutarSeed().catch((error) => {
  console.error('Error ejecutando el seeder:', error);
  process.exit(1);
});
