// ============================================================
//  Cadeiras repetidas
//
//  A mesma cadeira pode ficar duas vezes na lista: uma criada pelo catálogo
//  nas Notas e outra pela inscrição dos turnos no Horário. Não é só feio —
//  se as duas tiverem nota, ambas entram na média ponderada por ECTS e a
//  média fica errada sem se perceber porquê. Foi também o que impediu um
//  prazo de se ligar à aula da mesma cadeira.
// ============================================================

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
export const normName = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '').replace(/\s+/g, ' ').trim()

const codeOf = (c) => (c.code == null ? '' : String(c.code).trim())
const temNota = (c) => c.final_grade !== null && c.final_grade !== undefined && c.final_grade !== ''

/**
 * Junta as cadeiras que são a mesma coisa.
 *
 * Pelo código quando existe; as que não têm código juntam-se pelo nome, e só
 * entram num grupo com código se esse nome corresponder a UM código apenas —
 * com dois candidatos não há como saber qual é, e adivinhar seria pior.
 * Equivalências nunca se juntam a cadeiras feitas na Nova, mesmo com o mesmo
 * nome: são percursos diferentes.
 */
export function duplicateGroups(courses) {
  const grupos = new Map()   // chave -> linhas
  const porNome = new Map()  // nome -> conjunto de codigos

  for (const c of courses || []) {
    const code = codeOf(c)
    if (!code) continue
    const nome = normName(c.name)
    if (!porNome.has(nome)) porNome.set(nome, new Set())
    porNome.get(nome).add(code)
  }

  for (const c of courses || []) {
    const equiv = c.is_equivalence ? 'eq' : 'nova'
    let code = codeOf(c)
    if (!code) {
      const candidatos = porNome.get(normName(c.name))
      if (candidatos && candidatos.size === 1) code = [...candidatos][0]
    }
    const chave = code ? `${equiv}:#${code}` : `${equiv}:${normName(c.name)}`
    if (!chave.endsWith(':')) {
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave).push(c)
    }
  }

  return [...grupos.entries()]
    .filter(([, linhas]) => linhas.length > 1)
    .map(([key, linhas]) => {
      const ordenadas = [...linhas].sort(pontua)
      return { key, principal: ordenadas[0], extras: ordenadas.slice(1) }
    })
}

// Qual das repetidas fica: a que tem mais coisas agarradas a ela.
function pontua(a, b) {
  const valor = (c) => (temNota(c) ? 8 : 0) + (codeOf(c) ? 4 : 0) + (c.year ? 2 : 0) + (c.term ? 1 : 0)
  const d = valor(b) - valor(a)
  if (d) return d
  return String(a.created_at || '').localeCompare(String(b.created_at || ''))
}

/**
 * O que acontece ao juntar um grupo: o que muda de dono, o que se preenche na
 * cadeira que fica e o que se perde. Nada disto escreve — serve para mostrar
 * ao aluno antes de ele decidir.
 */
export function mergePlan(group, grades = [], blocks = []) {
  const idsExtra = new Set(group.extras.map((c) => c.id))
  const componentes = grades.filter((g) => idsExtra.has(g.course_id))
  const aulas = blocks.filter((b) => idsExtra.has(b.course_id))

  // Campos em falta na que fica, preenchidos pela primeira repetida que os tenha.
  const campos = {}
  for (const campo of ['code', 'ects', 'year', 'term', 'professor', 'color', 'final_grade']) {
    const atual = group.principal[campo]
    if (atual !== null && atual !== undefined && atual !== '') continue
    const fonte = group.extras.find((c) => c[campo] !== null && c[campo] !== undefined && c[campo] !== '')
    if (fonte) campos[campo] = fonte[campo]
  }

  // Notas diferentes: a que fica é a da principal; a outra desaparece, e isso
  // tem de aparecer no aviso em vez de sumir sem se dar por ela.
  const notasPerdidas = group.extras
    .filter((c) => temNota(c) && Number(c.final_grade) !== Number(group.principal.final_grade))
    .map((c) => Number(c.final_grade))

  return { componentes, aulas, campos, notasPerdidas }
}
