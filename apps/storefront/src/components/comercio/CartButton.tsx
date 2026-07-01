"use client"

import { useCart } from "../../lib/comercio/cart"

export default function CartButton() {
  const { totalItems, mayoristas, setOpen, setOpenMayoristaId } = useCart()

  if (totalItems === 0) return null

  const handleClick = () => {
    // Si hay un solo mayorista, abrir ese carrito directamente
    if (mayoristas.length === 1) {
      setOpenMayoristaId(mayoristas[0].id)
    }
    setOpen(true)
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-30 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 px-4 py-3 font-semibold text-sm"
    >
      🛒
      <span>{totalItems} ítem{totalItems !== 1 ? "s" : ""}</span>
      {mayoristas.length > 1 && (
        <span className="bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
          {mayoristas.length}
        </span>
      )}
    </button>
  )
}
