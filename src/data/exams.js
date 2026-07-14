// ============================================================
//  Calendário de exames/testes S1 26/27 (Nova SBE, BSc)
//  Datas ISO. Meses Set–Dez = 2026, Jan = 2027.
//  Tipos: mid (miniteste em aula), t1 (1º teste), t2 (2º teste),
//         apr (apresentação), exame (época normal), recurso.
//  Alguns códigos têm linhas T1 e T2 (metades do semestre).
// ============================================================

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const EXAMS = {
  '1117': { name: 'Principles of Microeconomics', items: [{ type: 't1', date: '2026-10-24', time: '09:30' }, { type: 'exame', date: '2026-12-09', time: '08:30' }, { type: 'recurso', date: '2027-01-09', time: '11:00' }] },
  '1118': { name: 'Principles of Macroeconomics', items: [{ type: 't1', date: '2026-10-26', time: '17:30' }, { type: 't2', date: '2026-11-30', time: '17:30' }, { type: 'exame', date: '2026-12-21', time: '14:30' }, { type: 'recurso', date: '2027-01-07', time: '08:30' }] },
  '1119': { name: 'Microeconomics', items: [{ type: 't1', date: '2026-09-25', time: '17:30' }, { type: 't2', date: '2026-11-06', time: '17:30' }, { type: 'exame', date: '2026-12-12', time: '08:30' }, { type: 'recurso', date: '2027-01-06', time: '08:30' }] },
  '1120': { name: 'Macroeconomics', items: [{ type: 't1', date: '2026-10-16', time: '14:30' }, { type: 'exame', date: '2026-12-14', time: '17:30' }, { type: 'recurso', date: '2027-01-12', time: '08:30' }] },
  '1121': { name: 'Seminar in European Economics', items: [{ type: 'mid', date: '2026-10-22', time: '17:00' }, { type: 'exame', date: '2026-12-16', time: '14:30' }, { type: 'recurso', date: '2027-01-07', time: '11:00' }] },
  '1123': { name: 'Development Economics', items: [{ type: 'exame', date: '2026-12-18', time: '14:30' }, { type: 'recurso', date: '2027-01-08', time: '08:30' }] },
  '1124': { name: 'Economic History', term: 'T1', items: [{ type: 't1', date: '2026-09-18', time: '17:30' }, { type: 'exame', date: '2026-10-16', time: '17:30' }, { type: 'recurso', date: '2027-01-05', time: '16:00' }] },
  '1125': { name: 'Advanced Microeconomics', items: [{ type: 't1', date: '2026-10-19', time: '17:30' }, { type: 'exame', date: '2026-12-18', time: '11:30' }, { type: 'recurso', date: '2027-01-09', time: '16:00' }] },
  '1126': { name: 'Industrial Organization', items: [{ type: 't1', date: '2026-11-14', time: '11:30' }, { type: 'exame', date: '2026-12-14', time: '11:30' }, { type: 'recurso', date: '2027-01-11', time: '13:30' }] },
  '1129': { name: 'Public Economics', items: [{ type: 'mid', date: '2026-10-26', time: '15:30' }, { type: 'exame', date: '2026-12-10', time: '17:30' }, { type: 'recurso', date: '2027-01-08', time: '16:00' }] },
  '1130': { name: 'Behavioural Economics', term: 'T1', items: [{ type: 'exame', date: '2026-10-15', time: '11:30' }, { type: 'recurso', date: '2027-01-06', time: '18:30' }] },
  '1133': { name: 'International Macroeconomics', items: [{ type: 't1', date: '2026-10-17', time: '14:30' }, { type: 'exame', date: '2026-12-17', time: '17:30' }, { type: 'recurso', date: '2027-01-06', time: '13:30' }] },
  '1134': { name: 'International Trade', items: [{ type: 'mid', date: '2026-10-30', time: '11:00' }, { type: 'exame', date: '2026-12-21', time: '08:30' }, { type: 'recurso', date: '2027-01-11', time: '18:30' }] },
  '1217': { name: 'Financial Accounting', items: [{ type: 't1', date: '2026-11-02', time: '17:30' }, { type: 'exame', date: '2026-12-19', time: '08:30' }, { type: 'recurso', date: '2027-01-12', time: '11:00' }] },
  '1218': { name: 'Management Accounting', items: [{ type: 't1', date: '2026-10-23', time: '17:30' }, { type: 'exame', date: '2026-12-19', time: '14:30' }, { type: 'recurso', date: '2027-01-12', time: '16:00' }] },
  '1219': { name: 'Finance', items: [{ type: 't1', date: '2026-10-09', time: '17:30' }, { type: 't2', date: '2026-11-13', time: '17:30' }, { type: 'exame', date: '2026-12-11', time: '14:30' }, { type: 'recurso', date: '2027-01-08', time: '13:30' }] },
  '1220': { name: 'Marketing', items: [{ type: 'exame', date: '2026-12-15', time: '17:30' }, { type: 'recurso', date: '2027-01-06', time: '16:00' }] },
  '1221': { name: 'Operations Management', items: [{ type: 't1', date: '2026-10-30', time: '17:30' }, { type: 'exame', date: '2026-12-15', time: '14:30' }, { type: 'recurso', date: '2027-01-12', time: '18:30' }] },
  '1222': { name: 'Organizational Behaviour', items: [{ type: 'exame', date: '2026-12-11', time: '08:30' }, { type: 'recurso', date: '2027-01-06', time: '11:00' }] },
  '1223': { name: 'Strategy', items: [{ type: 'exame', date: '2026-12-17', time: '11:30' }, { type: 'recurso', date: '2027-01-08', time: '11:00' }] },
  '1224': { name: 'Information Systems', items: [{ type: 'exame', date: '2026-12-09', time: '14:30' }, { type: 'recurso', date: '2027-01-07', time: '08:30' }] },
  '1226': { name: 'Entrepreneurship', items: [{ type: 'exame', date: '2026-12-21', time: '17:30' }, { type: 'recurso', date: '2027-01-05', time: '18:30' }] },
  '1227': { name: 'International Management', items: [{ type: 'exame', date: '2026-12-15', time: '17:30' }, { type: 'recurso', date: '2027-01-07', time: '13:30' }] },
  '1228': { name: 'Global Business Environment', items: [{ type: 'exame', date: '2026-12-18', time: '08:30' }, { type: 'recurso', date: '2027-01-09', time: '18:30' }] },
  '1229': { name: 'Business Seminar', items: [{ type: 'exame', date: '2026-12-14', time: '08:30' }, { type: 'recurso', date: '2027-01-12', time: '13:30' }] },
  '1233': { name: 'Financial Markets', term: 'T1', items: [{ type: 'exame', date: '2026-10-20', time: '17:30' }, { type: 'recurso', date: '2027-01-08', time: '18:30' }] },
  '1234_T1': { name: 'Business Principles (T1)', items: [{ type: 'exame', date: '2026-10-19', time: '14:30' }, { type: 'recurso', date: '2027-01-05', time: '18:30' }] },
  '1234_T2': { name: 'Business Principles (T2)', items: [{ type: 'exame', date: '2026-12-07', time: '08:30' }, { type: 'recurso', date: '2027-01-05', time: '18:30' }] },
  '1309': { name: 'Calculus I', items: [{ type: 't1', date: '2026-10-10', time: '11:30' }, { type: 't2', date: '2026-11-14', time: '09:30' }, { type: 'exame', date: '2026-12-12', time: '11:30' }, { type: 'recurso', date: '2027-01-05', time: '11:00' }] },
  '1310': { name: 'Calculus II', items: [{ type: 't1', date: '2026-09-28', time: '17:30' }, { type: 't2', date: '2026-11-07', time: '09:30' }, { type: 'exame', date: '2026-12-12', time: '14:30' }, { type: 'recurso', date: '2027-01-07', time: '16:00' }] },
  '1311': { name: 'Linear Algebra with Programming', items: [{ type: 't1', date: '2026-10-03', time: '09:30' }, { type: 't2', date: '2026-11-21', time: '09:30' }, { type: 'exame', date: '2026-12-16', time: '08:30' }, { type: 'recurso', date: '2027-01-09', time: '08:30' }] },
  '1312': { name: 'Data Analysis and Probability', items: [{ type: 't1', date: '2026-10-17', time: '11:30' }, { type: 't2', date: '2026-11-16', time: '17:30' }, { type: 'exame', date: '2026-12-15', time: '08:30' }, { type: 'recurso', date: '2027-01-09', time: '13:30' }] },
  '1313': { name: 'Statistics for Economics and Management', items: [{ type: 't1', date: '2026-10-02', time: '17:30' }, { type: 'exame', date: '2026-12-17', time: '14:30' }, { type: 'recurso', date: '2027-01-07', time: '18:30' }] },
  '1314': { name: 'Econometrics', items: [{ type: 't1', date: '2026-10-14', time: '14:30' }, { type: 'exame', date: '2026-12-09', time: '17:30' }, { type: 'recurso', date: '2027-01-05', time: '11:00' }] },
  '1318': { name: 'Computer Programming', items: [{ type: 't1', date: '2026-10-14', time: '08:30' }, { type: 'exame', date: '2026-12-21', time: '11:30' }, { type: 'recurso', date: '2027-01-11', time: '16:00' }] },
  '1463_T1': { name: 'Ethics (T1)', items: [{ type: 'exame', date: '2026-10-20', time: '14:30' }, { type: 'recurso', date: '2027-01-05', time: '08:30' }] },
  '1463_T2': { name: 'Ethics (T2)', items: [{ type: 'exame', date: '2026-12-07', time: '17:30' }, { type: 'recurso', date: '2027-01-05', time: '08:30' }] },
  '1464_T1': { name: 'Law in Economics and Business (T1)', items: [{ type: 't1', date: '2026-09-21', time: '17:30' }, { type: 'exame', date: '2026-10-15', time: '17:30' }, { type: 'recurso', date: '2027-01-05', time: '13:30' }] },
  '1464_T2': { name: 'Law in Economics and Business (T2)', items: [{ type: 't1', date: '2026-11-09', time: '17:30' }, { type: 'exame', date: '2026-12-07', time: '11:30' }, { type: 'recurso', date: '2027-01-05', time: '13:30' }] },
  '1465_T1': { name: 'Introduction to Modern and Contemporary History (T1)', items: [{ type: 'exame', date: '2026-10-14', time: '17:30' }, { type: 'recurso', date: '2027-01-11', time: '11:00' }] },
  '1465_T2': { name: 'Introduction to Modern and Contemporary History (T2)', items: [{ type: 'exame', date: '2026-12-10', time: '11:30' }, { type: 'recurso', date: '2027-01-11', time: '11:00' }] },
  '1466': { name: 'Managing Impactful Projects', items: [] },
  '1467': { name: 'European Law', items: [{ type: 'mid', date: '2026-10-06', time: '17:00' }, { type: 'exame', date: '2026-12-16', time: '17:30' }, { type: 'recurso', date: '2027-01-11', time: '08:30' }] },
  '1469_T1': { name: 'Human Behaviour and Decision Making (T1)', items: [{ type: 'exame', date: '2026-10-19', time: '08:30' }, { type: 'recurso', date: '2027-01-08', time: '18:30' }] },
  '1469_T2': { name: 'Human Behaviour and Decision Making (T2)', items: [{ type: 'exame', date: '2026-12-07', time: '14:30' }, { type: 'recurso', date: '2027-01-08', time: '18:30' }] },
  '1471': { name: 'Careers with Impact', items: [] },
  '1600': { name: 'Communication', items: [] },
}

export const EXAM_TYPE_PT = { mid: 'Miniteste', t1: '1º Teste', t2: '2º Teste', apr: 'Apresentação', exame: 'Exame', recurso: 'Recurso' }

function fmt(iso) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_PT[m - 1]}`
}

export function renderExams() {
  return Object.values(EXAMS).map((c) => {
    if (!c.items.length) return `${c.name} — sem exame/teste`
    const list = c.items.map((i) => `${EXAM_TYPE_PT[i.type]} ${fmt(i.date)} ${i.time}`).join(' · ')
    return `${c.name} — ${list}`
  }).join('\n')
}

// Exames a chegar das cadeiras do aluno (por código, respeitando T1/T2), a partir de hoje.
export function upcomingExams(courses, now = new Date()) {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const out = []
  for (const c of courses || []) {
    if (!c.code) continue
    const code = String(c.code)
    let keys = []
    if (EXAMS[code]) keys = [code]
    else if (c.term && EXAMS[`${code}_T${c.term}`]) keys = [`${code}_T${c.term}`]
    else keys = [`${code}_T1`, `${code}_T2`].filter((k) => EXAMS[k])
    for (const k of keys) {
      for (const it of EXAMS[k].items) {
        const [y, m, d] = it.date.split('-').map(Number)
        const when = new Date(y, m - 1, d)
        if (when >= todayStart) {
          out.push({ course: c.name, type: it.type, typeLabel: EXAM_TYPE_PT[it.type], date: it.date, time: it.time, when })
        }
      }
    }
  }
  out.sort((a, b) => a.when - b.when || (a.time > b.time ? 1 : -1))
  return out
}
