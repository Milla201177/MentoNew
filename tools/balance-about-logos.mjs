/** Balance visible symbols, wordmarks and spacing; preserve the source artwork. */
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
  alma: 0.92,
  mirai: 0.92,
  brix: 0.9,
  kodezi: 0.783,
  phia: 1.15,
  herostuff: 1.1,
  'command-code': 1.15,
  'final-round-ai': 1.12,
}
// Source-space split between a separate mark and its wordmark.
const lockupSplits = {
  'edian.svg': 29,
  'coframe.svg': 48,
  'hellyeah-ai.svg': 46,
  'brand.svg': 17,
  'clerk-chat.svg': 27,
  'hyperspell.svg': 80,
  'leo-ai.svg': 135,
  'pin.svg': 137,
  'rork.svg': 30,
  'sync-so.svg': 58,
  'synthetic-society.svg': 107,
  'telescope.svg': 43,
  'tella-tv.svg': 51,
  'tely-ai.svg': 65,
  'videogen.svg': 101,
  'eragon-ai.svg': 56,
  'langbase.svg': 44,
  'structify.svg': 211,
}
function balanceParts(src, box, data, info, name) {
  const split = lockupSplits[name]
  if (split === undefined) return null
  const pixelSplit = Math.round(((split - box[0]) / box[2]) * info.width)
  const measure = (from, to) => {
    let left = to,
      right = -1,
      top = info.height,
      bottom = -1,
      mass = 0
    const rowMass = Array(info.height).fill(0)
    for (let y = 0; y < info.height; y++)
      for (let x = from; x < to; x++) {
        const alpha = data[(y * info.width + x) * 4 + 3] / 255
        if (alpha < 0.1) continue
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
        mass += alpha
        rowMass[y] += alpha
      }
    if (!mass) throw new Error(`Missing lockup part: ${name}`)
    const unit = box[2] / info.width
    const threshold = Math.max(...rowMass) * 0.35
    const coreRows = rowMass.map((m, y) => (m >= threshold ? y : -1)).filter((y) => y >= 0)
    return {
      crop: [
        box[0] + left * unit,
        box[1] + top * unit,
        (right - left + 1) * unit,
        (bottom - top + 1) * unit,
      ],
      baseline: (coreRows.at(-1) - top + 1) * unit,
      coreHeight: (coreRows.at(-1) - coreRows[0] + 1) * unit,
    }
  }
  const markOnRight = name === 'structify.svg'
  const mark = markOnRight ? measure(pixelSplit, info.width) : measure(0, pixelSplit)
  const word = markOnRight ? measure(0, pixelSplit) : measure(pixelSplit, info.width)
  const wordScale = Math.min(24 / word.coreHeight, 32 / word.crop[3], 152 / word.crop[2])
  const markHeight =
    name === 'clerk-chat.svg' ? 26 : ['langbase.svg', 'pin.svg'].includes(name) ? 22 : 24
  const markScale = Math.min(markHeight / mark.crop[3], 28 / mark.crop[2])
  // Align every symbol to the word's visible baseline; descenders remain below it.
  const markY = word.baseline * wordScale - mark.crop[3] * markScale
  const top = Math.min(0, markY),
    height = Math.max(word.crop[3] * wordScale, markY + mark.crop[3] * markScale) - top
  const markWidth = mark.crop[2] * markScale,
    wordWidth = word.crop[2] * wordScale
  const body = src.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const part = (region, scale, x, y, prefix) => {
    let content = body
    for (const id of [...body.matchAll(/\bid="([^"]+)"/g)]
      .map((m) => m[1])
      .sort((a, b) => b.length - a.length)) {
      content = content
        .replaceAll(`id="${id}"`, `id="${prefix}${id}"`)
        .replaceAll(`#${id}"`, `#${prefix}${id}"`)
        .replaceAll(`#${id})`, `#${prefix}${id})`)
    }
    return `<svg x="${x}" y="${y}" width="${region.crop[2] * scale}" height="${region.crop[3] * scale}" viewBox="${region.crop.join(' ')}" overflow="hidden">${content}</svg>`
  }
  const width = markWidth + 10 + wordWidth
  return {
    src: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}">${part(mark, markScale, markOnRight ? wordWidth + 10 : 0, markY - top, 'symbol-')}${part(word, wordScale, markOnRight ? 0 : markWidth + 10, -top, 'name-')}</svg>`,
    box: [0, 0, width, height],
  }
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
  let src = protectedSource
    .replace(
      /(fill|stroke|stop-color)=(['"])(?!none|url\()[^'"]+\2/g,
      (value, attribute, quote) => {
        const color = value.split(quote)[1].toLowerCase()
        const light = ['white', '#fff', '#ffffff', '#e4e9e2'].includes(color)
        return `${attribute}=${quote}${light ? '#fff' : '#04212b'}${quote}`
      },
    )
    .replace(/__MASK_(\d+)__/g, (_, index) => masks[Number(index)])
  let viewBox = src
    .match(/viewBox=["']([^"']+)/)?.[1]
    .split(/[ ,]+/)
    .map(Number)
  if (!viewBox || viewBox.length !== 4) throw new Error(`Missing viewBox: ${name}`)
  let { data, info } = await sharp(Buffer.from(src))
    .resize({ width: 1200 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const balanced = balanceParts(src, viewBox, data, info, name)
  if (balanced) {
    src = balanced.src
    viewBox = balanced.box
    ;({ data, info } = await sharp(Buffer.from(src))
      .resize({ width: 1200 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }))
  }
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
  // Composed parts are authored in final optical pixels; plain wordmarks retain optical corrections.
  if (balanced) scale = viewBox[2] / info.width
  else if (['artisan.svg', 'avataros.svg', 'neera.svg'].includes(name)) scale = 160 / boundsWidth
  // Dense, bold wordmarks need less physical area than lighter neighbours.
  if (['coframe.svg', 'hellyeah-ai.svg', 'clerk-chat.svg'].includes(name)) scale *= 0.8
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"${src.includes('xlink:') ? ' xmlns:xlink="http://www.w3.org/1999/xlink"' : ''} viewBox="0 0 400 112"><svg x="${n((400 - width) / 2)}" y="${n((112 - height) / 2)}" width="${n(width)}" height="${n(height)}" viewBox="${crop.join(' ')}" fill="none">${body}</svg></svg>\n`
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
