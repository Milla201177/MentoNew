import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `portfolio.icon` — a second upload beside `logo`.
 *
 * The two marks are used in opposite shapes and could not stay one field. The
 * About section's scrolling strip renders a wide wordmark up to 150x70; the
 * redesigned portfolio list (Figma 460:2221) renders a square brand icon at
 * 20x20. Squeezing the wordmark into 20px made it unreadable, and a square
 * mark at 150px says nothing about which company it is.
 *
 * NULLABLE on purpose, unlike `logo`. Every existing row has a wordmark and no
 * icon, and `loadCompanies` falls back to the wordmark when `icon` is unset —
 * so this deploys without an editor having to fill in 29 uploads first, and
 * each icon improves its row the moment it is added.
 *
 * ORDER MATTERS, and it is the same as the drafts migrations and the opposite
 * of the cover drop: the column has to exist BEFORE code that selects it goes
 * live. Payload's find() asks for every configured field, so shipping the field
 * against a database without the column makes every portfolio query fail — and
 * `loadCompanies` catches that and quietly serves the four fallback companies,
 * which looks like the CMS emptied itself.
 *
 * `ON DELETE set null` matches `logo`'s constraint: deleting a media file
 * clears the reference rather than taking the company row with it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "icon_id" integer;`)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portfolio"
        ADD CONSTRAINT "portfolio_icon_id_media_id_fk"
        FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_icon_idx" ON "portfolio" USING btree ("icon_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "portfolio_icon_idx";`)
  await db.execute(sql`
    ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "portfolio_icon_id_media_id_fk";`)
  await db.execute(sql`ALTER TABLE "portfolio" DROP COLUMN IF EXISTS "icon_id";`)
}
