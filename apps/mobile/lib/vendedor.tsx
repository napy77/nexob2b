import React, { createContext, useContext, useState } from "react"

type ComercioCliente = {
  id: string
  nombre: string
}

type VendedorContextType = {
  comercioCliente: ComercioCliente | null
  setComercioCliente: (c: ComercioCliente | null) => void
}

const VendedorContext = createContext<VendedorContextType | null>(null)

export function VendedorProvider({ children }: { children: React.ReactNode }) {
  const [comercioCliente, setComercioCliente] = useState<ComercioCliente | null>(null)
  return (
    <VendedorContext.Provider value={{ comercioCliente, setComercioCliente }}>
      {children}
    </VendedorContext.Provider>
  )
}

export function useVendedor() {
  const ctx = useContext(VendedorContext)
  if (!ctx) throw new Error("useVendedor must be used within VendedorProvider")
  return ctx
}
