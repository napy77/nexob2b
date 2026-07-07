import { Migration } from "@mikro-orm/migrations"

// Crea pasillo/rubro/subrubro si todavia no existen (el modulo taxonomia no tenia
// ninguna migracion generada hasta ahora), y agrega pasillo_id a rubro para poder
// modelar la jerarquia real Pasillo -> Rubro -> Subrubro.
//
// OJO: no se agregan constraints UNIQUE porque no sabemos si ya hay datos cargados
// a mano desde el admin (TaxonomiaPage) con nombres repetidos. La deduplicacion la
// hace el script de import (import.sql) via NOT EXISTS.
export class Migration20260706000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "pasillo" (
        "id" text NOT NULL,
        "nombre" text NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "pasillo_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "rubro" (
        "id" text NOT NULL,
        "nombre" text NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "rubro_pkey" PRIMARY KEY ("id")
      );
    `)
    // Nota: si la tabla ya existia (creada por el ORM sin migracion), el CREATE TABLE
    // IF NOT EXISTS no hace nada, por eso este ALTER es necesario igual.
    this.addSql(`ALTER TABLE "rubro" ADD COLUMN IF NOT EXISTS "pasillo_id" text NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "rubro_pasillo_idx" ON "rubro" ("pasillo_id");`)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "subrubro" (
        "id" text NOT NULL,
        "nombre" text NOT NULL,
        "rubro_id" text NOT NULL,
        "activo" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "subrubro_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "subrubro_rubro_idx" ON "subrubro" ("rubro_id");`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "rubro" DROP COLUMN IF EXISTS "pasillo_id";`)
  }
}
