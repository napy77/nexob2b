import { Migration } from "@mikro-orm/migrations"

export class Migration20260627000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "transporte" (
        "id"               VARCHAR(255) NOT NULL PRIMARY KEY,
        "nombre"           VARCHAR(255) NOT NULL,
        "tipo"             VARCHAR(50)  NOT NULL DEFAULT 'envio_propio',
        "descripcion"      TEXT         NULL,
        "icono"            VARCHAR(255) NULL,
        "activo"           BOOLEAN      NOT NULL DEFAULT TRUE,
        "orden"            INTEGER      NOT NULL DEFAULT 0,
        "porcentaje_costo" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ  NULL
      );

      INSERT INTO "transporte" ("id","nombre","tipo","icono","activo","orden","porcentaje_costo") VALUES
        ('tr_retiro',   'Retiro en depósito',   'retiro',      '🏭', TRUE, 1, 0),
        ('tr_propio',   'Envío propio',          'envio_propio','🚚', TRUE, 2, 0),
        ('tr_moto',     'Mensajería / moto',     'moto',        '🛵', TRUE, 3, 0),
        ('tr_correo',   'Correo Argentino',      'correo',      '📬', TRUE, 4, 0),
        ('tr_flete',    'Flete tercerizado',     'flete',       '🚛', TRUE, 5, 0)
      ON CONFLICT ("id") DO NOTHING;

      CREATE TABLE IF NOT EXISTS "mayorista_transporte" (
        "id"               VARCHAR(255) NOT NULL PRIMARY KEY,
        "mayorista_id"     VARCHAR(255) NOT NULL,
        "transporte_id"    VARCHAR(255) NOT NULL,
        "habilitado"       BOOLEAN      NOT NULL DEFAULT TRUE,
        "porcentaje_costo" NUMERIC(5,2) NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"       TIMESTAMPTZ  NULL
      );
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "mayorista_transporte";
      DROP TABLE IF EXISTS "transporte";
    `)
  }
}
