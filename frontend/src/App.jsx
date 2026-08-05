import { useState, useEffect } from 'react'

const ESTILOS_ESTADO = {
  aprobada: {
    borde: 'border-green-500',
    badge: 'bg-green-100 text-green-800',
    etiqueta: 'Aprobada',
  },
  regular: {
    borde: 'border-yellow-500',
    badge: 'bg-yellow-100 text-yellow-800',
    etiqueta: 'Regular',
  },
  en_curso: {
    borde: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    etiqueta: 'En curso',
  },
  pendiente: {
    borde: 'border-gray-500',
    badge: 'bg-gray-100 text-gray-800',
    etiqueta: 'Pendiente',
  },
}

function App() {
  const [materias, setMaterias] = useState([])
  const [tituloIntermedio, setTituloIntermedio] = useState(false)
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  // Estados del formulario de creación
  const [nombreForm, setNombreForm] = useState('')
  const [anioForm, setAnioForm] = useState('')
  const [cuatrimestreForm, setCuatrimestreForm] = useState('1')
  const [creditosForm, setCreditosForm] = useState('0')
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar materias
        const respMaterias = await fetch('/api/materias')
        const datos = await respMaterias.json()
        setMaterias(datos)

        // Chequear si se obtuvo el título intermedio
        const respTitulo = await fetch('/api/estadisticas/titulo-intermedio')
        const titulo = await respTitulo.json()
        setTituloIntermedio(titulo.obtenido)
      } catch (error) {
        console.error('Error al cargar datos:', error)
      }
    }

    cargarDatos()
  }, [])

  // Crea una nueva materia y refresca la grilla
  const crearMateria = async (e) => {
    e.preventDefault()
    setMensajeError('')

    const nuevaMateria = {
      nombre: nombreForm,
      anio: parseInt(anioForm),
      cuatrimestre: parseInt(cuatrimestreForm),
      creditos: parseInt(creditosForm),
    }

    try {
      const respuesta = await fetch('/api/materias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaMateria),
      })

      if (respuesta.ok) {
        // Limpia el formulario y recarga la lista desde el backend
        setNombreForm('')
        setAnioForm('')
        setCreditosForm('0')
        const respMaterias = await fetch('/api/materias')
        setMaterias(await respMaterias.json())
      } else {
        const error = await respuesta.json()
        setMensajeError(error.error || 'Error al crear la materia')
      }
    } catch (error) {
      console.error('Error de red:', error)
      setMensajeError('Ocurrió un error de red')
    }
  }

  // Abre el modal con la materia seleccionada
  const abrirModal = (materia) => {
    setMateriaSeleccionada(materia)
    setModalAbierto(true)
  }

  // Cierra el modal sin guardar
  const cerrarModal = () => {
    setModalAbierto(false)
    setMateriaSeleccionada(null)
  }

  // Persiste el nuevo estado en el backend y actualiza el estado local
  const guardarEstado = async () => {
    if (!materiaSeleccionada) return

    const nuevoEstado = document.getElementById('select-estado').value

    try {
      const respuesta = await fetch(`/api/materias/${materiaSeleccionada.id}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (respuesta.ok) {
        // Actualiza el estado local sin recargar la página
        setMaterias((prev) =>
          prev.map((m) =>
            m.id === materiaSeleccionada.id ? { ...m, estado: nuevoEstado } : m
          )
        )
        cerrarModal()
      } else {
        console.error('Error al guardar el estado')
      }
    } catch (error) {
      console.error('Error de red:', error)
    }
  }

  // Elimina la materia seleccionada tras confirmar con el usuario
  const eliminarMateria = async () => {
    if (!materiaSeleccionada) return

    const confirmar = window.confirm('¿Estás seguro de eliminar esta materia?')
    if (!confirmar) return

    try {
      const respuesta = await fetch(`/api/materias/${materiaSeleccionada.id}`, {
        method: 'DELETE',
      })

      if (respuesta.ok) {
        // Remueve la materia eliminada del estado local
        setMaterias((prev) =>
          prev.filter((m) => m.id !== materiaSeleccionada.id)
        )
        cerrarModal()
      } else {
        console.error('Error al eliminar la materia')
      }
    } catch (error) {
      console.error('Error de red:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
        Mi Plan de Estudios
      </h1>

      {tituloIntermedio && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-400 text-gray-900 font-bold text-lg text-center p-6 rounded-2xl shadow-lg border border-yellow-500">
            🎓 ¡Analista Desarrollador Universitario de Sistemas Informáticos!
          </div>
        </div>
      )}

      {/* Formulario para crear una materia */}
      <div className="max-w-6xl mx-auto mb-8 bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Agregar nueva materia
        </h2>

        <form onSubmit={crearMateria} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nombre</label>
            <input
              type="text"
              value={nombreForm}
              onChange={(e) => setNombreForm(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Año</label>
            <input
              type="number"
              value={anioForm}
              onChange={(e) => setAnioForm(e.target.value)}
              required
              min="1"
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Cuatrimestre</label>
            <select
              value={cuatrimestreForm}
              onChange={(e) => setCuatrimestreForm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1">1er Cuatrimestre</option>
              <option value="2">2do Cuatrimestre</option>
              <option value="0">Anual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Créditos</label>
            <input
              type="number"
              value={creditosForm}
              onChange={(e) => setCreditosForm(e.target.value)}
              min="0"
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Agregar
            </button>
          </div>
        </form>

        {mensajeError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {mensajeError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {materias.map((materia) => {
          const estilo = ESTILOS_ESTADO[materia.estado] || ESTILOS_ESTADO.pendiente
          const periodo =
            materia.cuatrimestre === 0
              ? `Año ${materia.anio} - Anual`
              : `Año ${materia.anio} - Cuatrimestre ${materia.cuatrimestre}`

          // True si todas las correlativas (IDs en correlativas_ids) están aprobadas.
          // Si el array está vacío, no hay correlativas y se considera aprobado.
          const correlativasAprobadas =
            (materia.correlativas_ids || []).every((id) => {
              const req = materias.find((m) => m.id === id)
              return req && req.estado === 'aprobada'
            })

          const tarjetaClases = correlativasAprobadas
            ? `bg-white rounded-xl shadow-lg border-l-4 ${estilo.borde} p-5 transition hover:shadow-xl hover:scale-105 cursor-pointer`
            : `bg-white rounded-xl shadow-lg border-l-4 ${estilo.borde} p-5 opacity-60`

          return (
            <div
              key={materia.id}
              onClick={correlativasAprobadas ? () => abrirModal(materia) : undefined}
              className={tarjetaClases}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-lg text-gray-900">
                  {materia.nombre}
                </h3>
                <span
                  className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${estilo.badge}`}
                >
                  {estilo.etiqueta}
                </span>
                
              </div>
              <p className="mt-3 text-sm text-gray-600">{periodo}</p>
              {!correlativasAprobadas && (
                <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                  🔒 Correlativas pendientes
                </p>
              )}
            </div>
          )
        })}
      </div>

      {modalAbierto && materiaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Editar estado: {materiaSeleccionada.nombre}
            </h2>

            <label className="block text-sm text-gray-400 mb-2">
              Estado
            </label>
            <select
              id="select-estado"
              defaultValue={materiaSeleccionada.estado}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En curso</option>
              <option value="regular">Regular</option>
              <option value="aprobada">Aprobada</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={eliminarMateria}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Eliminar
              </button>
              <button
                onClick={cerrarModal}
                className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEstado}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
