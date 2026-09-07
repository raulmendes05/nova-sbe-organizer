// ============================================================
//  O plano da semana, proposto pela app.
//
//  A pergunta a que isto responde e "o que e que eu devia fazer esta semana?",
//  e nao "escreve o que vais fazer". Junta o que a app ja sabe — prazos por
//  entregar, provas a chegar, o peso de cada uma na nota, e as horas de aulas
//  de cada dia — e devolve uma lista curta, ja repartida pelos dias.
//
//  E deliberadamente uma conta, e nao um pedido a um modelo: responde num
//  instante, funciona sem rede, nao gasta quota, e da sempre o mesmo resultado
//  para os mesmos dados — o que importa quando e o estudo de alguem que esta
//  em causa.
// ============================================================
import { isoOf } from './week.js'
import { weekBounds, normTitulo } from './plan.js'
import { resolveGrade, isCourseDone } from './helpers.js'

// Quanto tempo se propoe por semana e por dia. Um plano que nao cabe no dia
// nao e um plano — e uma lista de culpa.
const MINUTOS_SEMANA = 600      // 10 horas
const MINUTOS_DIA = 210         // 3h30 num dia, no maximo
const SESSAO = { curta: 45, media: 90, longa: 120 }

// Peso de cada tipo de prova, quando o syllabus da cadeira nao diz outra coisa.
const PESO_PADRAO = { exame: 50, recurso: 50, t1: 25, t2: 25, mid: 10, apr: 20 }

const diasEntre = (a, b) => {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000)
}
const somaDatas = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}
const minutosDe = (b) => {
  const [sh, sm] = String(b.start_time).slice(0, 5).split(':').map(Number)
  const [eh, em] = String(b.end_time).slice(0, 5).split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

/**
 * O peso da prova na nota da cadeira, lido das componentes que o aluno tem
 * lancadas. Uma prova que vale 60% da nota merece mais tempo do que um
 * miniteste de 10% — e e o proprio aluno que ja escreveu esses numeros.
 */
function pesoDaProva(exame, componentes) {
  // "1.º teste" nao pode casar com o 2.º teste so por ambos terem "teste" —
  // sao pesos diferentes na maior parte das cadeiras.
  const alvo = {
    exame: /exame\s*final|final\s*exam|^exame$|^exam$/i,
    recurso: /recurso|resit/i,
    t1: /(^|\D)1\D|primeir|first|\bmid[- ]?term\s*1/i,
    t2: /(^|\D)2\D|segund|second|\bmid[- ]?term\s*2/i,
    mid: /mini|quiz/i,
    apr: /apresenta|present/i,
  }[exame.type]
  const hit = (componentes || []).find((c) => alvo?.test(String(c.title || '')) && c.grade === null)
  return Number(hit?.weight) || PESO_PADRAO[exame.type] || 20
}

// Quanto e que uma coisa a `dias` de distancia deve pesar hoje. Perto de mais
// e panico, longe de mais e barulho.
const proximidade = (dias) => (dias <= 3 ? 1 : dias <= 7 ? 0.9 : dias <= 10 ? 0.65 : dias <= 14 ? 0.45 : 0.25)

/**
 * As tarefas candidatas, com a razao pela qual aparecem.
 * `t` traduz; `dias` sao os sete dias da semana vindos do weekOf().
 */
function candidatas({ inicio, fim, hoje, courses, assignments, exames, grades, t }) {
  const out = []
  const compsDe = (id) => (grades || []).filter((g) => g.course_id === id)
  const porNome = Object.fromEntries((courses || []).map((c) => [normTitulo(c.name), c]))

  for (const a of assignments || []) {
    if (!a.due_date || a.status === 'done') continue
    const dia = String(a.due_date).slice(0, 10)
    const faltam = diasEntre(inicio, dia)
    if (faltam > 14) continue
    const atrasado = dia < hoje
    const desta = dia >= inicio && dia <= fim
    if (!desta && !atrasado && faltam > 14) continue
    out.push({
      chave: `p:${a.id}`,
      titulo: t(atrasado ? 'planner.late' : desta ? 'planner.deliver' : 'planner.ahead', { o: a.title }),
      porque: t(atrasado ? 'planner.whyLate' : 'planner.whyDue', { n: Math.abs(diasEntre(hoje, dia)) }),
      course_id: a.course_id || null,
      minutos: desta || atrasado ? SESSAO.media : SESSAO.curta,
      // Entregar em cima da hora e como se perde nota: propoe-se na vespera.
      limite: dia,
      prioridade: (atrasado ? 130 : desta ? 100 : 55) + (14 - Math.min(faltam, 14)),
    })
  }

  for (const e of exames || []) {
    const faltam = diasEntre(inicio, e.date)
    if (faltam < 0 || faltam > 21) continue
    const cadeira = porNome[normTitulo(e.course)]
    const peso = pesoDaProva(e, compsDe(cadeira?.id))
    const perto = proximidade(faltam)
    const base = 20 + peso * perto
    // Uma prova grande e a semana antes pede mais do que uma sessao.
    const sessoes = faltam <= 7 ? (peso >= 40 ? 3 : 2) : faltam <= 14 ? (peso >= 40 ? 2 : 1) : 1
    for (let i = 0; i < sessoes; i++) {
      out.push({
        chave: `e:${e.course}:${e.date}:${e.type}:${i}`,
        familia: `e:${e.course}:${e.date}:${e.type}`,
        titulo: t('planner.study', { tipo: t(`examType.${e.type}`), cadeira: e.course }),
        porque: t('planner.whyExam', { n: faltam, peso: Math.round(peso) }),
        course_id: cadeira?.id || null,
        minutos: peso >= 40 ? SESSAO.media : SESSAO.curta,
        limite: e.date,
        prioridade: base - i * 4,   // as sessoes seguintes cedem lugar
      })
    }
  }

  // Cadeiras Pass/Fail por concluir (Data Handling, os modulos do Careers with
  // Impact): nao tem data, mas ficam esquecidas ate ao fim do semestre.
  for (const c of courses || []) {
    if (c.is_equivalence) continue
    const comps = compsDe(c.id)
    if (!/data handling|careers with impact/i.test(String(c.name || ''))) continue
    if (isCourseDone(c, comps)) continue
    out.push({
      chave: `pf:${c.id}`,
      titulo: t('planner.finish', { cadeira: c.name }),
      porque: t('planner.whyPassFail'),
      course_id: c.id,
      minutos: SESSAO.curta,
      limite: null,
      prioridade: 30,
    })
  }

  // Cadeiras com nota negativa ou fraca ja lancada: rever antes que a proxima
  // avaliacao chegue.
  for (const c of courses || []) {
    if (c.is_equivalence) continue
    const nota = resolveGrade(c, compsDe(c.id))
    if (nota === null || nota >= 11) continue
    out.push({
      chave: `r:${c.id}`,
      titulo: t('planner.review', { cadeira: c.name }),
      porque: t('planner.whyWeak', { nota: nota.toFixed(1) }),
      course_id: c.id,
      minutos: SESSAO.curta,
      limite: null,
      prioridade: 35 + (11 - nota) * 3,
    })
  }

  return out.sort((a, b) => b.prioridade - a.prioridade)
}

/**
 * O plano da semana: as tarefas que cabem, cada uma no dia em que faz sentido.
 *
 * Devolve [{ chave, titulo, porque, course_id, minutos, dia }] por ordem de dia.
 * `dias` sao os sete dias do weekOf() — e de la que vem quanto tempo de aulas
 * tem cada dia, para o estudo cair nos dias mais livres.
 */
export function gerarPlano({ semana, hoje = isoOf(new Date()), dias = [], courses = [], assignments = [], exames = [], grades = [], jaNoPlano = [], t }) {
  const { inicio, fim } = weekBounds(semana)
  const feitos = new Set((jaNoPlano || []).map(normTitulo))

  // Quanto tempo de aulas tem cada dia da semana, e quanto ja la pusemos.
  const agenda = (dias.length ? dias : []).map((d) => ({
    iso: d.iso,
    aulas: (d.blocks || []).reduce((s, b) => s + minutosDe(b), 0),
    posto: 0,
  }))
  // Sem horario carregado, assume-se a semana toda livre.
  if (!agenda.length) {
    for (let i = 0; i < 7; i++) agenda.push({ iso: somaDatas(inicio, i), aulas: 0, posto: 0 })
  }
  // Dias que ja passaram nao servem para planear.
  const disponiveis = agenda.filter((d) => d.iso >= hoje || inicio > hoje)

  const escolhe = (limite, familia) => {
    const cabe = (d) => d.posto + 30 <= MINUTOS_DIA
    // Duas sessoes de estudo da mesma prova no mesmo dia nao sao duas sessoes:
    // espalham-se, que e assim que a materia assenta.
    const livre = (d) => !familia || !plano.some((x) => x.familia === familia && x.dia === d.iso)
    const aTempo = (d) => !limite || d.iso <= limite
    const escolhas = [
      disponiveis.filter((d) => aTempo(d) && cabe(d) && livre(d)),
      disponiveis.filter((d) => aTempo(d) && cabe(d)),
      disponiveis.filter((d) => cabe(d)),
    ].find((l) => l.length)
    if (!escolhas) return null
    // Dos que sobram, o mais leve. Empate: o mais cedo.
    return escolhas.slice().sort((a, b) =>
      (a.aulas + a.posto) - (b.aulas + b.posto) || a.iso.localeCompare(b.iso))[0]
  }

  const plano = []
  let total = 0
  for (const c of candidatas({ inicio, fim, hoje, courses, assignments, exames, grades, t })) {
    if (total + c.minutos > MINUTOS_SEMANA) continue
    // O que o aluno ja tem no plano nao se repete. As varias sessoes de estudo
    // da mesma prova, essas, repetem o titulo de proposito — sao dias
    // diferentes, e e por isso que a comparacao e pela chave.
    if (feitos.has(normTitulo(c.titulo)) || plano.some((x) => x.chave === c.chave)) continue
    // Um prazo quer-se na vespera; uma prova, em qualquer dia antes dela.
    const limite = c.limite
      ? (plano.some((x) => x.chave.startsWith('p:') && x.limite === c.limite) ? c.limite : somaDatas(c.limite, -1))
      : null
    const dia = escolhe(limite && limite >= inicio ? (limite > fim ? fim : limite) : null, c.familia)
    if (!dia) break
    dia.posto += c.minutos
    total += c.minutos
    plano.push({ ...c, dia: dia.iso })
  }

  return plano.sort((a, b) => a.dia.localeCompare(b.dia) || b.prioridade - a.prioridade)
}

export const totalMinutos = (plano) => (plano || []).reduce((s, x) => s + (x.minutos || 0), 0)

/** "1h30" / "45 min" */
export function duracao(min, t) {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return t('planner.min', { n: m })
  return m ? t('planner.hm', { h, m: String(m).padStart(2, '0') }) : t('planner.h', { h })
}
