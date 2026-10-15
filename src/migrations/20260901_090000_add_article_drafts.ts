import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Turns on drafts for `articles`.
 *
 * Without this the collection has one row per article and every save is live
 * immediately: an editor mid-sentence is a live edit, and there is no way to
 * prepare a piece ahead of time. With it, `articles._status` marks the current
 * state and `_articles_v` holds the version history.
 *
 * The DDL below is not hand-written. It was taken from what Payload itself
 * produced: the collection change was applied to a scratch database in push
 * mode and the resulting schema dumped, so the column names, enum labels,
 * indexes and foreign keys match exactly what the ORM expects to find. Guessing
 * at a versions table by hand is how you get a collection that reads fine and
 * fails on save.
 *
 * BACKFILL MATTERS. `_status` defaults to 'draft', so without the UPDATE at the
 * end the three published articles would become drafts the moment this runs —
 * and the loaders filter drafts out, so they would vanish from the site, the
 * sitemap and llms.txt. Everything that exists when this runs is by definition
 * already published.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_articles_status" AS ENUM ('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum__articles_v_version_status" AS ENUM ('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  // The versions table mirrors every field, including the category select, so
  // it needs its own enum. It existed in the scratch database the DDL was
  // dumped from — push mode had already created it — which is exactly the kind
  // of gap a dump-based migration hides. Caught by running this against
  // production inside a transaction: it failed on the missing type and rolled
  // back without touching anything.
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum__articles_v_version_category" AS ENUM ('founders', 'working-at-mento', 'best-practices');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await db.execute(sql`
    ALTER TABLE "articles"
      ADD COLUMN IF NOT EXISTS "_status" "enum_articles_status" DEFAULT 'draft';`)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "articles__status_idx" ON "articles" ("_status");`)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "_articles_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_title" varchar,
      "version_slug" varchar,
      "version_subtitle" varchar,
      "version_category" "enum__articles_v_version_category" DEFAULT 'founders',
      "version_author" varchar,
      "version_published_date" timestamp(3) with time zone,
      "version_hero_image_id" integer,
      "version_content" jsonb,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "enum__articles_v_version_status" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean
    );`)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_articles_v"
        ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "articles"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_articles_v"
        ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk"
        FOREIGN KEY ("version_hero_image_id") REFERENCES "media"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "_articles_v_parent_idx" ON "_articles_v" ("parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_latest_idx" ON "_articles_v" ("latest");
    CREATE INDEX IF NOT EXISTS "_articles_v_created_at_idx" ON "_articles_v" ("created_at");
    CREATE INDEX IF NOT EXISTS "_articles_v_updated_at_idx" ON "_articles_v" ("updated_at");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_slug_idx" ON "_articles_v" ("version_slug");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version__status_idx" ON "_articles_v" ("version__status");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_created_at_idx" ON "_articles_v" ("version_created_at");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_updated_at_idx" ON "_articles_v" ("version_updated_at");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_hero_image_idx" ON "_articles_v" ("version_hero_image_id");`)

  // Everything that exists at this point is already live, so it is published.
  await db.execute(sql`UPDATE "articles" SET "_status" = 'published' WHERE "_status" IS NULL OR "_status" = 'draft';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "_articles_v";`)
  await db.execute(sql`DROP INDEX IF EXISTS "articles__status_idx";`)
  await db.execute(sql`ALTER TABLE "articles" DROP COLUMN IF EXISTS "_status";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum__articles_v_version_status";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum__articles_v_version_category";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_articles_status";`)
}
