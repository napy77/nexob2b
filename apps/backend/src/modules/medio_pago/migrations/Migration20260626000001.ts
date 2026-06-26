import { Migration } from "@mikro-orm/migrations"

export class Migration20260626000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "medio_pago" (
        "id"           VARCHAR(255) NOT NULL PRIMARY KEY,
        "nombre"       VARCHAR(255) NOT NULL,
        "tipo"         VARCHAR(50)  NOT NULL DEFAULT 'efectivo',
        "descripcion"  TEXT         NULL,
        "icono"        VARCHAR(255) NULL,
        "activo"       BOOLEAN      NOT NULL DEFAULT TRUE,
        "orden"        INTEGER      NOT NULL DEFAULT 0,
        "integracion"  VARCHAR(100) NULL,
        "config"       TEXT         NULL,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "deleted_at"   TIMESTAMPTZ  NULL
      );

      INSERT INTO "medio_pago" ("id","nombre","tipo","icono","activo","orden") VALUES
        ('mp_efectivo',   'Efectivo',                  'efectivo',      '💵', TRUE, 1),
        ('mp_efe_entrega','Efectivo contra entrega',   'efectivo',      '🚚', TRUE, 2),
        ('mp_cheque',     'Cheque',                    'cheque',        '📝', TRUE, 3),
        ('mp_echeq',      'eCheq',                     'cheque',        '📱', TRUE, 4),
        ('mp_contrareem', 'Contraembolso',             'efectivo',      '📦', TRUE, 5)
      ON CONFLICT ("id") DO NOTHING;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "medio_pago";`)
  }
}
