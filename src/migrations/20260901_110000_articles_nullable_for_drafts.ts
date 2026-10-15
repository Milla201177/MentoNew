import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Lets a draft article be incomplete.
 *
 * The previous migration added `_status` and the versions table but left the
 * `articles` columns `NOT NULL`, because the schema dump it was built from only
 * covered the objects drafts ADD — not the constraints drafts RELAX. The result
 * was a collection that reads perfectly and cannot be written to: saving a draft
 * without, say, a hero image produced a bare Postgres error.
 *
 *   ReportNotNullViolationError — insert into "articles" (... "hero_image_id" ...)
 *
 * Found by actually creating a draft against production rather than trusting
 * that the migration was complete. That is the whole point of a draft: it exists
 * so somebody can save an unfinished piece.
 *
 * Which columns, and why exactly these: they are the ones Payload's own push
 * mode makes nullable when `versions.drafts` is on. That was checked against a
 * scratch database rather than reasoned about — push mode leaves only `id`,
 * `created_at` and `updated_at` as `NOT NULL`.
 *
 * Nothing is weakened for published content. `required: true` still holds at the
 * validation layer, so publishing an article without a title or a cover is
 * refused exactly as before; only saving it as a draft is allowed.
 */
const RELAXED = [
  'title',
  'slug',
  'subtitle',
  'author',
  'published_date',
  'hero_image_id',
  'content',
  'category',
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const column of RELAXED) {
    await db.execute(sql.raw(`ALTER TABLE "articles" ALTER COLUMN "${column}" DROP NOT NULL;`))
  }
}

/**
 * Restoring NOT NULL would fail while any draft holds a null in one of these,
 * which is the normal state once drafts are in use. Rolling this back therefore
 * means publishing or deleting the drafts first — deliberately not automated
 * here, because the alternative is a `down` that silently discards someone's
 * unfinished work.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const column of RELAXED) {
    await db.execute(sql.raw(`ALTER TABLE "articles" ALTER COLUMN "${column}" SET NOT NULL;`))
  }
}
