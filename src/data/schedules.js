// ============================================================
//  Horários S1 26/27 (Nova SBE) — ficheiro oficial "T&TP schedules".
//  d: dia (1=Seg,2=Ter,3=Qua,4=Qui,5=Sex)  s/e: inicio/fim  t: T1|T2|S1
//  t = T1/T2 -> corre só nessa metade do semestre (T1 e T2 nao colidem entre si)
//  flexible: cadeira com muitos turnos TP -> o aluno escolhe um para evitar choques
// ============================================================

export const DAY_PT = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex' }

export const SCHEDULES = {
  // ---- Obrigatórias / nucleares ----
  '1117': { name: 'Principles of Microeconomics', sessions: [
    { g: 'TXA', d: 2, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TXA', d: 3, s: '09:30', e: '11:00', t: 'S1' },
    { g: 'TXB', d: 2, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXB', d: 3, s: '11:00', e: '12:30', t: 'S1' },
  ] },
  '1118': { name: 'Principles of Macroeconomics', sessions: [
    { g: 'TXA', d: 3, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TXA', d: 5, s: '11:00', e: '12:30', t: 'S1' },
    { g: 'TXB', d: 3, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXB', d: 5, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1119': { name: 'Microeconomics', sessions: [
    { g: 'TXA', d: 2, s: '17:00', e: '18:30', t: 'S1' }, { g: 'TXA', d: 3, s: '18:30', e: '20:00', t: 'S1' },
    { g: 'TXB', d: 2, s: '15:30', e: '17:00', t: 'S1' }, { g: 'TXB', d: 3, s: '17:00', e: '18:30', t: 'S1' },
  ] },
  '1120': { name: 'Macroeconomics', sessions: [
    { g: 'TXA', d: 2, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TXB', d: 2, s: '15:30', e: '17:00', t: 'S1' },
  ] },
  '1121': { name: 'Seminar in European Economics', sessions: [
    { g: 'TXA', d: 2, s: '18:30', e: '20:00', t: 'S1' }, { g: 'TXA', d: 4, s: '17:00', e: '18:30', t: 'S1' },
  ] },
  '1123': { name: 'Development Economics', sessions: [
    { g: 'TXA', d: 3, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXA', d: 5, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1124': { name: 'Economic History', sessions: [
    { g: 'TPA', d: 2, s: '15:30', e: '16:30', t: 'T1' }, { g: 'TPA', d: 4, s: '15:30', e: '16:30', t: 'T1' },
    { g: 'TPB', d: 2, s: '14:00', e: '15:00', t: 'T1' }, { g: 'TPB', d: 4, s: '14:00', e: '15:00', t: 'T1' },
    { g: 'TPC', d: 2, s: '17:00', e: '18:00', t: 'T1' }, { g: 'TPC', d: 4, s: '17:00', e: '18:00', t: 'T1' },
  ] },
  '1125': { name: 'Advanced Microeconomics', sessions: [
    { g: 'TXA', d: 1, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXA', d: 4, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1126': { name: 'Industrial Organization', sessions: [
    { g: 'TXA', d: 2, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXA', d: 5, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1129': { name: 'Public Economics', sessions: [
    { g: 'TXA', d: 1, s: '15:30', e: '17:00', t: 'S1' }, { g: 'TXA', d: 4, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1130': { name: 'Behavioural Economics', sessions: [
    { g: 'TPA', d: 1, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TPA', d: 3, s: '15:30', e: '17:00', t: 'S1' },
  ] },
  '1133': { name: 'International Macroeconomics', sessions: [
    { g: 'TXA', d: 1, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXA', d: 3, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1134': { name: 'International Trade', sessions: [
    { g: 'TXA', d: 2, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TXA', d: 5, s: '11:00', e: '12:30', t: 'S1' },
  ] },
  '1217': { name: 'Financial Accounting', sessions: [
    { g: 'TXA', d: 2, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXA', d: 5, s: '11:00', e: '12:30', t: 'S1' },
    { g: 'TXB', d: 2, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TXB', d: 5, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1218': { name: 'Management Accounting', sessions: [
    { g: 'TXA', d: 1, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TXB', d: 1, s: '15:30', e: '17:00', t: 'S1' },
  ] },
  '1219': { name: 'Finance', sessions: [
    { g: 'TXA', d: 3, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXA', d: 4, s: '17:00', e: '18:30', t: 'S1' },
    { g: 'TXB', d: 3, s: '15:30', e: '17:00', t: 'S1' }, { g: 'TXB', d: 4, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1220': { name: 'Marketing', sessions: [
    { g: 'TXA', d: 2, s: '14:00', e: '17:00', t: 'S1' },
  ] },
  '1221': { name: 'Operations Management', sessions: [
    { g: 'TXA', d: 2, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXA', d: 4, s: '15:30', e: '17:00', t: 'S1' },
    { g: 'TXB', d: 2, s: '17:00', e: '18:30', t: 'S1' }, { g: 'TXB', d: 4, s: '17:00', e: '18:30', t: 'S1' },
  ] },
  '1222': { name: 'Organizational Behaviour', sessions: [
    { g: 'TXA', d: 1, s: '08:00', e: '11:00', t: 'S1' },
  ] },
  '1223': { name: 'Strategy', sessions: [
    { g: 'TXA', d: 5, s: '08:00', e: '11:00', t: 'S1' },
  ] },
  '1224': { name: 'Information Systems', sessions: [
    { g: 'TXA', d: 3, s: '08:00', e: '09:30', t: 'S1' }, { g: 'TXA', d: 4, s: '08:00', e: '09:30', t: 'S1' },
  ] },
  '1226': { name: 'Entrepreneurship', sessions: [
    { g: 'TXA', d: 2, s: '08:00', e: '09:30', t: 'S1' }, { g: 'TXA', d: 4, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1227': { name: 'International Management', sessions: [
    { g: 'TXA', d: 2, s: '15:30', e: '17:00', t: 'S1' }, { g: 'TXA', d: 3, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TXB', d: 2, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXB', d: 3, s: '15:30', e: '17:00', t: 'S1' },
  ] },
  '1228': { name: 'Global Business Environment', sessions: [
    { g: 'TXA', d: 1, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TXA', d: 5, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1229': { name: 'Business Seminar', sessions: [
    { g: 'TXA', d: 4, s: '14:00', e: '17:00', t: 'S1' },
  ] },
  '1233': { name: 'Financial Markets', sessions: [
    { g: 'TPA', d: 3, s: '08:00', e: '09:30', t: 'T1' }, { g: 'TPA', d: 5, s: '15:30', e: '17:00', t: 'T1' },
  ] },
  '1313': { name: 'Statistics for Economics and Management', sessions: [
    { g: 'TXA', d: 1, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TXA', d: 3, s: '17:00', e: '18:30', t: 'S1' },
    { g: 'TXB', d: 1, s: '15:30', e: '17:00', t: 'S1' }, { g: 'TXB', d: 3, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1314': { name: 'Econometrics', sessions: [
    { g: 'TXA', d: 2, s: '17:00', e: '18:30', t: 'S1' }, { g: 'TXA', d: 3, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1466': { name: 'Managing Impactful Projects', sessions: [
    { g: 'TPA', d: 3, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TPB', d: 3, s: '15:30', e: '17:00', t: 'S1' },
    { g: 'TPC', d: 3, s: '17:00', e: '18:30', t: 'S1' },
  ] },
  '1467': { name: 'European Law', sessions: [
    { g: 'TXA', d: 2, s: '17:00', e: '18:30', t: 'S1' }, { g: 'TXA', d: 4, s: '18:30', e: '20:00', t: 'S1' },
  ] },

  // ---- Cadeiras com muitos turnos (flexíveis: o aluno escolhe um turno) ----
  '1312': { name: 'Data Analysis and Probability', flexible: true, sessions: [
    { g: 'TPD', d: 3, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TPD', d: 5, s: '09:30', e: '11:00', t: 'S1' },
    { g: 'TPA', d: 2, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TPA', d: 5, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TPB', d: 2, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TPB', d: 4, s: '14:00', e: '15:30', t: 'S1' },
    { g: 'TPC', d: 3, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TPC', d: 5, s: '14:00', e: '15:30', t: 'S1' },
  ] },
  '1318': { name: 'Computer Programming', flexible: true, sessions: [
    { g: 'TPG', d: 1, s: '09:30', e: '12:30', t: 'S1' },
    { g: 'TPD', d: 1, s: '17:00', e: '20:00', t: 'S1' },
    { g: 'TPE', d: 4, s: '14:00', e: '17:00', t: 'S1' }, { g: 'TPF', d: 4, s: '14:00', e: '17:00', t: 'S1' },
    { g: 'TPA', d: 4, s: '17:00', e: '20:00', t: 'S1' }, { g: 'TPB', d: 4, s: '17:00', e: '20:00', t: 'S1' }, { g: 'TPC', d: 4, s: '17:00', e: '20:00', t: 'S1' },
  ] },
  '1600': { name: 'Communication', flexible: true, note: '3 ECTS, 1 sessão de 3h/semana, muitos turnos', sessions: [
    { g: 'TPA', d: 2, s: '09:30', e: '12:30', t: 'S1' }, { g: 'TPB', d: 2, s: '09:30', e: '12:30', t: 'S1' },
    { g: 'TPC', d: 3, s: '09:30', e: '12:30', t: 'S1' }, { g: 'TPG', d: 3, s: '09:30', e: '12:30', t: 'S1' },
    { g: 'TPE', d: 2, s: '17:00', e: '20:00', t: 'S1' }, { g: 'TPF', d: 2, s: '17:00', e: '20:00', t: 'S1' },
    { g: 'TPH', d: 3, s: '17:00', e: '20:00', t: 'S1' }, { g: 'TPI', d: 3, s: '17:00', e: '20:00', t: 'S1' },
    { g: 'TPD', d: 4, s: '17:00', e: '20:00', t: 'S1' }, { g: 'TPJ', d: 4, s: '17:00', e: '20:00', t: 'S1' },
  ] },
  '1465': { name: 'Introduction to Modern and Contemporary History', flexible: true, sessions: [
    { g: 'TPA', d: 2, s: '14:00', e: '15:30', t: 'T1' }, { g: 'TPA', d: 4, s: '14:00', e: '15:30', t: 'T1' },
    { g: 'TPB', d: 2, s: '17:00', e: '18:30', t: 'T1' }, { g: 'TPB', d: 4, s: '15:30', e: '17:00', t: 'T1' },
    { g: 'TPC', d: 2, s: '15:30', e: '17:00', t: 'T2' }, { g: 'TPC', d: 4, s: '15:30', e: '17:00', t: 'T2' },
  ] },
  '1469': { name: 'Human Behaviour and Decision Making', flexible: true, sessions: [
    { g: 'TPC', d: 2, s: '08:00', e: '11:00', t: 'T2' }, { g: 'TPF', d: 3, s: '08:00', e: '11:00', t: 'T1' },
    { g: 'TPD', d: 4, s: '08:00', e: '11:00', t: 'T2' }, { g: 'TPE', d: 5, s: '08:00', e: '11:00', t: 'T1' },
    { g: 'TPB', d: 2, s: '14:00', e: '17:00', t: 'T2' }, { g: 'TPH', d: 3, s: '14:00', e: '17:00', t: 'T1' },
    { g: 'TPA', d: 4, s: '14:00', e: '17:00', t: 'T2' }, { g: 'TPG', d: 4, s: '14:00', e: '17:00', t: 'T1' },
    { g: 'TPI', d: 5, s: '14:00', e: '17:00', t: 'T2' },
  ] },
  '1463': { name: 'Ethics', flexible: true, note: 'muitos turnos T1/T2, Ter e Qui', sessions: [
    { g: 'TPB', d: 2, s: '14:00', e: '15:30', t: 'T1' }, { g: 'TPB', d: 4, s: '14:00', e: '15:30', t: 'T1' },
    { g: 'TPG', d: 2, s: '14:00', e: '15:30', t: 'T2' }, { g: 'TPG', d: 4, s: '14:00', e: '15:30', t: 'T2' },
    { g: 'TPA', d: 2, s: '15:30', e: '17:00', t: 'T1' }, { g: 'TPA', d: 4, s: '15:30', e: '17:00', t: 'T1' },
    { g: 'TPC', d: 2, s: '15:30', e: '17:00', t: 'T2' }, { g: 'TPC', d: 4, s: '15:30', e: '17:00', t: 'T2' },
    { g: 'TPD', d: 2, s: '15:30', e: '17:00', t: 'T2' }, { g: 'TPD', d: 4, s: '15:30', e: '17:00', t: 'T2' },
    { g: 'TPF', d: 2, s: '17:00', e: '18:30', t: 'T2' }, { g: 'TPF', d: 4, s: '17:00', e: '18:30', t: 'T2' },
    { g: 'TPE', d: 2, s: '18:30', e: '20:00', t: 'T1' }, { g: 'TPE', d: 4, s: '16:00', e: '17:00', t: 'T1' },
  ] },
  '1464': { name: 'Law in Economics and Business', flexible: true, note: 'muitos turnos T1/T2', sessions: [
    { g: 'TPB', d: 3, s: '14:00', e: '15:30', t: 'T1' }, { g: 'TPB', d: 2, s: '18:30', e: '20:00', t: 'T1' },
    { g: 'TPC', d: 3, s: '17:00', e: '18:30', t: 'T2' }, { g: 'TPC', d: 4, s: '14:00', e: '15:30', t: 'T2' },
    { g: 'TPD', d: 4, s: '15:30', e: '17:00', t: 'T2' }, { g: 'TPD', d: 2, s: '18:30', e: '20:00', t: 'T2' },
    { g: 'TPA', d: 4, s: '17:00', e: '18:30', t: 'T1' }, { g: 'TPA', d: 3, s: '18:30', e: '20:00', t: 'T1' },
  ] },
  '1234': { name: 'Business Principles', flexible: true, note: 'só para NOVOS alunos (2026/27+); alunos atuais ficam isentos (waiver)', sessions: [
    { g: 'TPC', d: 2, s: '08:30', e: '11:00', t: 'T1' }, { g: 'TPF', d: 2, s: '08:30', e: '11:00', t: 'T2' },
    { g: 'TPD', d: 4, s: '08:30', e: '11:00', t: 'T1' }, { g: 'TPE', d: 4, s: '08:30', e: '11:00', t: 'T2' },
    { g: 'TPB', d: 2, s: '14:00', e: '17:00', t: 'T1' }, { g: 'TPH', d: 2, s: '14:00', e: '17:00', t: 'T2' },
    { g: 'TPA', d: 3, s: '14:00', e: '17:00', t: 'T1' }, { g: 'TPG', d: 4, s: '14:00', e: '17:00', t: 'T2' },
  ] },
  '1309': { name: 'Calculus I', flexible: true, note: '1º ano, ~15 turnos TP em Ter/Qua/Sex (08:00–15:30) — muita flexibilidade', sessions: [] },
  '1310': { name: 'Calculus II', flexible: true, note: '1º ano, turnos em Ter/Sex de manhã e início da tarde', sessions: [
    { g: 'TPApt', d: 2, s: '09:30', e: '11:00', t: 'S1' }, { g: 'TPApt', d: 5, s: '09:30', e: '11:00', t: 'S1' },
    { g: 'TPB', d: 2, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TPB', d: 5, s: '11:00', e: '12:30', t: 'S1' },
    { g: 'TPD', d: 2, s: '11:00', e: '12:30', t: 'S1' }, { g: 'TPD', d: 5, s: '11:00', e: '12:30', t: 'S1' },
    { g: 'TPCpt', d: 2, s: '14:00', e: '15:30', t: 'S1' }, { g: 'TPCpt', d: 5, s: '09:30', e: '11:00', t: 'S1' },
  ] },
  '1311': { name: 'Linear Algebra with Programming', flexible: true, note: '1º ano, ~15 turnos TP em Ter/Qua/Sex (08:00–15:30) — muita flexibilidade', sessions: [] },
}

const hhmm = (t) => t

export function renderSchedules() {
  return Object.entries(SCHEDULES).map(([code, c]) => {
    if (!c.sessions.length) return `${code} ${c.name}: ${c.note || 'sem blocos'}`
    // Agrupar por turno
    const byGroup = {}
    for (const s of c.sessions) {
      const key = `${s.g}${s.t !== 'S1' ? ` (${s.t})` : ''}`
      ;(byGroup[key] ||= []).push(`${DAY_PT[s.d]} ${hhmm(s.s)}-${hhmm(s.e)}`)
    }
    const groups = Object.entries(byGroup).map(([g, times]) => `${g}: ${times.join(', ')}`).join(' | ')
    const flag = c.flexible ? ' [vários turnos]' : ''
    const note = c.note ? ` (${c.note})` : ''
    return `${code} ${c.name}${flag}${note} — ${groups}`
  }).join('\n')
}
