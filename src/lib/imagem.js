// Encolher uma imagem antes de a enviar.
//
// A Vercel corta corpos acima de ~4,5 MB e uma fotografia de telemóvel passa
// disso à vontade — e em base64 ainda cresce um terço. Encolher no browser é
// mais rápido do que falhar no envio, e para ler texto de uma folha 1600px
// chega bem.
const MAX_LADO = 1600

export async function encolher(file, maxLado = MAX_LADO) {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { image: dataUrl.split(',')[1], mime: 'image/jpeg' }
}
