// ============================================================
//  Cadernos de exercícios.
//
//  O PDF vai para o R2 (o mesmo sítio das provas antigas) porque estes
//  ficheiros passam dos 4,5 MB que a Vercel aceita num pedido. O que fica
//  guardado na conta do aluno é só o índice — capítulos e números — mais o
//  estado de cada exercício.
//
//  Linha em `notes`:  "#handbook:<nome>\n<json>"
//    { nome, pdf, solucoes, capitulos: [{ titulo, inicio, fim, exercicios }],
//      estado: { "0:1.4": { estado, nota, veredicto, feedback, quando } } }
//
//  `exercicios: null` num capítulo quer dizer "ainda não foi lido" — lê-se
//  quando o aluno o abrir, que é o que evita esperar pelo caderno todo.
// ============================================================
export const HANDBOOK_TAG = '#handbook:'

export const ESTADOS = ['porfazer', 'feito', 'errado', 'duvida']

export const isHandbookRow = (n) => String(n?.body || '').startsWith(HANDBOOK_TAG)

export function handbookOf(n) {
  const body = String(n?.body || '')
  const corte = body.indexOf('\n')
  const nome = (corte === -1 ? body : body.slice(0, corte)).slice(HANDBOOK_TAG.length).trim()
  try {
    const dados = JSON.parse(corte === -1 ? '{}' : body.slice(corte + 1))
    return { nome, ...dados, capitulos: dados.capitulos || [], estado: dados.estado || {} }
  } catch {
    return { nome, capitulos: [], estado: {} }
  }
}

export const handbookBody = (dados) =>
  `${HANDBOOK_TAG}${dados.nome || ''}\n${JSON.stringify({ ...dados, nome: undefined })}`

export const chaveDoExercicio = (iCap, n) => `${iCap}:${n}`

/** Quantos exercícios há e quantos já estão feitos. */
export function contas(dados) {
  let total = 0
  let feitos = 0
  let errados = 0
  dados.capitulos.forEach((c, i) => {
    for (const e of c.exercicios || []) {
      total++
      const s = dados.estado[chaveDoExercicio(i, e.n)]?.estado
      if (s === 'feito') feitos++
      else if (s === 'errado') errados++
    }
  })
  return { total, feitos, errados, porLer: dados.capitulos.filter((c) => !c.exercicios).length }
}

/** O estado que uma correção implica: nem tudo o que não é 20 é "errado". */
export const estadoDoVeredicto = (v) => (v === 'certo' ? 'feito' : v === 'quase' ? 'duvida' : 'errado')
