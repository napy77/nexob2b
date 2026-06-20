"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { comerciosApi } from "../../../../lib/comercio/api"

export default function ComercioLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const data = await comerciosApi.login(email, password)
      localStorage.setItem("comercio_token", data.token)
      localStorage.setItem("comercio", JSON.stringify(data.comercio))
      router.push("/comercio/dashboard")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nexo B2B</h1>
          <p className="text-gray-500 mt-2 text-sm">Portal de Comercios</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciá sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            ¿No tenés cuenta?{" "}
            <button onClick={() => router.push("/comercio/registro")}
              className="text-blue-600 hover:underline font-medium">
              Registrá tu comercio
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Sos mayorista?{" "}
          <a href="/mayorista/login" className="text-blue-500 hover:underline">Ingresá por acá</a>
        </p>
      </div>
    </div>
  )
}
