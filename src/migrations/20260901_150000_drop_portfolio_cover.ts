import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops `portfolio.cover`.
 *
 * The field was a placeholder for a per-company detail page that the design
 * never included; its own admin description said as much — "Not rendered by the
 * current design — kept for a future portfolio detail page". Nothing in the
 * codebase read it and all 29 companies had it empty.
 *
 * Removed rather than left in place because an unused field is not free: every
 * editor filling in a company has to decide what it is for, and an upload field
 * that renders nowhere is a quiet way to accumulate files nobody can see — the
 * same way 57 orphaned media documents accumulated before this.
 *
 * ORDER MATTERS, and it is the opposite of the drafts migrations. The field has
 * to leave the Payload config and deploy FIRST; only then can the column go.
 * Drop the column while the old code is still live and every portfolio query
 * asks for a column that no longer exists.
 *
 * Nothing is lost: the column held no data. If the detail page is ever built,
 * `down` puts the field back.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Postgres drops the index and the foreign key with the column, but naming
  // them keeps this readable and safe to re-run.
  await db.execute(sql`DROP INDEX IF EXISTS "portfolio_cover_idx";`)
  await db.execute(sql`
    ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "portfolio_cover_id_media_id_fk";`)
  await db.execute(sql`ALTER TABLE "portfolio" DROP COLUMN IF EXISTS "cover_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "cover_id" integer;`)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "portfolio"
        ADD CONSTRAINT "portfolio_cover_id_media_id_fk"
        FOREIGN KEY ("cover_id") REFERENCES "media"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "portfolio_cover_idx" ON "portfolio" ("cover_id");`)
}
