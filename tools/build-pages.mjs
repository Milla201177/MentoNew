/** Export the public website for GitHub Pages; keep the CMS project untouched. */
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scratch = await mkdtemp(join(tmpdir(), 'mento-static-'))
const base = process.env.PAGES_BASE_PATH || '/MentoNew'
const output = resolve(root, '.pages-output')
try {
  for (const name of ['src', 'public', 'package.json', 'tsconfig.json', 'postcss.config.mjs', 'next.config.ts']) await cp(join(root,name), join(scratch,name), {recursive:true})
  await symlink(join(root,'node_modules'), join(scratch,'node_modules'), 'dir')
  await rm(join(scratch,'src/app/(payload)'), {recursive:true,force:true})
  for (const name of ['llms.txt','robots.ts','sitemap.ts']) await rm(join(scratch,'src/app',name),{recursive:true,force:true})
  const patch = async directory => {
    for (const entry of await readdir(directory,{withFileTypes:true})) {
      const file=join(directory,entry.name)
      if(entry.isDirectory()) await patch(file)
      else if(/\.(tsx?|jsx?|css|json)$/.test(entry.name)) {
        let text=await readFile(file,'utf8')
        text=text.replace(/(['"`])\/(icons|logos|images|portfolio|fonts)\//g, `$1${base}/$2/`)
        text=text.replace(/(url\(\s*)\/(icons|logos|images|portfolio|fonts)\//g, `$1${base}/$2/`)
        await writeFile(file,text)
      }
    }
  }
  await patch(join(scratch,'src'))
  const config=join(scratch,'next.config.ts')
  let configText=await readFile(config,'utf8')
  configText=configText.replace('  ...withPayloadConfig,',`  ...withPayloadConfig,\n  output: 'export',\n  basePath: ${JSON.stringify(base)},\n  trailingSlash: true,\n  images: { unoptimized: true },`)
  await writeFile(config,configText)
  const env={...process.env,PAYLOAD_SECRET:randomBytes(32).toString('hex'),NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:process.env.PAGES_SITE_URL || `https://milla201177.github.io${base}`}
  delete env.DATABASE_URI
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:scratch,env,stdio:'inherit'})
    child.on('error',reject)
    child.on('exit',code=>code===0?resolve():reject(new Error(`Static export failed: ${code}`)))
  })
  await rm(output,{recursive:true,force:true})
  await cp(join(scratch,'out'),output,{recursive:true})
  await writeFile(join(output,'.nojekyll'),'')
  console.log(`GitHub Pages export ready: ${output}`)
} finally {
  await rm(scratch,{recursive:true,force:true})
}
