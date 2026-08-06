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
  const [materias, setMaterias] = useState([])
  const [tituloIntermedio, setTituloIntermedio] = useState(false)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario'))
    } catch {
      return null
    }
  })

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
  }

  // Maneja la sesión tras un login exitoso (se lo pasamos a <Login/>)
  const manejarLogin = (nuevoToken, nuevoUsuario) => {
    setToken(nuevoToken)
    setUsuario(nuevoUsuario)
  }

  // Chequea el error de la respuesta; si es 401, desloguea automáticamente.
  const verificarNoAutorizado = (respuesta) => {
    if (respuesta.status === 401) {
      desloguear()
    }
    return respuesta
  }

  // Cambia el estado de forma cíclica al hacer clic en una tarjeta
  const ciclarEstadoMateria = async (materia) => {
    const indiceActual = ORDEN_CICLO.indexOf(materia.estado)
    const nuevoEstado = ORDEN_CICLO[(indiceActual + 1) % ORDEN_CICLO.length]

    try {
      const respuesta = await verificarNoAutorizado(
        await fetch(`/api/materias/${materia.id}/estado`, {
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

  useEffect(() => {
    if (!token) return

    const cargarDatos = async () => {
      try {
        // Cargar materias
        const respMaterias = await verificarNoAutorizado(
          await fetch('/api/materias', {
            headers: { Authorization: 'Bearer ' + token },
          })
        )
        if (!respMaterias.ok) return
        const datos = await respMaterias.json()
        setMaterias(datos)

        // Chequear si se obtuvo el título intermedio
        const respTitulo = await verificarNoAutorizado(
          await fetch('/api/estadisticas/titulo-intermedio', {
            headers: { Authorization: 'Bearer ' + token },
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
  }, [token])

  // Si NO hay token, mostramos la pantalla de Login
  if (!token) {
    return <Login onLogin={manejarLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-300">
      {/* Barra de sesión y Header informativo */}
      <div className="max-w-6xl mx-auto flex justify-end mb-4">
        <div className="flex items-center gap-3">
          {usuario && (
            <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">
              {usuario.username} · {usuario.rol}
            </span>
          )}
          <button
            onClick={desloguear}
            className="text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/50 rounded-lg px-3 py-1.5 font-semibold uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Header informativo */}
      <div className="flex flex-col items-center mb-10 gap-2">
        <h1 className="text-indigo-500 text-2xl font-bold tracking-[0.3em] drop-shadow-md uppercase">
          Ingeniería Informática
        </h1>
        <p className="text-slate-500 text-sm tracking-widest uppercase">
          Malla Curricular - Correlativas
        </p>
        <p className="text-slate-600 text-xs font-mono mt-2 text-center">
          Click 1x -&gt; En Curso · Click 2x -&gt; Regular · Click 3x -&gt; Aprobada · Click 4x -&gt; Reiniciar
        </p>

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

      {tituloIntermedio && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-500/20 text-yellow-300 font-bold text-lg text-center p-6 rounded-2xl border border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]">
            🎓 ¡Analista Desarrollador Universitario de Sistemas Informáticos!
          </div>
        </div>
      )}

      {/* Timeline de la malla curricular agrupado por Año y Cuatrimestre */}
      <div className="max-w-6xl mx-auto space-y-6">
        {agruparMaterias().map((grupo) => (
          <div
            key={`${grupo.anio}-${grupo.cuatrimestre}`}
            className="grid grid-cols-[120px_1fr] gap-6"
          >
            {/* Eje de tiempo */}
            <div className="text-slate-500 text-xs font-mono uppercase text-right border-r border-slate-800 pr-4 pt-1">
              {formatearEje(grupo)}
            </div>

            {/* Tarjetas de materias del grupo */}
            <div className="flex flex-wrap gap-4">
              {grupo.materias.map((materia) => {
                const estilo =
                  ESTILOS_ESTADO[materia.estado] || ESTILOS_ESTADO.pendiente

                // True si todas las correlativas están aprobadas. Array vacío = sin correlativas = aprobado.
                const correlativasAprobadas =
                  (materia.correlativas_ids || []).every((id) => {
                    const req = materias.find((m) => m.id === id)
                    return req && req.estado === 'aprobada'
                  })

                const tarjetaClases = correlativasAprobadas
                  ? `bg-slate-900 rounded-xl border ${estilo.borde} p-5 w-64 transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer`
                  : `bg-slate-950/50 rounded-xl border border-slate-800 text-slate-500 p-5 w-64 opacity-60`

                return (
                  <div
                    key={materia.id}
                    onClick={
                      correlativasAprobadas
                        ? () => ciclarEstadoMateria(materia)
                        : undefined
                    }
                    className={tarjetaClases}
                  >
                    <div className="flex flex-col items-start gap-3">
                      <span
                        className={`text-xs font-bold tracking-widest uppercase px-2 py-1 rounded-full ${estilo.badge}`}
                      >
                        {estilo.etiqueta}
                      </span>
                      <h3 className="font-semibold text-lg text-slate-100 break-words">
                        {materia.nombre}
                      </h3>
                    </div>
                    {!correlativasAprobadas && (
                      <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                        🔒 Correlativas pendientes
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
