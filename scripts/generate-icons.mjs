// Gera os icones PNG da PWA a partir do SVG.  Corre: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const svg = readFileSync(join(pub, 'favicon.svg'))

// Icone "maskable" precisa de margem (safe zone) — fundo navy a preencher tudo.
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#0a2540"/>
     <path transform="translate(52,52) scale(0.8)"
       d="M150 360V152h44l124 132V152h44v208h-44L194 228v132z" fill="#ffffff"/>
   </svg>`
)

const jobs = [
  { src: svg, size: 192, out: 'icon-192.png' },
  { src: svg, size: 512, out: 'icon-512.png' },
  { src: svg, size: 180, out: 'apple-touch-icon.png' },
  { src: maskable, size: 512, out: 'icon-512-maskable.png' },
]

for (const j of jobs) {
  await sharp(j.src, { density: 384 })
    .resize(j.size, j.size)
    .png()
    .toFile(join(pub, j.out))
  console.log('gerado', j.out)
}
console.log('Icones prontos.')
