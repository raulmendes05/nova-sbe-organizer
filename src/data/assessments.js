// ============================================================
//  Avaliação por componentes, tal como vem nos syllabus oficiais 26/27.
//
//  Serve para o aluno não ter de copiar os pesos à mão: abre a cadeira, toca
//  uma vez e ficam lá as componentes certas, à espera das notas.
//
//  `min`  — nota mínima nessa componente para passar à cadeira (o exame de
//           Ética pede 7, o de Microeconomia pede 8): sem ela reprova-se
//           mesmo com média positiva, e é o tipo de regra que passa
//           despercebida até ser tarde.
//  `pass` — nota a que a cadeira passa, quando não são os habituais 9,5.
// ============================================================

export const ASSESSMENTS = {
  // 1463 Ethics (T1) — "In-class written case study 20% / In-class group
  // presentation 20% / Final exam 60%, mínimo de 7 no exame".
  '1463': {
    parts: [
      { key: 'assess.1463.caso', weight: 20 },
      { key: 'assess.1463.apresentacao', weight: 20 },
      { key: 'assess.1463.exame', weight: 60, min: 7 },
    ],
    notes: ['assess.1463.recurso'],
  },
  // 1119 Microeconomics (semestre de outono) — G = 0,2 M1 + 0,2 M2 + 0,1 Q + 0,5 F,
  // passa a 9,45 e com um mínimo de 8 no exame final.
  '1119': {
    pass: 9.45,
    parts: [
      { key: 'assess.1119.m1', weight: 20 },
      { key: 'assess.1119.m2', weight: 20 },
      { key: 'assess.1119.quizzes', weight: 10 },
      { key: 'assess.1119.exame', weight: 50, min: 8 },
    ],
    notes: ['assess.1119.quizzes.rule', 'assess.1119.recurso'],
  },
}

/** A nota a que se passa por defeito, quando o syllabus não diz outra coisa. */
export const PASS_DEFAULT = 9.5

export const assessmentFor = (course) => ASSESSMENTS[String(course?.code || '')] || null

export const passMarkFor = (course) => assessmentFor(course)?.pass ?? PASS_DEFAULT

/** As componentes a criar para uma cadeira, já traduzidas. */
export const partsFor = (course, t) =>
  (assessmentFor(course)?.parts || []).map((p) => ({ title: t(p.key), weight: p.weight, grade: null }))

/**
 * A que componente do syllabus corresponde uma linha já gravada — só para
 * saber se tem nota mínima.
 *
 * Primeiro pelo nome (é o que lá está, se foi o botão a criá-la). Se não der,
 * pelo peso, e SÓ quando esse peso aparece uma vez no syllabus: é o caso dos
 * exames, que são justamente os que têm mínimo. Assim continua a acertar em
 * quem escreveu as componentes à mão ou trocou de idioma pelo meio.
 */
export function partFor(course, comp, t) {
  const tpl = assessmentFor(course)
  if (!tpl) return null
  const titulo = String(comp?.title || '').trim().toLowerCase()
  const porNome = tpl.parts.find((p) => t(p.key).trim().toLowerCase() === titulo)
  if (porNome) return porNome
  const peso = Number(comp?.weight)
  const unico = tpl.parts.filter((p) => Number(p.weight) === peso)
  return unico.length === 1 ? unico[0] : null
}
