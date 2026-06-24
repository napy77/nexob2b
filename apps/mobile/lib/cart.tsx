import React, { createContext, useContext, useState, useCallback } from "react"

export type CartItem = {
  producto_id: string
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

type CartContextType = {
  items: CartItem[]
  mayorista_id: string | null
  mayorista_nombre: string
  addItem: (item: CartItem) => void
  removeItem: (producto_id: string) => void
  updateCantidad: (producto_id: string, cantidad: number) => void
  clearCart: () => void
  totalItems: number
  totalNeto: number
  totalIva: number
  total: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const mayorista_id = items[0]?.mayorista_id ?? null
  const mayorista_nombre = items[0]?.mayorista_nombre ?? ""

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Si es otro mayorista, limpiar carrito
      if (prev.length > 0 && prev[0].mayorista_id !== item.mayorista_id) {
        return [item]
      }
      const existing = prev.find((i) => i.producto_id === item.producto_id)
      if (existing) {
        return prev.map((i) =>
          i.producto_id === item.producto_id
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        )
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((producto_id: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id))
  }, [])

  const updateCantidad = useCallback((producto_id: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.producto_id !== producto_id))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.producto_id === producto_id ? { ...i, cantidad } : i))
      )
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0)
  const totalNeto = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const totalIva = items.reduce(
    (s, i) => s + i.precio_unitario * i.cantidad * (i.alicuota_iva / 100),
    0
  )
  const total = totalNeto + totalIva

  return (
    <CartContext.Provider
      value={{
        items,
        mayorista_id,
        mayorista_nombre,
        addItem,
        removeItem,
        updateCantidad,
        clearCart,
        totalItems,
        totalNeto,
        totalIva,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
