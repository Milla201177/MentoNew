import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `portfolio.website` and backfills it for the 29 companies that already
 * had an address published in llms.txt.
 *
 * The backfill is here rather than left to an editor because the data already
 * existed — it was hardcoded in `public/llms.txt`, which is exactly the drift
 * this field removes. Typing 29 URLs into the admin by hand would have been a
 * new chance to introduce a typo into something crawlers read.
 *
 * Matched on `name` rather than `slug` because the llms.txt headings were the
 * company names. `WHERE website IS NULL` keeps this idempotent and stops it
 * overwriting anything an editor has since corrected.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "website" varchar;`)

  await db.execute(sql`
    UPDATE "portfolio" AS p
       SET "website" = v.url
      FROM (VALUES
      ('Artisan', 'https://www.artisan.co'),
      ('Phia', 'https://phia.com'),
      ('Coframe', 'https://www.coframe.com'),
      ('Langbase', 'https://langbase.com'),
      ('Final Round AI', 'https://www.finalroundai.com'),
      ('Clerk Chat', 'https://clerk.chat'),
      ('Rork', 'https://rork.com'),
      ('Sync.so', 'https://sync.so'),
      ('Eragon AI', 'https://www.eragon.ai'),
      ('Alma', 'https://www.tryalma.com'),
      ('Mirai', 'https://trymirai.com'),
      ('HyperSpell', 'https://www.hyperspell.com'),
      ('Tella.tv', 'https://www.tella.com'),
      ('Kodezi', 'https://kodezi.com'),
      ('Brix', 'https://joinbrix.com'),
      ('AvatarOS', 'https://avataros.com'),
      ('Platus', 'https://platus.com'),
      ('Openlayer', 'https://www.openlayer.com'),
      ('Tely AI', 'https://tely.ai'),
      ('HeroStuff', 'https://www.herostuff.com'),
      ('Leo AI', 'https://www.getleo.ai'),
      ('Synthetic Society', 'https://syntheticsociety.ai'),
      ('Telescope', 'https://trytelescope.io'),
      ('VideoGen', 'https://videogen.io'),
      ('Versey', 'https://www.versey.ai'),
      ('Neera', 'https://neeralab.com'),
      ('Structify', 'https://www.structify.ai'),
      ('Uptool', 'https://uptool.com'),
      ('Ceramic', 'https://ceramic.ai')
      ) AS v(name, url)
     WHERE p."name" = v.name
       AND p."website" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "portfolio" DROP COLUMN IF EXISTS "website";`)
}
