import { Migration } from "@mikro-orm/migrations"

// Indices faltantes para producto_maestro (65.531 filas). Ya existian: pkey(id),
// unique(ean) parcial, index(estado), index(pasillo_id). Estos cubren los filtros que
// usan las rutas de catalogo (store/productos, store/mayoristas/me/catalogo[/buscar],
// v1/pos/productos, admin/productos) que hoy no tenian soporte de indice:
//   - rubro_id / subrubro_id: filtros de categoria en las 4 rutas de catalogo
//   - creado_por_mayorista_id: usado por futuras consultas "mis productos creados"
//   - GIN trigram en nombre/ean/marca: todas las busquedas usan ILIKE '%term%', que un
//     btree normal no puede acelerar (requiere pg_trgm)
export class Migration20260707000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)

    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_rubro_idx" ON "producto_maestro" ("rubro_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_subrubro_idx" ON "producto_maestro" ("subrubro_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_creado_por_mayorista_idx" ON "producto_maestro" ("creado_por_mayorista_id");`)

    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_nombre_trgm_idx" ON "producto_maestro" USING GIN ("nombre" gin_trgm_ops);`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_ean_trgm_idx" ON "producto_maestro" USING GIN ("ean" gin_trgm_ops);`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "producto_maestro_marca_trgm_idx" ON "producto_maestro" USING GIN ("marca" gin_trgm_ops);`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_marca_trgm_idx";`)
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_ean_trgm_idx";`)
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_nombre_trgm_idx";`)
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_creado_por_mayorista_idx";`)
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_subrubro_idx";`)
    this.addSql(`DROP INDEX IF EXISTS "producto_maestro_rubro_idx";`)
  }
}
