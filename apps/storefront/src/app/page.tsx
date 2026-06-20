import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <span className="text-2xl font-bold text-gray-900">Nexo B2B</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            El marketplace B2B de tu barrio
          </h1>
          <p className="text-lg text-gray-500">
            Conectamos mayoristas y comercios de tu zona. Simple, directo y sin intermediarios.
          </p>
        </div>

        {/* Banners */}
        <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Comercios */}
          <Link href="/comercio/login" className="group block bg-blue-600 rounded-3xl p-8 text-white hover:bg-blue-700 transition-colors">
            <div className="text-4xl mb-4">🏪</div>
            <h2 className="text-2xl font-bold mb-2">Soy comercio</h2>
            <p className="text-blue-100 text-sm mb-6 leading-relaxed">
              Accedé al catálogo de mayoristas de tu zona y pedí directo, sin viajantes ni llamadas.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              Ingresar al portal
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>

          {/* Mayoristas */}
          <Link href="/mayorista/login" className="group block bg-gray-900 rounded-3xl p-8 text-white hover:bg-gray-800 transition-colors">
            <div className="text-4xl mb-4">🏭</div>
            <h2 className="text-2xl font-bold mb-2">Soy mayorista</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Publicá tu catálogo y llegá a más comercios en tu zona sin esfuerzo extra.
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              Ingresar al portal
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Registro */}
        <div className="max-w-3xl w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <p className="text-center text-sm text-gray-400">
            ¿No tenés cuenta?{" "}
            <Link href="/comercio/registro" className="text-blue-600 hover:underline font-medium">
              Registrá tu comercio
            </Link>
          </p>
          <p className="text-center text-sm text-gray-400">
            ¿No tenés cuenta?{" "}
            <Link href="/mayorista/registro" className="text-gray-700 hover:underline font-medium">
              Registrá tu empresa
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">© 2026 Nexo B2B · Powered by Linware</p>
      </footer>
    </div>
  )
}
