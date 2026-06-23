import { CartProvider } from "../../../lib/comercio/cart"
import CartButton from "../../../components/comercio/CartButton"
import CartDrawer from "../../../components/comercio/CartDrawer"

export default function ComercioLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartButton />
      <CartDrawer />
    </CartProvider>
  )
}
