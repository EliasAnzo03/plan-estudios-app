import { useState, useEffect } from 'react'
import Login from './Login.jsx'

const ESTILOS_ESTADO = {
  aprobada: {
    borde: 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    badge: 'bg-green-500/10 text-green-400',
    texto: 'text-green-400',
    etiqueta: 'Aprobada',
  },
  regular: {
    borde: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    badge: 'bg-orange-500/10 text-orange-400',
    texto: 'text-orange-400',
    etiqueta: 'Regular',
  },
  en_curso: {
    borde: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    badge: 'bg-blue-500/10 text-blue-400',
    texto: 'text-blue-400',
    etiqueta: 'En curso',
  },
  pendiente: {
    borde: 'border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]',
    badge: 'bg-slate-300/10 text-slate-300',
    texto: 'text-slate-100',
    etiqueta: 'Pendiente',
  },
}

function App() {
  const API_URL = import.meta.env.VITE_BACKEND_URL || ''

  const [materias, setMaterias] = useState([])
  const [tituloIntermedio, setTituloIntermedio] = useState(false)
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false)
  const [usuariosPendientes, setUsuariosPendientes] = useState([])
  const [cargandoPendientes, setCargandoPendientes] = useState(false)
  const [errorAdmin, setErrorAdmin] = useState('')
  const [materiaInfo, setMateriaInfo] = useState(null) // materia abierta en el modal de correlativas
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario'))
    } catch {
      return null
    }
  })

  // ---------------------------------------------------------------------
  // Modo Solo Lectura (Shareable Link)
  // Detectamos la vista pública a partir de la URL: ?view=public&user=<id>.
  // En este modo no hay sesión: se deshabilitan los cambios de estado, se
  // oculta el input de notas (se muestra como texto estático) y el dashboard
  // y el modal de correlativas siguen funcionando de forma normal.
  // ---------------------------------------------------------------------
  const parametrosUrl = new URLSearchParams(window.location.search)
  const esModoPublico = parametrosUrl.get('view') === 'public'
  const publicUserId = esModoPublico ? parametrosUrl.get('user') : null
  const [linkCopiado, setLinkCopiado] = useState(false)

  // Construye la URL del link público para compartir.
  const urlCompartir = () => {
    const base = `${window.location.origin}${window.location.pathname}`
    return `${base}?view=public&user=${usuario?.id ?? publicUserId}`
  }

  // Copia el link público al portapapeles y muestra el aviso "¡Link copiado!".
  const copiarLinkPublico = async () => {
    try {
      await navigator.clipboard.writeText(urlCompartir())
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      // Si el portapapeles no está disponible, copiamos de forma manual.
      const textarea = document.createElement('textarea')
      textarea.value = urlCompartir()
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    }
  }

  // Orden del ciclo de estados: pendiente -> en_curso -> regular -> aprobada -> pendiente
  const ORDEN_CICLO = ['pendiente', 'en_curso', 'regular', 'aprobada']

  // Limpia localStorage y desloguea al usuario (para 401 y cierre de sesión)
  const desloguear = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
    setMaterias([])
    setTituloIntermedio(false)
    setMostrarPanelAdmin(false)
    setUsuariosPendientes([])
    setErrorAdmin('')
  }

  // Maneja la sesión tras un login exitoso (se lo pasamos a <Login/>)
  const manejarLogin = (nuevoToken, nuevoUsuario) => {
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  // Carga los usuarios pendientes de aprobación (solo admin)
  const cargarUsuariosPendientes = async () => {
    setCargandoPendientes(true)
    setErrorAdmin('')
    try {
      const respuesta = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (respuesta.status === 401) {
        desloguear()
        return
      }
      if (!respuesta.ok) {
        const datos = await respuesta.json()
        setErrorAdmin(datos.error || 'No se pudieron cargar los usuarios')
        return
      }
      const datos = await respuesta.json()
      setUsuariosPendientes(datos.usuarios)
    } catch {
      setErrorAdmin('Error de red al cargar los usuarios')
    } finally {
      setCargandoPendientes(false)
    }
  }

  // Aprueba el acceso de un usuario pendiente (solo admin)
  const aprobarUsuario = async (userId) => {
    setErrorAdmin('')
    try {
      const respuesta = await fetch(
        `${API_URL}/api/admin/users/${userId}/approve`,
        {
          method: 'PUT',
          headers: { Authorization: 'Bearer ' + token },
        }
      )
      if (respuesta.status === 401) {
        desloguear()
        return
      }
      if (!respuesta.ok) {
        const datos = await respuesta.json()
        setErrorAdmin(datos.error || 'No se pudo aprobar el usuario')
        return
      }
      // Removemos el usuario aprobado de la lista de pendientes
      setUsuariosPendientes((prev) =>
        prev.filter((u) => u.id !== userId)
      )
    } catch {
      setErrorAdmin('Error de red al aprobar el usuario')
    }
  }

  // Chequea el error de la respuesta; si es 401, desloguea automáticamente.
  const verificarNoAutorizado = (respuesta) => {
    if (respuesta.status === 401) {
      desloguear()
    }
    return respuesta
  }

  // Cambia el estado de forma cíclica al hacer clic en una tarjeta.
  // Si el siguiente estado ("Aprobada") está bloqueado por correlativas de rendición,
  // reiniciamos el ciclo a "Pendiente" para que el usuario pueda deshacer su acción.
  const ciclarEstadoMateria = async (materia, puedeRendir) => {
    const indiceActual = ORDEN_CICLO.indexOf(materia.estado)
    let nuevoEstado = ORDEN_CICLO[(indiceActual + 1) % ORDEN_CICLO.length]

    // Regla 2: si "Aprobada" está bloqueado (faltan correlativas para rendir),
    // en vez de quedarse trabado, reiniciamos el ciclo a "Pendiente".
    if (nuevoEstado === 'aprobada' && !puedeRendir) {
      nuevoEstado = 'pendiente'
    }

    try {
      const respuesta = await verificarNoAutorizado(
        await fetch(`${API_URL}/api/materias/${materia.id}/estado`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ estado: nuevoEstado }),
        })
      )

      if (!respuesta.ok) {
        console.error('Error al actualizar el estado')
        return
      }

      // Actualización optimista inmediata en el estado local
      setMaterias((prev) =>
        prev.map((m) =>
          m.id === materia.id ? { ...m, estado: nuevoEstado } : m
        )
      )
    } catch (error) {
      console.error('Error de red:', error)
    }
  }

  // Guarda la nota de una materia aprobada (1 a 10, admite decimales)
  // Hace un PUT al backend y actualiza el estado local optimista.
  const guardarNota = async (materiaId, valor) => {
    // Permitimos vacío (limpiará la nota)
    if (valor === '') {
      setMaterias((prev) =>
        prev.map((m) => (m.id === materiaId ? { ...m, nota: null } : m))
      )
      try {
        await verificarNoAutorizado(
          await fetch(`${API_URL}/api/materias/${materiaId}/nota`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify({ nota: null }),
          })
        )
      } catch (error) {
        console.error('Error de red al guardar la nota:', error)
      }
      return
    }

    const notaNum = Number(valor)
    if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
      return
    }

    try {
      const respuesta = await verificarNoAutorizado(
        await fetch(`${API_URL}/api/materias/${materiaId}/nota`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ nota: notaNum }),
        })
      )
      if (!respuesta.ok) {
        console.error('Error al guardar la nota')
        return
      }
      setMaterias((prev) =>
        prev.map((m) => (m.id === materiaId ? { ...m, nota: notaNum } : m))
      )
    } catch (error) {
      console.error('Error de red al guardar la nota:', error)
    }
  }

  // ---------------------------------------------------------------
  // Cálculos para el Dashboard de Progreso y Promedio
  // ---------------------------------------------------------------
  const totalMaterias = materias.length
  const materiasAprobadas = materias.filter((m) => m.estado === 'aprobada')
  const porcentajeAvance =
    totalMaterias > 0
      ? Math.round((materiasAprobadas.length / totalMaterias) * 100)
      : 0

  // Promedio histórico: promedio de las notas ingresadas en materias aprobadas
  const notasAprobadas = materiasAprobadas
    .map((m) => m.nota)
    .filter(
      (n) => n !== null && n !== undefined && n !== '' && !isNaN(Number(n))
    )
  const promedioHistorico =
    notasAprobadas.length > 0
      ? (
          notasAprobadas.reduce((acc, n) => acc + Number(n), 0) /
          notasAprobadas.length
        ).toFixed(2)
      : null
  const promedioMostrado =
    promedioHistorico !== null ? promedioHistorico : '—'
  const cantidadNotas = notasAprobadas.length

  // Agrupa las materias por año y luego por cuatrimestre (1, 2 o 'A' anuales)
  const agruparMaterias = () => {
    const grupos = {}

    materias.forEach((materia) => {
      const cuatrimestre =
        materia.cuatrimestre === 0 ? 'A' : String(materia.cuatrimestre)
      const clave = `${materia.anio}-${cuatrimestre}`

      if (!grupos[clave]) {
        grupos[clave] = {
          anio: materia.anio,
          cuatrimestre,
          materias: [],
        }
      }
      grupos[clave].materias.push(materia)
    })

    // Orden: año ascendente y luego cuatrimestre 1, 2, 'A'
    const ordenCuatri = { '1': 0, '2': 1, A: 2 }
    return Object.values(grupos).sort(
      (a, b) =>
        a.anio - b.anio ||
        ordenCuatri[a.cuatrimestre] - ordenCuatri[b.cuatrimestre]
    )
  }

  // Formatea la etiqueta del eje de tiempo: 'AÑO 1 - 1ER SEM' / 'AÑO 1 - ANUAL'
  const formatearEje = (grupo) => {
    const anio = `AÑO ${grupo.anio}`
    const cuatri =
      grupo.cuatrimestre === 'A'
        ? 'ANUAL'
        : grupo.cuatrimestre === '1'
        ? '1ER SEM'
        : '2DO SEM'
    return `${anio} - ${cuatri}`
  }

  // Determina si se cumplen las correlativas de una materia para el nivel dado.
  // Cada requisito de materia.correlativas[tipo] es { id, nombre, condicion }.
  // - 'paraCursar': se respeta la condición individual de cada requisito
  //   (regular o aprobada) cargada en el backend.
  // - 'paraRendir': se exige estrictamente "aprobada" en cada requisito.
  const cumpleCorrelativas = (materia, tipo) => {
    const requisitos = (materia.correlativas && materia.correlativas[tipo]) || []
    if (requisitos.length === 0) return true
    return requisitos.every((req) => {
      const requisito = materias.find((m) => m.id === req.id)
      if (!requisito) return false
      // paraRendir siempre exige "aprobada"; paraCursar usa la condición individual.
      if (tipo === 'paraRendir' || req.condicion === 'aprobada') {
        return requisito.estado === 'aprobada'
      }
      return requisito.estado === 'regular' || requisito.estado === 'aprobada'
    })
  }

  useEffect(() => {
    // En modo público no hay token; la grilla se resuelve desde publicUserId.
    if (!token && !esModoPublico) return

    const cargarDatos = async () => {
      try {
        // Construimos el query para el modo público (?view=public&user=<id>)
        const queryPublica = esModoPublico
          ? `?view=public&user=${publicUserId}`
          : ''
        const headers = esModoPublico ? {} : { Authorization: 'Bearer ' + token }

        // Cargar materias
        const respMaterias = await verificarNoAutorizado(
          await fetch(`${API_URL}/api/materias${queryPublica}`, { headers })
        )
        if (!respMaterias.ok) return
        const datos = await respMaterias.json()
        setMaterias(datos)

        // Chequear si se obtuvo el título intermedio (también público)
        const respTitulo = await verificarNoAutorizado(
          await fetch(`${API_URL}/api/estadisticas/titulo-intermedio${queryPublica}`, {
            headers,
          })
        )
        if (!respTitulo.ok) return
        const titulo = await respTitulo.json()
        setTituloIntermedio(titulo.obtenido)
      } catch (error) {
        console.error('Error al cargar datos:', error)
      }
    }

    cargarDatos()
  }, [token, esModoPublico, publicUserId])

  // Si NO hay token y NO estamos en modo público, mostramos la pantalla de Login.
  if (!token && !esModoPublico) {
    return <Login onLogin={manejarLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 text-slate-300 overflow-x-hidden">
      {/* Barra de sesión y Header informativo */}
      <div className="max-w-6xl mx-auto flex justify-end mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {usuario && (
            <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">
              {usuario.username} · {usuario.rol}
            </span>
          )}
          {usuario && usuario.rol === 'admin' && (
            <button
              onClick={() => {
                const abrir = !mostrarPanelAdmin
                setMostrarPanelAdmin(abrir)
                if (abrir) cargarUsuariosPendientes()
              }}
              className={`text-xs font-semibold uppercase tracking-wider border rounded-lg px-3 py-1.5 transition-all duration-300 ${
                mostrarPanelAdmin
                  ? 'text-indigo-300 border-indigo-500/60 bg-indigo-500/10'
                  : 'text-slate-500 hover:text-indigo-300 border-slate-800 hover:border-indigo-500/50'
              }`}
            >
              {mostrarPanelAdmin ? 'Cerrar Panel' : 'Panel Admin'}
            </button>
          )}
          {!esModoPublico && (
            <button
              onClick={desloguear}
              className="text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/50 rounded-lg px-3 py-1.5 font-semibold uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Banner de modo público / solo lectura */}
      {esModoPublico && (
        <div className="max-w-6xl mx-auto mb-4">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-slate-900/70 border border-slate-800 rounded-lg px-4 py-2">
            <span className="text-slate-500">👁</span> Vista pública (solo lectura) · Ábrelo con tu cuenta para editar
          </div>
        </div>
      )}

      {/* Header informativo */}
      <div className="flex flex-col items-center mb-10 gap-2">
        <h1 className="text-indigo-500 text-lg sm:text-2xl font-bold tracking-[0.15em] sm:tracking-[0.3em] drop-shadow-md uppercase text-center break-words">
          Ingeniería Informática
        </h1>
        <p className="text-slate-500 text-sm tracking-widest uppercase">
          Malla Curricular - Correlativas
        </p>
        {!esModoPublico && (
          <p className="text-slate-600 text-xs font-mono mt-2 text-center">
            Click 1x -&gt; En Curso · Click 2x -&gt; Regular · Click 3x -&gt; Aprobada · Click 4x -&gt; Reiniciar
          </p>
        )}

        {/* Leyenda de colores */}
        <div className="flex flex-wrap justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border-2 border-slate-800"></div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Bloqueada
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border-2 border-slate-300"></div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Puedo Cursar
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border-2 border-blue-500"></div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              En Curso
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border-2 border-orange-500"></div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Regular
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border-2 border-green-500"></div>
            <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
              Aprobada
            </span>
          </div>
        </div>
      </div>

      {/* Panel de administración: usuarios pendientes de aprobación */}
      {usuario && usuario.rol === 'admin' && mostrarPanelAdmin && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-[0_0_25px_rgba(99,102,241,0.1)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-indigo-400 font-bold uppercase tracking-widest">
                Panel Admin - Usuarios pendientes
              </h2>
              <button
                onClick={cargarUsuariosPendientes}
                disabled={cargandoPendientes}
                className="text-xs text-slate-500 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/50 rounded-lg px-3 py-1.5 font-semibold uppercase tracking-wider transition-all duration-300 disabled:opacity-50"
              >
                {cargandoPendientes ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>

            {errorAdmin && (
              <p className="text-red-500 text-sm font-medium text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
                {errorAdmin}
              </p>
            )}

            {cargandoPendientes ? (
              <p className="text-center text-slate-500 text-sm py-8">
                Cargando usuarios pendientes...
              </p>
            ) : usuariosPendientes.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">
                No hay usuarios pendientes de aprobación.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Usuario</th>
                      <th className="py-2 pr-4">Rol</th>
                      <th className="py-2">Estado</th>
                      <th className="py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosPendientes.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-slate-800/50 text-slate-300"
                      >
                        <td className="py-3 pr-4 font-mono text-slate-500">
                          {u.id}
                        </td>
                        <td className="py-3 pr-4 font-semibold">{u.username}</td>
                        <td className="py-3 pr-4 uppercase text-xs">
                          {u.rol}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-1">
                            Pendiente
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => aprobarUsuario(u.id)}
                            className="text-xs font-semibold uppercase tracking-wider text-green-400 hover:text-green-300 border border-green-500/50 hover:bg-green-500/10 rounded-lg px-3 py-1.5 transition-all duration-300"
                          >
                            Aprobar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tituloIntermedio && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-500/20 text-yellow-300 font-bold text-lg text-center p-6 rounded-2xl border border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]">
            🎓 ¡Analista Desarrollador Universitario de Sistemas Informáticos!
          </div>
        </div>
      )}

      {/* Botón de Compartir progreso (solo en modo con sesión) */}
      {!esModoPublico && (
        <div className="max-w-6xl mx-auto mb-4 flex justify-end">
          <button
            onClick={copiarLinkPublico}
            className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-500/10 rounded-lg px-4 py-2 transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
          >
            <span className="text-base leading-none">🔗</span>
            Compartir mi progreso
          </button>
        </div>
      )}

      {/* Aviso de link copiado */}
      {linkCopiado && (
        <div className="max-w-6xl mx-auto mb-4 flex justify-end">
          <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-1.5">
            ✓ ¡Link copiado!
          </span>
        </div>
      )}

      {/* Dashboard de Progreso y Promedio */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-[0_0_25px_rgba(99,102,241,0.1)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Porcentaje de avance con barra de progreso */}
            <div className="flex-1 min-w-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">
                Progreso de la carrera
              </p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-indigo-400">
                  {porcentajeAvance}%
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {materiasAprobadas.length} / {totalMaterias} materias aprobadas
                </span>
              </div>
              <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeAvance}%` }}
                />
              </div>
            </div>

            {/* Promedio histórico */}
            <div className="sm:border-l sm:border-slate-800 sm:pl-6 sm:shrink-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1 text-center sm:text-left">
                Promedio histórico
              </p>
              <div className="text-center sm:text-left">
                <span className="text-4xl font-bold text-green-400">
                  {promedioMostrado}
                </span>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {cantidadNotas} {cantidadNotas === 1 ? 'nota cargada' : 'notas cargadas'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline de la malla curricular agrupado por Año y Cuatrimestre */}
      <div className="max-w-6xl mx-auto space-y-6">
        {agruparMaterias().map((grupo) => (
          <div
            key={`${grupo.anio}-${grupo.cuatrimestre}`}
            className="grid grid-cols-[55px_1fr] sm:grid-cols-[120px_1fr] gap-3 sm:gap-6 min-w-0 w-full"
          >
            {/* Eje de tiempo */}
            <div className="text-slate-500 text-[10px] sm:text-xs font-mono uppercase text-right border-r border-slate-800 pr-2 sm:pr-4 pt-1 break-words">
              {formatearEje(grupo)}
            </div>

            {/* Tarjetas de materias del grupo */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 min-w-0">
              {grupo.materias.map((materia) => {
                const estilo =
                  ESTILOS_ESTADO[materia.estado] || ESTILOS_ESTADO.pendiente

                // Regla 1: puede cursar (En Curso / Regular) si paraCursar está en regular o aprobada.
                const puedeCursar = cumpleCorrelativas(materia, 'paraCursar')
                // Regla 2: puede rendir (Aprobada) solo si paraRendir está estrictamente aprobada.
                const puedeRendir = cumpleCorrelativas(materia, 'paraRendir')

                // En modo público deshabilitamos el click para cambiar estados.
                const editable = puedeCursar && !esModoPublico

                const tarjetaClases = editable
                  ? `bg-slate-900 rounded-xl border ${estilo.borde} p-5 w-full sm:w-64 transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer`
                  : `bg-slate-900/80 rounded-xl border ${estilo.borde} p-5 w-full sm:w-64`

                return (
                  <div
                    key={materia.id}
                    onClick={
                      editable
                        ? () => ciclarEstadoMateria(materia, puedeRendir)
                        : undefined
                    }
                    className={tarjetaClases}
                  >
                    <div className="flex flex-col items-start gap-3 relative">
                      <div className="w-full flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-full ${estilo.badge}`}
                        >
                          {estilo.etiqueta}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMateriaInfo(materia)
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/60 transition-all duration-300 cursor-pointer shrink-0"
                          aria-label={`Ver correlativas de ${materia.nombre}`}
                          title="Ver correlativas"
                        >
                          ℹ️
                        </button>
                      </div>
                      <h3 className="font-semibold text-lg text-slate-100 break-words pr-1">
                        {materia.nombre}
                      </h3>
                    </div>

                    {/* Nota: solo se muestra si la materia está "Aprobada".
                        - Con sesión: input numérico editable.
                        - Modo público: texto estático, solo lectura. */}
                    {materia.estado === 'aprobada' && (
                      esModoPublico ? (
                        <div className="w-full flex items-center gap-2">
                          <label className="text-[10px] uppercase tracking-wider text-green-400/80 font-semibold shrink-0">
                            Nota
                          </label>
                          <span className="px-2 py-1 rounded-lg bg-slate-800 border border-green-500/40 text-green-300 text-sm font-mono text-center min-w-20">
                            {materia.nota ?? '—'}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="w-full flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[10px] uppercase tracking-wider text-green-400/80 font-semibold shrink-0">
                            Nota
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            step="0.5"
                            placeholder="1-10"
                            value={materia.nota ?? ''}
                            onChange={(e) => guardarNota(materia.id, e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg bg-slate-800 border border-green-500/40 text-green-300 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 placeholder:text-slate-600"
                          />
                        </div>
                      )
                    )}

                    {!puedeCursar && (
                      <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                        🔒 Regularizá las correlativas para cursar
                      </p>
                    )}
                    {puedeCursar && !puedeRendir && materia.estado === 'regular' && (
                      <p className="mt-3 text-xs text-orange-400 flex items-center gap-1">
                        🔒 Aprobá las correlativas para rendir
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de información: correlativas de la materia */}
      {materiaInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMateriaInfo(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_40px_rgba(99,102,241,0.25)] p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-xl font-bold text-slate-100 break-words">
                {materiaInfo.nombre}
              </h2>
              <button
                onClick={() => setMateriaInfo(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 transition-all duration-300 cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">
              Correlativas requeridas
            </p>

            {/* Sección: Para Cursar (se renderiza independientemente si hay datos) */}
            {materiaInfo.correlativas?.paraCursar?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Para Cursar
                </h3>
                <ul className="space-y-2">
                  {materiaInfo.correlativas.paraCursar.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      <span className="text-blue-400 shrink-0">▸</span>
                      <span className="break-words">{req.nombre}</span>
                      {req.condicion === 'aprobada' && (
                        <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-blue-400/80 border border-blue-500/30 rounded-full px-2 py-0.5">
                          aprobada
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sección: Para Rendir (se renderiza independientemente si hay datos) */}
            {materiaInfo.correlativas?.paraRendir?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  Para Rendir
                </h3>
                <ul className="space-y-2">
                  {materiaInfo.correlativas.paraRendir.map((req) => (
                    <li
                      key={req.id}
                      className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      <span className="text-green-400 shrink-0">▸</span>
                      <span className="break-words">{req.nombre}</span>
                      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-green-400/80 border border-green-500/30 rounded-full px-2 py-0.5">
                        aprobada
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Solo muestra "no requiere correlativas" cuando la materia NO tiene
                correlativas en el esquema nuevo (paraCursar/paraRendir). */}
            {!materiaInfo.correlativas?.paraCursar?.length &&
              !materiaInfo.correlativas?.paraRendir?.length && (
              <p className="text-center text-slate-500 text-sm py-4">
                Esta materia no requiere correlativas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
