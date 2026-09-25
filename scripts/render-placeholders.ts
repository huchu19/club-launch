// Renders the SVG placeholder art in design/placeholders to JPEGs in
// public/placeholders (used by demo content and uploaded by `pnpm seed`).
// Run with: pnpm tsx scripts/render-placeholders.ts
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source = path.join(process.cwd(), 'design/placeholders')
const target = path.join(process.cwd(), 'public/placeholders')

for (const file of await readdir(source)) {
  if (!file.endsWith('.svg')) continue
  const out = path.join(target, file.replace(/\.svg$/, '.jpg'))
  const info = await sharp(path.join(source, file), { density: 144 })
    .resize({ width: 1600, withoutEnlargement: false })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out)
  console.log(
    `${path.relative(process.cwd(), out)}  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`,
  )
}
