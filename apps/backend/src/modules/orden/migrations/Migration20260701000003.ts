export class Migration20260701000003 {
  name = "Migration20260701000003"

  async up(queryRunner: any): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden"
        ADD COLUMN IF NOT EXISTS "mp_preference_id" TEXT,
        ADD COLUMN IF NOT EXISTS "mp_pago_id" TEXT,
        ADD COLUMN IF NOT EXISTS "mp_estado_pago" TEXT;
    `)
  }

  async down(queryRunner: any): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orden"
        DROP COLUMN IF EXISTS "mp_preference_id",
        DROP COLUMN IF EXISTS "mp_pago_id",
        DROP COLUMN IF EXISTS "mp_estado_pago";
    `)
  }
}
