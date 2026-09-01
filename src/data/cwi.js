// ============================================================
//  Careers with Impact (codigo 1471)
//
//  Nao e uma cadeira como as outras: sao 4 MODULOS de 1 ECTS, feitos ao longo
//  dos 3 anos e avaliados em feito / nao feito — nunca ha nota. Da para ter o
//  Modulo I concluido e os outros por fazer.
//
//  Fonte: "Careers with Impact — Undergraduate Syllabus 25/26" (Nova SBE) e a
//  folha "GPA Calculators Bachelors.xlsx", que lista os 4 modulos em linhas
//  separadas, 1 ECTS cada, com "(Done/Not Done)" em vez de nota.
// ============================================================

export const CWI_CODE = '1471'

// Pontos Role to Play no total do curso (6 no Modulo II + 14 no IV).
export const CWI_ROLE_TO_PLAY_POINTS = 20

/**
 * Os 4 modulos. `auto` marca os que a escola inscreve sozinha (I e II, no 1o
 * semestre do 1o ano); nos outros o aluno tem de se inscrever, e tambem para
 * repetir um que tenha chumbado.
 */
export const CWI_MODULES = [
  { id: 'I',   ects: 1, auto: true,  focus: 'career', reqs: ['cwi.I.r1', 'cwi.I.r2'] },
  { id: 'II',  ects: 1, auto: true,  focus: 'impact', reqs: ['cwi.II.r1', 'cwi.II.r2', 'cwi.II.r3'] },
  { id: 'III', ects: 1, auto: false, focus: 'career', reqs: ['cwi.III.r1', 'cwi.III.r2', 'cwi.III.r3'] },
  { id: 'IV',  ects: 1, auto: false, focus: 'impact', reqs: ['cwi.IV.r1', 'cwi.IV.r2'] },
]

export const CWI_ECTS = CWI_MODULES.reduce((s, m) => s + m.ects, 0)

// Titulo com que o modulo fica gravado (tabela `grades`, uma linha por modulo
// concluido). Fica em ingles, o nome oficial, para se perceber em qualquer
// idioma e para a leitura nao depender da traducao.
export const cwiTitle = (id) => `Careers with Impact — Module ${id}`

/** Os modulos ja concluidos, a partir das linhas de `grades` da cadeira. */
export function cwiDone(rows) {
  const titles = new Set((rows || []).map((r) => String(r.title || '').trim()))
  return CWI_MODULES.filter((m) => titles.has(cwiTitle(m.id)))
}

/** A linha gravada de um modulo (para o poder apagar quando se desmarca). */
export const cwiRow = (rows, id) =>
  (rows || []).find((r) => String(r.title || '').trim() === cwiTitle(id)) || null
