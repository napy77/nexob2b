import { defineMiddlewares } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    // Nuestras rutas custom del store tienen su propio JWT,
    // no necesitan la validación de publishable API key de Medusa.
    {
      matcher: "/store/mayoristas*",
      middlewares: [],
    },
    {
      matcher: "/store/comercios*",
      middlewares: [],
    },
    {
      matcher: "/store/solicitudes*",
      middlewares: [],
    },
    {
      matcher: "/store/ordenes*",
      middlewares: [],
    },
    {
      matcher: "/store/vendedores*",
      middlewares: [],
    },
    {
      matcher: "/store/medios-pago*",
      middlewares: [],
    },
    {
      matcher: "/store/taxonomia*",
      middlewares: [],
    },
  ],
})
