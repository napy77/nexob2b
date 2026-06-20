import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260620183325 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mayorista" add column if not exists "password_hash" text null, add column if not exists "zonas" jsonb not null default '[]';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mayorista" drop column if exists "password_hash", drop column if exists "zonas";`);
  }

}
