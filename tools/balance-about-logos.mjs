/** Balance whole brand lockups by visible bounds and ink density, keeping source SVGs intact. */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = resolve(root, 'public/portfolio/logos')
const outputDir = resolve(root, 'public/portfolio/about-logos')
const mobileDir = resolve(root, 'public/portfolio/about-logos-mobile')
await mkdir(mobileDir, { recursive: true })
// Optical corrections after reviewing the complete set together.
const corrections = {
  'clerk-chat': 0.92,
  alma: 0.92,
  mirai: 0.92,
  brix: 0.9,
  kodezi: 0.783,
  rork: 0.8096,
  pin: 0.85,
  'tella-tv': 0.85,
  brand: 1.18,
  phia: 1.15,
  herostuff: 1.1,
  'command-code': 1.15,
  'final-round-ai': 1.12,
  structify: 1.16,
  'synthetic-society': 1.08,
}
const tiles = []
const mobileWidths = {}
const files = (await readdir(sourceDir)).filter((name) => name.endsWith('.svg')).sort()
const sheetIndex = process.argv.indexOf('--sheet')
const sheetPath = sheetIndex >= 0 ? process.argv[sheetIndex + 1] : null
const n = (value) => Number(value.toFixed(3))

for (const [index, name] of files.entries()) {
  // Luminance masks and white knockouts are functional, not brand colors.
  const masks = []
  const protectedSource = (await readFile(resolve(sourceDir, name), 'utf8')).replace(
    /<mask\b[\s\S]*?<\/mask>/g,
    (mask) => {
      masks.push(mask)
      return `__MASK_${masks.length - 1}__`
    },
  )
  const src = protectedSource
    .replace(
      /(fill|stroke|stop-color)=(['"])(?!none|url\()[^'"]+\2/g,
      (value, attribute, quote) => {
        const color = value.split(quote)[1].toLowerCase()
        const light = ['white', '#fff', '#ffffff', '#e4e9e2'].includes(color)
        return `${attribute}=${quote}${light ? '#fff' : '#04212b'}${quote}`
      },
    )
    .replace(/__MASK_(\d+)__/g, (_, index) => masks[Number(index)])
  const viewBox = src
    .match(/viewBox=["']([^"']+)/)?.[1]
    .split(/[ ,]+/)
    .map(Number)
  if (!viewBox || viewBox.length !== 4) throw new Error(`Missing viewBox: ${name}`)
  const { data, info } = await sharp(Buffer.from(src))
    .resize({ width: 1200 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let left = info.width,
    top = info.height,
    right = -1,
    bottom = -1,
    ink = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3] / 255
      if (alpha <= 0.05) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      ink += alpha
    }
  }
  if (right < left) throw new Error(`Empty drawing: ${name}`)
  const boundsWidth = right - left + 1,
    boundsHeight = bottom - top + 1
  const density = ink / (boundsWidth * boundsHeight)
  const correction = corrections[name.replace('.svg', '')] ?? 1
  let scale =
    Math.min(
      208 / boundsWidth,
      44 / boundsHeight,
      Math.sqrt(5000 / (boundsWidth * boundsHeight)) * Math.pow(0.35 / density, 0.15),
    ) *
    correction *
    0.85
  // Keep Tella's approved optical size after restoring the solid icon.
  if (name === 'tella-tv.svg') scale = 97.253 / boundsWidth
  const width = boundsWidth * scale,
    height = boundsHeight * scale
  mobileWidths[name] = n(width)
  const crop = [
    viewBox[0] + (left / info.width) * viewBox[2],
    viewBox[1] + (top / info.height) * viewBox[3],
    (boundsWidth / info.width) * viewBox[2],
    (boundsHeight / info.height) * viewBox[3],
  ].map(n)
  const body = src.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 112"><svg x="${n((400 - width) / 2)}" y="${n((112 - height) / 2)}" width="${n(width)}" height="${n(height)}" viewBox="${crop.join(' ')}" fill="none">${body}</svg></svg>\n`
  await writeFile(resolve(outputDir, name), svg)
  // Align the cropped, visible artwork to one bottom edge on phones.
  // Find the dense bottom of the word, allowing descenders below the baseline.
  // Ignore the left icon area so a taller symbol does not define the writing line.
  const rows = []
  for (let y = top; y <= bottom; y++) {
    let count = 0
    for (let x = Math.round(left + boundsWidth * 0.3); x <= right; x++) {
      if (data[(y * info.width + x) * 4 + 3] / 255 > 0.5) count++
    }
    rows.push(count)
  }
  const threshold = Math.max(...rows) * 0.3
  let baseline = bottom
  while (baseline > top && rows[baseline - top] < threshold) baseline--
  const mobileSvg = svg.replace(
    `y="${n((112 - height) / 2)}"`,
    `y="${n(64 - (baseline - top + 1) * scale)}"`,
  )
  await writeFile(resolve(mobileDir, name), mobileSvg)
  if (sheetPath) {
    tiles.push({
      input: await sharp(Buffer.from(svg)).resize(320, 90).png().toBuffer(),
      left: (index % 4) * 320,
      top: Math.floor(index / 4) * 118,
    })
    tiles.push({
      input: Buffer.from(
        `<svg width="320" height="22"><text x="160" y="16" text-anchor="middle" font-family="Arial" font-size="12" fill="#52636b">${name.replace('.svg', '')}</text></svg>`,
      ),
      left: (index % 4) * 320,
      top: Math.floor(index / 4) * 118 + 90,
    })
  }
}
await writeFile(
  resolve(root, 'src/lib/aboutLogoWidths.json'),
  JSON.stringify(mobileWidths, null, 2) + '\n',
)
if (sheetPath)
  await sharp({
    create: {
      width: 1280,
      height: Math.ceil(files.length / 4) * 118,
      channels: 4,
      background: '#fff',
    },
  })
    .composite(tiles)
    .png()
    .toFile(sheetPath)
console.log(`Optically balanced ${files.length} SVG lockups; original logo files unchanged.`)
