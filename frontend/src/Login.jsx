import { useState } from 'react'

function Login({ onLogin }) {
  const API_URL = import.meta.env.VITE_BACKEND_URL || ''

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const respuesta = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usuario,
          password,
        }),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        // El backend devuelve { error } para credenciales inválidas (401) o campos faltantes (400)
        setError(datos.error || 'Error al iniciar sesión')
        setCargando(false)
        return
      }

      // Guardamos token y usuario en localStorage
      localStorage.setItem('token', datos.token)
      localStorage.setItem('usuario', JSON.stringify(datos.usuario))

      // Actualizamos el estado del componente padre
      onLogin(datos.token, datos.usuario)
    } catch {
      setError('Error de red. Intentalo de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow decorativo de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Título del sistema */}
        <div className="text-center mb-8">
          <h1 className="text-indigo-500 text-2xl font-bold tracking-[0.3em] drop-shadow-md uppercase">
            Ingeniería Informática
          </h1>
          <p className="text-slate-500 text-sm tracking-widest uppercase mt-2">
            Malla Curricular - Acceso
          </p>
        </div>

        {/* Tarjeta del formulario */}
        <form
          onSubmit={manejarSubmit}
          className="bg-slate-900 rounded-xl border border-slate-800 shadow-[0_0_30px_rgba(99,102,241,0.15)] p-8 space-y-6"
        >
          {/* Campo: Usuario */}
          <div>
            <label
              htmlFor="usuario"
              className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2"
            >
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="tu_usuario"
              autoComplete="username"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            />
          </div>

          {/* Campo: Contraseña */}
          <div>
            <label
              htmlFor="password"
              className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="text-red-500 text-sm font-medium text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Botón: Ingresar */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest rounded-lg px-4 py-3 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98]"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6 font-mono">
          Sesión protegida · Token de acceso
        </p>
      </div>
    </div>
  )
}

export default Login
