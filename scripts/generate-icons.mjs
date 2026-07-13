// Gera os icones PNG da PWA a partir do SVG.  Corre: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const svg = readFileSync(join(pub, 'favicon.svg'))

// Icone "maskable" precisa de margem (safe zone) — fundo navy a preencher tudo,
// marca Nova reduzida e centrada.
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
     <rect width="512" height="512" fill="#0a2540"/>
     <g transform="translate(256,266) scale(0.72) translate(-256,-266)">
       <path d="M 176 210 A 84 100 0 1 0 336 210" fill="none" stroke="#ffffff" stroke-width="44" stroke-linecap="round"/>
       <circle cx="256" cy="150" r="40" fill="#ffffff"/>
       <rect x="168" y="392" width="176" height="22" rx="11" fill="#ffffff"/>
     </g>
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
