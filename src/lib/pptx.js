// ============================================================
//  Ler o texto de um .pptx dentro do browser.
//
//  Um .pptx e um ZIP com um XML por slide. Em vez de carregar uma biblioteca
//  de 100 kB — nesta app, que e offline-first, o peso do bundle conta — abre-se
//  o ZIP a mao: o indice esta no fim do ficheiro e o conteudo descomprime-se
//  com a DecompressionStream, que o browser ja traz.
//
//  Assim tambem so viaja para o servidor o TEXTO dos slides, e nao um ficheiro
//  de 30 MB que a Vercel recusaria.
// ============================================================

const dec = new TextDecoder()
const ASSINATURA_FIM = 0x06054b50   // fim do indice central
const ASSINATURA_ENTRADA = 0x02014b50 // uma entrada do indice

export const podeLerPptx = () => typeof DecompressionStream === 'function'

/** As entradas do ZIP: nome, onde comeca e como esta comprimido. */
function lerIndice(view) {
  // O fim do indice tem tamanho variavel (pode ter comentario): procura-se de tras para a frente.
  let fim = -1
  for (let i = view.byteLength - 22; i >= 0 && i > view.byteLength - 66000; i--) {
    if (view.getUint32(i, true) === ASSINATURA_FIM) { fim = i; break }
  }
  if (fim === -1) throw new Error('nao parece um .pptx')

  const total = view.getUint16(fim + 10, true)
  let p = view.getUint32(fim + 16, true)
  const entradas = []
  for (let i = 0; i < total; i++) {
    if (view.getUint32(p, true) !== ASSINATURA_ENTRADA) break
    const metodo = view.getUint16(p + 10, true)
    const comprimido = view.getUint32(p + 20, true)
    const nomeLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const comentarioLen = view.getUint16(p + 32, true)
    const offset = view.getUint32(p + 42, true)
    const nome = dec.decode(new Uint8Array(view.buffer, p + 46, nomeLen))
    entradas.push({ nome, metodo, comprimido, offset })
    p += 46 + nomeLen + extraLen + comentarioLen
  }
  return entradas
}

/** Os bytes de uma entrada, ja descomprimidos. */
async function extrair(buffer, view, entrada) {
  // O cabecalho local repete o nome e os extras, e SO ele diz o tamanho certo deles.
  const nomeLen = view.getUint16(entrada.offset + 26, true)
  const extraLen = view.getUint16(entrada.offset + 28, true)
  const inicio = entrada.offset + 30 + nomeLen + extraLen
  const bytes = new Uint8Array(buffer, inicio, entrada.comprimido)
  if (entrada.metodo === 0) return bytes                    // guardado sem compressao
  if (entrada.metodo !== 8) throw new Error('compressao desconhecida no .pptx')
  const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}

const numeroDoSlide = (nome) => Number(nome.match(/slide(\d+)\.xml$/)?.[1] || 0)

// <a:t> e onde o PowerPoint guarda o texto que se ve. As quebras de paragrafo
// (</a:p>) viram newline para o resumo nao colar os topicos todos.
function textoDoXml(xml) {
  return xml
    .replace(/<a:br\s*\/>/g, '\n')
    .replace(/<\/a:p>/g, '\n')
    .replace(/<a:t>([\s\S]*?)<\/a:t>/g, (_, t) => `${t} `)
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean)
    .join('\n')
}

/**
 * O texto de uma apresentacao, slide a slide:
 *   [{ n: 1, texto: 'Titulo\nponto\nponto' }, ...]
 */
export async function lerPptx(file) {
  if (!podeLerPptx()) throw new Error('browser sem DecompressionStream')
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const slides = lerIndice(view)
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.nome))
    .sort((a, b) => numeroDoSlide(a.nome) - numeroDoSlide(b.nome))
  if (!slides.length) throw new Error('sem slides')

  const out = []
  for (const s of slides) {
    const texto = textoDoXml(dec.decode(await extrair(buffer, view, s)))
    if (texto) out.push({ n: numeroDoSlide(s.nome), texto })
  }
  return out
}

/** Os slides em texto corrido, como vao para o modelo. */
export const slidesEmTexto = (slides) =>
  slides.map((s) => `--- Slide ${s.n} ---\n${s.texto}`).join('\n\n')
