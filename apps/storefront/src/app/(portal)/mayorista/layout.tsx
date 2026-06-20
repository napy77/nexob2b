import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Portal Mayorista — Nexo B2B",
  description: "Gestioná tu cuenta de mayorista en Nexo B2B",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
