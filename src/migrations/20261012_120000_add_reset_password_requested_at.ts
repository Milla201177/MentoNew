import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `users.reset_password_requested_at`, which Payload 3.90 started
 * selecting.
 *
 * Payload 3.89 added a rate limit to "forgot password" and, with it, a hidden
 * auth field recording when the last reset was requested. It switches on by
 * default (`forgotPassword.minRequestInterval` defaults to 15000ms), so every
 * auth collection gets the field without any change to `Users.ts`.
 *
 * Measured, not inferred: pushing the schema from a clean database under 3.88
 * and under 3.90 and diffing the two dumps, this column is the ONLY
 * difference. Nothing else in the upgrade touches the database.
 *
 * ORDER MATTERS, the same way it does for `portfolio.icon`: the column has to
 * exist BEFORE 3.90 serves a request. Payload selects every configured field,
 * so against a database without it, every query on `users` fails. Reproduced
 * on a prod-like database (all earlier migrations applied under 3.88, then the
 * 3.90 code without this file): `login` and `forgotPassword` both throw
 * "Failed query: select … users.reset_password_requested_at …". The admin
 * cannot be signed into until this runs. The public pages never read `users`,
 * so the site itself keeps serving either way.
 *
 * NULLABLE, no default: a user who has never asked for a reset has no time to
 * record, and NULL is what Payload writes for that. Type matches the sibling
 * `reset_password_expiration`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";`)
}
