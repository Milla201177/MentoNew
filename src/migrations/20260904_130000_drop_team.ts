import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Drops the `team` collection and its table.
 *
 * Figma "Option 2" removed the standalone Team section and folded the roster
 * into Focus, where it is nine hardcoded name/role lines with LinkedIn links.
 * Nothing has read this table since, and the decision is to delete rather than
 * keep it around.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  DESTRUCTIVE, AND NOT RECOVERABLE BY `down`.
 *
 *  Production holds five partner rows — Alex, Russell, Igor, Dmitry, Katie —
 *  each with a several-hundred-word bio that exists nowhere else: not in this
 *  repo, not in the design, not in any seed. `down` restores the empty table,
 *  never the rows. Take a copy first if there is any chance they are wanted:
 *
 *      pg_dump "$DATABASE_URI" -t team --data-only > team-rows.sql
 * ─────────────────────────────────────────────────────────────────────────
 *
 * An earlier revision of this migration renamed the table to `team_archived`
 * instead. Both names are dropped here so a database that ran that version
 * ends up in the same state as one that did not — and because that archive
 * turned out not to survive anyway: Drizzle's push mode, which runs whenever
 * the dev server starts, removes any table Payload's config does not describe.
 *
 * ORDER MATTERS, and it is the opposite of `add_portfolio_icon`. The
 * collection has to leave the Payload config and DEPLOY FIRST; only then can
 * this run. Dropping the table while the old code is still live breaks the
 * admin's Team views and the document-lock join that references it.
 *
 * The portraits are left alone in `media` and become orphaned uploads — worth
 * a separate cleanup, but deleting them here would take out anything else
 * that happens to reference the same files.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Payload's document-lock join references team(id). Drop the reference
  // before the table so nothing is left pointing at a collection that no
  // longer exists.
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_team_id_idx";`)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_team_fk";`)
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "team_id";`)

  await db.execute(sql`DROP TABLE IF EXISTS "team" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "team_archived" CASCADE;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Structure only. The rows are gone; restore them from the dump named above.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "team" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "role" varchar NOT NULL,
      "bio" varchar NOT NULL,
      "photo_id" integer NOT NULL,
      "linkedin" varchar DEFAULT '#',
      "order" numeric DEFAULT 0 NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );`)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk"
        FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "team_photo_idx" ON "team" USING btree ("photo_id");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "team_updated_at_idx" ON "team" USING btree ("updated_at");`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "team_created_at_idx" ON "team" USING btree ("created_at");`)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "team_id" integer;`)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_team_fk"
        FOREIGN KEY ("team_id") REFERENCES "public"."team"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_team_id_idx"
      ON "payload_locked_documents_rels" USING btree ("team_id");`)
}
