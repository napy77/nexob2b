# Nexo B2B — Instrucciones para Claude

## PATHS — NUNCA INVENTAR, SIEMPRE USAR ESTOS

| Dónde | Path |
|-------|------|
| **Mac (German)** | `~/Claude/Projects/nexob2b/nexob2b` |
| **Servidor** | `/var/www/nexob2b/nexob2b` |

## WORKFLOW GIT (SIEMPRE este orden, NUNCA mezclado)

**1️⃣ MAC** — Claude edita archivos. German hace commit y push:
```bash
cd ~/Claude/Projects/nexob2b/nexob2b
git add <archivos>
git commit -m "mensaje"
git push
```

**2️⃣ SERVIDOR** — German hace pull y rebuild:
```bash
cd /var/www/nexob2b/nexob2b
git pull
# rebuild según lo que cambió
```

## BASE DE DATOS — SIEMPRE este formato

```bash
psql "postgres://nexob2b:nexob2b_secure_2026@localhost/nexob2b_db" -c "SQL;"
```

**NUNCA usar:** `psql -U nexob2b` (falla por peer authentication)

## JWT — SIEMPRE con fallback

```ts
process.env.JWT_SECRET || "nexob2b_jwt_secret_2026"
```

**NUNCA usar:** `process.env.JWT_SECRET!`

## MOBILE — EAS builds

- **SIEMPRE:** perfil `development` (`eas build:dev`)
- **NUNCA:** perfil `preview` o `production` durante desarrollo

## STACK

- Backend: Medusa.js v2 — `/var/www/nexob2b/nexob2b/apps/backend` — PM2: `nexob2b-backend` (puerto 9000)
- Web storefront: Next.js — `/var/www/nexob2b/nexob2b/apps/storefront` — PM2: `nexob2b-storefront` (puerto 8000)
- Mobile: Expo SDK 56 + Expo Router — `apps/mobile`
- DB: PostgreSQL + Redis
- Servidor: Ubuntu 24.04 en Nubilus (datacenter Linware)

## PM2

```bash
pm2 restart nexob2b-backend
pm2 restart nexob2b-storefront
pm2 logs nexob2b-backend --lines 50
```
