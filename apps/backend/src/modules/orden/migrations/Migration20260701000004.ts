import { Migration } from "@mikro-orm/migrations"

export class Migration20260701000004 extends Migration {
  async up(): Promise<void> {
    // Nuevas columnas de trazabilidad
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "is_pagada" boolean NOT NULL DEFAULT false;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "is_facturada" boolean NOT NULL DEFAULT false;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "cantidad_bultos" integer;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "peso_kg" numeric;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "dimensiones" text;`)
    this.addSql(`ALTER TABLE "orden" ADD COLUMN IF NOT EXISTS "numero_guia" text;`)
    // Renombrar estados existentes
    this.addSql(`UPDATE "orden" SET estado = 'cargada' WHERE estado = 'pendiente';`)
    this.addSql(`UPDATE "orden" SET estado = 'en_transporte' WHERE estado = 'enviado';`)
  }

  async down(): Promise<void> {
    this.addSql(`UPDATE "orden" SET estado = 'pendiente' WHERE estado = 'cargada';`)
    this.addSql(`UPDATE "orden" SET estado = 'enviado' WHERE estado = 'en_transporte';`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "is_pagada";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "is_facturada";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "cantidad_bultos";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "peso_kg";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "dimensiones";`)
    this.addSql(`ALTER TABLE "orden" DROP COLUMN IF EXISTS "numero_guia";`)
  }
}
