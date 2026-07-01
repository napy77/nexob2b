"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "https://nexob2b.app"
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

function MPCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const code      = searchParams.get("code")
    const state     = searchParams.get("state")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setStatus("error")
      setMsg("El usuario canceló la conexión con Mercado Pago.")
      return
    }

    if (!code) {
      setStatus("error")
      setMsg("No se recibió el código de autorización de Mercado Pago.")
      return
    }

    // Verificar CSRF state
    const savedState = sessionStorage.getItem("mp_oauth_state")
    if (state && savedState && state !== savedState) {
      setStatus("error")
      setMsg("Error de seguridad: el estado OAuth no coincide.")
      return
    }
    sessionStorage.removeItem("mp_oauth_state")

    const token = localStorage.getItem("mayorista_token")
    if (!token) {
      router.replace("/mayorista/login")
      return
    }

    fetch(`${BACKEND_URL}/store/mayoristas/me/mp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-publishable-api-key": PUB_KEY,
      },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Error al conectar")
        setStatus("success")
        setMsg(`¡Conectado como ${data.mp_nickname}!`)
        setTimeout(() => router.replace("/mayorista/medios-pago?mp=conectado"), 1800)
      })
      .catch((e: any) => {
        setStatus("error")
        setMsg(e.message)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center max-w-sm w-full">
        {status === "loading" && (
          <>
            <div className="text-5xl mb-4 animate-pulse">🔗</div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">Conectando con Mercado Pago</h2>
            <p className="text-sm text-gray-500">Un momento...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">¡Cuenta vinculada!</h2>
            <p className="text-sm text-gray-500">{msg}</p>
            <p className="text-xs text-gray-400 mt-2">Redirigiendo...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">Error al conectar</h2>
            <p className="text-sm text-red-600 mb-5">{msg}</p>
            <button
              onClick={() => router.replace("/mayorista/medios-pago")}
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              Volver a Medios de Pago
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MPCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-5xl animate-pulse">🔗</div>
      </div>
    }>
      <MPCallbackInner />
    </Suspense>
  )
}
