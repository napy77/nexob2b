import { defineRouteConfig } from "@medusajs/admin-sdk"
import MayoristasPage from "../../components/MayoristasPage"

export const config = defineRouteConfig({
  label: "Mayoristas",
})

export default MayoristasPage
