// Builds design/gateway.ico from apps/web/public/icon.svg: rasterizes the SVG at the
// sizes Windows expects in a multi-resolution .ico (256 down to 16).
// Dev-only tooling; sharp + png-to-ico are devDependencies.
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const SIZES = [16, 24, 32, 48, 64, 128, 256]
const svg = readFileSync(new URL('../apps/web/public/icon.svg', import.meta.url))
// density scales SVG rasterization; cap it so small sizes don't blow the pixel limit.
const pngs = await Promise.all(
  SIZES.map((size) =>
    sharp(svg, { density: 72, limitInputPixels: 268402689 })
      .resize(size, size, { fit: 'fill' })
      .resize(size, size)
      .png()
      .toBuffer()
  )
)
const ico = await pngToIco(pngs)
const out = new URL('../design/gateway.ico', import.meta.url)
writeFileSync(out, ico)
console.log(`design/gateway.ico written (${SIZES.join(', ')})`)
