import React, { createContext, useContext, useState, useCallback } from "react"

export type CartItem = {
  producto_id: string          // clave única (para nuevo catálogo = presentacion_id)
  presentacion_id?: string     // nuevo catálogo: producto_mayorista_presentacion.id
  nombre: string
  sku?: string | null
  ean?: string | null
  precio_unitario: number
  alicuota_iva: number
  cantidad: number
  unidad: string
  imagen_url?: string
  mayorista_id: string
  mayorista_nombre: string
}

type Carts = Record<string, CartItem[]>

type CartContextType = {
  carts: Carts
  mayoristas: { id: string; nombre: string }[]
  activeMayoristaId: string | null
  setActiveMayoristaId: (id: string | null) => void
  activeItems: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (producto_id: string, mayorista_id: string) => void
  updateCantidad: (producto_id: string, cantidad: number, mayorista_id: string) => void
  clearCart: (mayorista_id: string) => void
  totalItems: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Carts>({})
  const [activeMayoristaId, setActiveMayoristaId] = useState<string | null>(null)

  const mayoristas = Object.values(carts)
    .filter((items) => items.length > 0)
    .map((items) => ({ id: items[0].mayorista_id, nombre: items[0].mayorista_nombre }))
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)

  const activeItems = activeMayoristaId ? (carts[activeMayoristaId] || []) : []

  const addItem = useCallback((newItem: CartItem) => {
    setCarts((prev) => {
      const cart = prev[newItem.mayorista_id] || []
      const existing = cart.find((i) => i.producto_id === newItem.producto_id)
      const updated = existing
        ? cart.map((i) =>
            i.producto_id === newItem.producto_id
              ? { ...i, cantidad: i.cantidad + newItem.cantidad }
              : i
          )
        : [...cart, { ...newItem, cantidad: Math.max(1, newItem.cantidad) }]
      return { ...prev, [newItem.mayorista_id]: updated }
    })
    setActiveMayoristaId(newItem.mayorista_id)
  }, [])

  const removeItem = useCallback((producto_id: string, mayorista_id: string) => {
    setCarts((prev) => {
      const cart = (prev[mayorista_id] || []).filter((i) => i.producto_id !== producto_id)
      if (cart.length === 0) {
        const { [mayorista_id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [mayorista_id]: cart }
    })
  }, [])

  const updateCantidad = useCallback((producto_id: string, cantidad: number, mayorista_id: string) => {
    if (cantidad <= 0) {
      removeItem(producto_id, mayorista_id)
    } else {
      setCarts((prev) => ({
        ...prev,
        [mayorista_id]: (prev[mayorista_id] || []).map((i) =>
          i.producto_id === producto_id ? { ...i, cantidad } : i
        ),
      }))
    }
  }, [removeItem])

  const clearCart = useCallback((mayorista_id: string) => {
    setCarts((prev) => {
      const { [mayorista_id]: _, ...rest } = prev
      return rest
    })
    setActiveMayoristaId((cur) => cur === mayorista_id ? null : cur)
  }, [])

  const totalItems = Object.values(carts).flat().reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider value={{
      carts, mayoristas, activeMayoristaId, setActiveMayoristaId,
      activeItems, addItem, removeItem, updateCantidad, clearCart,
      totalItems,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
