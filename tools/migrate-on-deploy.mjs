/**
 * Apply pending Payload migrations as part of a PRODUCTION build — and prove
 * they applied before letting the build continue.
 *
 * Why in the build and not at runtime. Payload can also run migrations when it
 * boots (`prodMigrations`), but on Vercel that means inside request handling,
 * once per cold start, in as many instances as happen to start at once. Here
 * it runs exactly once, before the new deployment takes any traffic, and a
 * failure fails the build — so the old deployment keeps serving instead of new
 * code going live against a database it does not match. That ordering is the
 * whole point: a schema change has to land BEFORE the code that reads it (see
 * the `add_reset_password_requested_at` migration for what happens otherwise:
 * every admin login fails).
 *
 * Why production only. Preview deployments build every pushed branch, merged
 * or not. If they shared this step, an unreviewed migration on a PR branch
 * would run against whatever database the preview is pointed at — which may be
 * production's. `VERCEL_ENV` is `production` only for the production
 * deployment, so previews and local builds skip this entirely.
 *
 * Why the check afterwards. The `payload` CLI was seen, twice while this was
 * being written, to exit 0 without doing anything — not even printing
 * "Reading migration files". It did not reproduce on demand and its cause is
 * unknown. A build that trusts the exit code would ship the new code on top of
 * an unmigrated database and report success. So after running it, this reads
 * `payload_migrations` directly and fails unless every migration file in
 * `src/migrations` is recorded there.
 */

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const tag = '[migrate-on-deploy]'
const env = process.env.VERCEL_ENV

if (env !== 'production') {
  console.log(`${tag} skipped: VERCEL_ENV=${env ?? '(unset)'} — migrations run on production builds only`)
  process.exit(0)
}

const connectionString = process.env.DATABASE_URI
if (!connectionString) {
  console.error(`${tag} DATABASE_URI is not set on a production build; refusing to deploy unmigrated.`)
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const expected = readdirSync(path.join(root, 'src', 'migrations'))
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => f.slice(0, -3))
  .sort()

/* node-postgres — a DIRECT dependency, pinned in package.json to the version
   @payloadcms/db-postgres uses, and imported only here, after the checks above.

   Both halves of that are deliberate, and learned the hard way. The first
   version of this file imported `pg` statically at the top and relied on it
   being hoisted out of db-postgres. On Vercel it was not: the install there
   does not hoist transitive packages to the root, the import failed, and
   because static imports run before any code, it failed BEFORE the
   VERCEL_ENV check — so every build broke, previews included, where this
   script was only ever meant to print "skipped". Reproduced locally with
   `bun install --linker=isolated`.

   So: declared directly, so it resolves under any linker; and loaded lazily,
   so a preview or local build never touches it even if that ever breaks. */
const { default: pg } = await import('pg')
const client = new pg.Client({ connectionString })
try {
  await client.connect()

  /* A `dev` row means someone ran Payload in dev mode against this database,
     which pushes schema changes directly instead of through migrations. When
     it is there, `payload migrate` stops to ask "data loss will occur — would
     you like to proceed? (y/N)". In a build there is nobody to answer, so it
     would hang until Vercel times the build out. Answering yes automatically
     is not an option: the prompt is warning about data loss. Stop here with
     the reason instead, and let a person decide. */
  // A brand-new database has no payload_migrations table yet; `migrate`
  // creates it. Only look for the row when there is a table to look in.
  const { rows: tableRows } = await client.query(
    `select to_regclass('public.payload_migrations') is not null as present`,
  )
  const dev = tableRows[0].present
    ? await client.query(`select 1 from payload_migrations where name = 'dev' limit 1`)
    : { rowCount: 0 }
  if (dev.rowCount > 0) {
    console.error(`${tag} payload_migrations has a 'dev' row: this database was schema-pushed by`)
    console.error(`${tag} Payload in dev mode, and 'payload migrate' would stop to ask whether to`)
    console.error(`${tag} proceed with possible data loss. Not answering that unattended.`)
    console.error(`${tag} Resolve it by hand (run 'bun run migrate' against this database and read`)
    console.error(`${tag} the prompt), then redeploy.`)
    process.exit(1)
  }

  console.log(`${tag} running payload migrate (${expected.length} migrations in the repo)`)
  const run = spawnSync('payload', ['migrate'], {
    cwd: root,
    // No stdin: nothing in this step may wait for input. If a prompt ever
    // appears that the check above did not anticipate, it ends rather than
    // hangs, and the verification below catches whatever did not run.
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    timeout: 10 * 60 * 1000,
    env: { ...process.env, NODE_OPTIONS: '--no-deprecation' },
  })
  if (run.status !== 0) {
    console.error(`${tag} payload migrate exited with ${run.status ?? run.signal}; failing the build.`)
    process.exit(1)
  }

  const { rows } = await client.query('select name from payload_migrations')
  const applied = new Set(rows.map((r) => r.name))
  const missing = expected.filter((name) => !applied.has(name))
  if (missing.length > 0) {
    console.error(`${tag} payload migrate reported success, but these are not recorded as applied:`)
    for (const name of missing) console.error(`${tag}   - ${name}`)
    console.error(`${tag} failing the build so this code does not go live against an unmigrated database.`)
    process.exit(1)
  }
  console.log(`${tag} verified: all ${expected.length} migrations are recorded in payload_migrations`)
} finally {
  await client.end()
}
