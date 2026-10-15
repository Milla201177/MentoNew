import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Gives every existing article a version row.
 *
 * Enabling drafts is not just a schema change: from that point the admin list
 * reads through `_articles_v`, because with drafts on it asks for the latest
 * version of each document rather than the row in the main table. The three
 * articles that predated drafts had no version rows, so the admin showed
 * "No Results" — while the public site kept working, since its loaders read
 * `articles` directly.
 *
 * That split is what made it easy to miss: the site was demonstrably fine, and
 * every check that had been run pointed at the site.
 *
 * One row per article, copied from the current values, `latest = true` and
 * `version__status = 'published'` — these are live pieces, so their one version
 * is the published one. `WHERE NOT EXISTS` keeps it idempotent and stops it
 * duplicating versions written since.
 *
 * The category column needs a cast: the versions table has its own enum type,
 * and Postgres will not convert between two enums directly.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "_articles_v" (
      "parent_id", "version_title", "version_slug", "version_subtitle",
      "version_category", "version_author", "version_published_date",
      "version_hero_image_id", "version_content", "version_updated_at",
      "version_created_at", "version__status", "latest", "created_at", "updated_at"
    )
    SELECT
      a."id", a."title", a."slug", a."subtitle",
      a."category"::text::"enum__articles_v_version_category",
      a."author", a."published_date", a."hero_image_id", a."content",
      a."updated_at", a."created_at", 'published', true, now(), now()
    FROM "articles" a
    WHERE NOT EXISTS (SELECT 1 FROM "_articles_v" v WHERE v."parent_id" = a."id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Only the seeded rows: anything an editor has saved since has a different
  // created_at and is somebody's work.
  await db.execute(sql`DELETE FROM "_articles_v" WHERE "latest" = true AND "version__status" = 'published';`)
}
