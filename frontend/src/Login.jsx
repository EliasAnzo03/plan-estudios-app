import { useState, useEffect } from 'react'

function Login({ onLogin }) {
  const API_URL = import.meta.env.VITE_BACKEND_URL || ''

  const [modo, setModo] = useState('login') // 'login' o 'registro'
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [carreras, setCarreras] = useState([])
  const [carreraId, setCarreraId] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  // Cargar las carreras disponibles al montar el componente, para poder
  // armar el menú desplegable "Carrera / Plan" del formulario de registro.
  useEffect(() => {
    const cargarCarreras = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/api/carreras`)
        const datos = await respuesta.json()
        if (respuesta.ok) {
          setCarreras(Array.isArray(datos) ? datos : [])
        } else {
          setError(datos.error || 'No se pudieron cargar las carreras')
        }
      } catch {
        setError('Error de red al cargar las carreras')
      }
    }

    cargarCarreras()
  }, [API_URL])

  const manejarSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMensaje('')
    setCargando(true)

    const esLogin = modo === 'login'
    const endpoint = esLogin ? '/api/login' : '/api/register'

    try {
      const payload = { username: usuario, password }
      // En el registro incluimos la carrera elegida en el menú desplegable.
      if (!esLogin) {
        payload.carrera_id = carreraId ? Number(carreraId) : null
      }

      const respuesta = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        setError(datos.error || 'Error al procesar la solicitud')
        setCargando(false)
        return
      }

      // Registro exitoso: mostramos el mensaje y no iniciamos sesión.
      if (!esLogin) {
        setMensaje(
          datos.message ||
            '¡Cuenta creada! Esperá a que el administrador la apruebe'
        )
        setPassword('')
        setCargando(false)
        return
      }

      // Login exitoso: guardamos token y usuario en localStorage
      localStorage.setItem('token', datos.token)
      localStorage.setItem('usuario', JSON.stringify(datos.usuario))

      // Actualizamos el estado del componente padre
      onLogin(datos.token, datos.usuario)
    } catch {
      setError('Error de red. Intentalo de nuevo.')
      setCargando(false)
    }
  }

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo)
    setError('')
    setMensaje('')
    setPassword('')
    setCarreraId('')
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

        {/* Toggle: Iniciar Sesión / Registrarse */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => cambiarModo('login')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
              modo === 'login'
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => cambiarModo('registro')}
            className={`flex-1 py-2 rounded-md text-sm font-semibold uppercase tracking-wider transition-all duration-300 ${
              modo === 'registro'
                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registrarse
          </button>
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
              autoComplete={
                modo === 'login' ? 'current-password' : 'new-password'
              }
              required
              minLength={modo === 'registro' ? 6 : undefined}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-600 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            />
          </div>

          {/* Campo: Carrera / Plan (solo en registro) */}
          {modo === 'registro' && (
            <div>
              <label
                htmlFor="carrera"
                className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2"
              >
                Carrera / Plan
              </label>
              <select
                id="carrera"
                value={carreraId}
                onChange={(e) => setCarreraId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 outline-none transition-all duration-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
              >
                <option value="" disabled>
                  Seleccioná tu carrera...
                </option>
                {carreras.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.nombre} - Plan {carrera.plan}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mensaje de éxito (solo tras registrarse) */}
          {mensaje && (
            <p className="text-green-500 text-sm font-medium text-center bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
              {mensaje}
            </p>
          )}

          {/* Mensaje de error */}
          {error && (
            <p className="text-red-500 text-sm font-medium text-center bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Botón: Ingresar / Registrarse */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest rounded-lg px-4 py-3 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-[0.98]"
          >
            {cargando
              ? modo === 'login'
                ? 'Ingresando...'
                : 'Creando cuenta...'
              : modo === 'login'
              ? 'Ingresar'
              : 'Registrarme'}
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6 font-mono">
          {modo === 'registro'
            ? 'Tu cuenta quedará pendiente de aprobación por el administrador'
            : 'Sesión protegida · Token de acceso'}
        </p>
      </div>
    </div>
  )
}

export default Login
