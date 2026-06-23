"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

export type CartItem = {
  producto_id: string
  nombre: string
  precio_unitario: number   // neto
  alicuota_iva: number
  cantidad: number
  unidad: string
  imagen_url?: string
  mayorista_id: string
  mayorista_nombre: string
}

type CartContextType = {
  items: CartItem[]
  mayorista_id: string | null   // todos los items son del mismo mayorista
  mayorista_nombre: string
  addItem: (item: CartItem) => void
  removeItem: (producto_id: string) => void
  updateCantidad: (producto_id: string, cantidad: number) => void
  clearCart: () => void
  totalItems: number
  totalNeto: number
  totalIva: number
  total: number
  open: boolean
  setOpen: (v: boolean) => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)

  // Persistir en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexo_cart")
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("nexo_cart", JSON.stringify(items))
    } catch {}
  }, [items])

  const mayorista_id = items[0]?.mayorista_id ?? null
  const mayorista_nombre = items[0]?.mayorista_nombre ?? ""

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      // Si hay items de otro mayorista, reemplazar el carrito
      if (prev.length > 0 && prev[0].mayorista_id !== newItem.mayorista_id) {
        return [{ ...newItem, cantidad: Math.max(1, newItem.cantidad) }]
      }
      const existing = prev.find((i) => i.producto_id === newItem.producto_id)
      if (existing) {
        return prev.map((i) =>
          i.producto_id === newItem.producto_id
            ? { ...i, cantidad: i.cantidad + newItem.cantidad }
            : i
        )
      }
      return [...prev, { ...newItem, cantidad: Math.max(1, newItem.cantidad) }]
    })
    setOpen(true)
  }, [])

  const removeItem = useCallback((producto_id: string) => {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id))
  }, [])

  const updateCantidad = useCallback((producto_id: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.producto_id !== producto_id))
    } else {
      setItems((prev) => prev.map((i) => i.producto_id === producto_id ? { ...i, cantidad } : i))
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalItems = items.reduce((s, i) => s + i.cantidad, 0)
  const totalNeto = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const totalIva = items.reduce((s, i) => s + i.precio_unitario * i.cantidad * i.alicuota_iva / 100, 0)
  const total = totalNeto + totalIva

  return (
    <CartContext.Provider value={{
      items, mayorista_id, mayorista_nombre,
      addItem, removeItem, updateCantidad, clearCart,
      totalItems, totalNeto, totalIva, total,
      open, setOpen,
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
