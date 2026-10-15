import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Portfolio } from './collections/Portfolio'
import { Articles } from './collections/Articles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Read a required environment variable, or refuse to build a config without it. */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to .env locally, or to the environment ` +
        `variables of the deployment. Refusing to start without it.`,
    )
  }
  return value
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Portfolio, Articles],
  // Payload scaffolds a GraphQL endpoint alongside REST. Nothing here uses it:
  // every page reads content server-side through `getPayload()` (the Local API,
  // an in-process call with no HTTP involved), so the browser never queries the
  // CMS at all. It was still answering anonymous queries in production — an
  // unused surface nobody watches, and GraphQL specifically lets a caller
  // choose the query's depth, so one small request can become expensive work
  // for the database.
  //
  // The `graphql` package stays in package.json: it is a *peer* dependency of
  // payload, so removing it breaks resolution even with the endpoint off.
  graphQL: {
    disable: true,
  },
  editor: lexicalEditor(),
  /**
   * Fail fast rather than boot with an empty signing secret.
   *
   * This used to be `process.env.PAYLOAD_SECRET || ''`. That fallback does not
   * degrade gracefully — the secret signs admin session JWTs and
   * password-reset tokens, so an empty one means anyone who knows the
   * framework can mint a valid admin session. And it fails silently: the site
   * renders normally, so nothing signals that auth has stopped meaning
   * anything. A deploy that is missing the variable should not start.
   */
  secret: requireEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Local dev keeps Payload's default schema `push`, which auto-syncs the
    // database as collections change. Production disables push and runs the
    // committed migrations in this directory instead (`bun run migrate` on
    // deploy) — without them a new collection's tables would simply be missing.
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  // Cap upload size here rather than on the Media collection — the limit is a
  // request-parsing concern, so Payload takes it at the top level. 8 MB is
  // comfortably above the ~2 MB team portraits while keeping a malformed or
  // oversized file from tying up the server.
  upload: {
    limits: { fileSize: 8 * 1024 * 1024 },
  },
  plugins: [
    // Vercel Blob only takes over when a token is actually configured. Without
    // one (local dev), the plugin stays off and Payload keeps its built-in disk
    // storage, so uploads still work — otherwise every upload would be sent to
    // Vercel with an empty token and fail.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],
})
