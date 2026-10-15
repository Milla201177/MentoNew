/** Local snapshot preview needs no CMS credentials; hosted builds still require them. */
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

const env = { ...process.env }
if (!env.PAYLOAD_SECRET && !env.DATABASE_URI && !env.VERCEL && !env.CI) {
  env.PAYLOAD_SECRET = randomBytes(32).toString('hex')
}
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', ...process.argv.slice(2)],
  {
    env,
    stdio: 'inherit',
  },
)
child.on('exit', (code) => process.exit(code ?? 1))
child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})
