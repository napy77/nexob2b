import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  admin: {
    backendUrl: "https://nexob2b.app",
    vite: (config) => {
      config.server = {
        ...config.server,
        allowedHosts: ['nexob2b.app', 'www.nexob2b.app'],
      }
      return config
    }
  },
  modules: [
    {
      resolve: "./src/modules/mayorista",
    },
    {
      resolve: "./src/modules/producto",
    },
    {
      resolve: "./src/modules/comercio",
    },
    {
      resolve: "./src/modules/solicitud",
    },
    {
      resolve: "./src/modules/taxonomia",
    },
    {
      resolve: "./src/modules/orden",
    },
    {
      resolve: "./src/modules/ruta",
    },
    {
      resolve: "./src/modules/medio_pago",
    },
  ]
})
