import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260624200001 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "orden"
        add column if not exists "vendedor_id" text null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table if exists "orden"
        drop column if exists "vendedor_id";
    `);
  }

}
