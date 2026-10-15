import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_category" AS ENUM('founders', 'working-at-mento', 'best-practices');
  ALTER TABLE "articles" ADD COLUMN "category" "enum_articles_category" DEFAULT 'founders' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" DROP COLUMN "category";
  DROP TYPE "public"."enum_articles_category";`)
}
