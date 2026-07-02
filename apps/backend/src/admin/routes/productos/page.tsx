import { defineRouteConfig } from "@medusajs/admin-sdk"
import ProductosPage from "../../components/ProductosPage"

export const config = defineRouteConfig({
  label: "Productos",
  icon: () => null,
})

export default ProductosPage
