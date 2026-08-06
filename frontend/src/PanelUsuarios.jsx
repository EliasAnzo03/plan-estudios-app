import { useState, useEffect } from 'react'

// Panel de Control de Usuarios (Backoffice).
// Muestra una tabla con todos los usuarios APROBADOS del sistema y permite
// al administrador eliminarlos.
export default function PanelUsuarios({ token, onCerrarSesion }) {
  const API_URL = import.meta.env.VITE_BACKEND_URL || ''

  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [eliminandoId, setEliminandoId] = useState(null)

  // Carga todos los usuarios aprobados.
  const cargarUsuarios = async () => {
    setCargando(true)
    setError('')
    setMensaje('')
    try {
      const respuesta = await fetch(`${API_URL}/api/admin/usuarios`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (respuesta.status === 401) {
        onCerrarSesion?.()
        return
      }
      if (!respuesta.ok) {
        const datos = await respuesta.json()
        setError(datos.error || 'No se pudieron cargar los usuarios')
        return
      }
      const datos = await respuesta.json()
      setUsuarios(datos.usuarios)
    } catch {
      setError('Error de red al cargar los usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Confirma y elimina a un usuario. Usa confirm() nativo como se pide.
  const eliminarUsuario = async (usuario) => {
    const confirmado = window.confirm(
      `¿Estás seguro de que querés eliminar a este usuario?\n\n${usuario.username}`
    )
    if (!confirmado) return

    setEliminandoId(usuario.id)
    setError('')
    setMensaje('')
    try {
      const respuesta = await fetch(`${API_URL}/api/admin/usuarios/${usuario.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      })
      if (respuesta.status === 401) {
        onCerrarSesion?.()
        return
      }
      if (!respuesta.ok) {
        const datos = await respuesta.json()
        setError(datos.error || 'No se pudo eliminar el usuario')
        return
      }
      // Actualizamos el estado local para quitar al usuario sin recargar.
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id))
      setMensaje(`Usuario '${usuario.username}' eliminado correctamente`)
    } catch {
      setError('Error de red al eliminar el usuario')
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto mb-8">
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-[0_0_25px_rgba(99,102,241,0.1)] p-6">
        {/* Encabezado del panel */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-indigo-400 font-bold uppercase tracking-widest">
            Panel de Control de Usuarios
          </h2>
          <button
            onClick={cargarUsuarios}
            disabled={cargando}
            className="text-xs text-slate-500 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/50 rounded-lg px-3 py-1.5 font-semibold uppercase tracking-wider transition-all duration-300 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {/* Mensajes de éxito / error */}
        {mensaje && (
          <p className="text-green-400 text-sm font-medium text-center bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mb-4">
            ✓ {mensaje}
          </p>
        )}
        {error && (
          <p className="text-red-500 text-sm font-medium text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Contenido */}
        {cargando ? (
          <p className="text-center text-slate-500 text-sm py-8">
            Cargando usuarios...
          </p>
        ) : usuarios.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">
            No hay usuarios aprobados en el sistema.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                  <th className="py-2 pr-4">ID</th>
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Carrera</th>
                  <th className="py-2 pr-4">Progreso</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-800/50 text-slate-300"
                  >
                    <td className="py-3 pr-4 font-mono text-slate-500">
                      {u.id}
                    </td>
                    <td className="py-3 pr-4 font-semibold">{u.username}</td>
                    <td className="py-3 pr-4 uppercase text-xs">{u.rol}</td>
                    <td className="py-3 pr-4">
                      {u.carrera_nombre ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-2.5 py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/70 inline-block"></span>
                          {u.carrera_nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">S/Carrera</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <span className="text-green-400 font-semibold">
                        {u.materias_aprobadas}
                      </span>
                      <span className="text-slate-500"> / {u.materias_totales} aprobadas</span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => eliminarUsuario(u)}
                        disabled={eliminandoId === u.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/50 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="text-sm leading-none">🗑️</span>
                        {eliminandoId === u.id ? 'Eliminando...' : 'Eliminar'}
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
  )
}
