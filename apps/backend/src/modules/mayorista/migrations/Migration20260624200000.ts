import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260624200000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "vendedor"
        add column if not exists "password_hash" text null,
        add column if not exists "lat" numeric null,
        add column if not exists "lng" numeric null,
        add column if not exists "ultima_ubicacion" timestamptz null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      alter table if exists "vendedor"
        drop column if exists "password_hash",
        drop column if exists "lat",
        drop column if exists "lng",
        drop column if exists "ultima_ubicacion";
    `);
  }

}
