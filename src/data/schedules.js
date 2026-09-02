// ============================================================
//  Horários S1 26/27 (Nova SBE) — ficheiro oficial
//  "Bachelor schedules Course Units Eco&Man" (v. 31/08/2026 — a versao
//  que ja traz as salas; a de 21/07 ainda nao as tinha).
//  Extraído do PDF pela POSIÇÃO de cada bloco na grelha, por isso
//  inclui as aulas PRÁTICAS (P###A/B) e não só as teóricas.
//
//  g: turno   k: 'T' teórica | 'P' prática | 'TP' teórico-prática
//  d: dia (1=Seg..5=Sex)   s/e: início/fim   t: S1 | T1 | T2   r: sala
//  t = T1/T2 -> corre só nessa metade do semestre (T1 e T2 não colidem)
//  O aluno frequenta UM turno de cada tipo (uma T + uma P, ou uma TP).
// ============================================================

export const DAY_PT = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex' }

export const SCHEDULES = {
  '1117': { name: 'Principles of Microeconomics', flexible: true, sessions: [
    { g: 'P113A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.10' },
    { g: 'P114A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.10' },
    { g: 'P115A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.02' },
    { g: 'P116A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.31' },
    { g: 'P117A', k: 'P', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.02' },
    { g: 'P118A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.31' },
    { g: 'P119B', k: 'P', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.02' },
    { g: 'P120B', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.27' },
    { g: 'P121B', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.09' },
    { g: 'P122B', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.31' },
    { g: 'P123B', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.09' },
    { g: 'TXA', k: 'T', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'D.1.39' },
  ] },
  '1118': { name: 'Principles of Macroeconomics', flexible: true, sessions: [
    { g: 'P101A', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.04' },
    { g: 'P102A', k: 'P', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.10' },
    { g: 'P103A', k: 'P', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.31' },
    { g: 'P104A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'D.-1.10' },
    { g: 'P105A', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.08' },
    { g: 'P106B', k: 'P', d: 2, s: '08:00', e: '09:30', t: 'S1', r: 'D.-1.05' },
    { g: 'P107B', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.10' },
    { g: 'P108B', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.10' },
    { g: 'P109B', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.04' },
    { g: 'P110B', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.10' },
    { g: 'P111B', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.07' },
    { g: 'TXA', k: 'T', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.37' },
  ] },
  '1119': { name: 'Microeconomics', flexible: true, sessions: [
    { g: 'P201A', k: 'P', d: 2, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.31' },
    { g: 'P202A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.08' },
    { g: 'P203A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.29' },
    { g: 'P204A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.31' },
    { g: 'P205B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.08' },
    { g: 'P206B', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.33' },
    { g: 'P207B', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.09' },
    { g: 'P208B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.29' },
    { g: 'TXA', k: 'T', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 3, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.37' },
  ] },
  '1120': { name: 'Macroeconomics', flexible: true, sessions: [
    { g: 'P302B', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.05' },
    { g: 'P303A', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.03' },
    { g: 'P304B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.05' },
    { g: 'P307A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.03' },
    { g: 'TXA', k: 'T', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.10' },
    { g: 'TXB', k: 'T', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.10' },
  ] },
  '1121': { name: 'Seminar in European Economics', sessions: [
    { g: 'P301A', k: 'P', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.03' },
    { g: 'P302A', k: 'P', d: 1, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.03' },
    { g: 'P303A', k: 'P', d: 1, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.03' },
    { g: 'TXA', k: 'T', d: 2, s: '18:30', e: '20:00', t: 'S1', r: 'B.0.10' },
    { g: 'TXA', k: 'T', d: 4, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.10' },
  ] },
  '1123': { name: 'Development Economics', sessions: [
    { g: 'P301A', k: 'P', d: 1, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.34' },
    { g: 'P302A', k: 'P', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.34' },
    { g: 'TXA', k: 'T', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.-1.13' },
    { g: 'TXA', k: 'T', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.09' },
  ] },
  '1124': { name: 'Economic History', sessions: [
    { g: 'TPA', k: 'TP', d: 2, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.03' },
    { g: 'TPA', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.02' },
    { g: 'TPB', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.03' },
    { g: 'TPB', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.02' },
    { g: 'TPC', k: 'TP', d: 2, s: '17:00', e: '18:30', t: 'T1', r: 'B.0.03' },
    { g: 'TPC', k: 'TP', d: 4, s: '17:00', e: '18:30', t: 'T1', r: 'B.0.02' },
  ] },
  '1125': { name: 'Advanced Microeconomics', sessions: [
    { g: 'P302A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.05' },
    { g: 'P303A', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.08' },
    { g: 'P304A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.08' },
    { g: 'TXA', k: 'T', d: 1, s: '11:00', e: '12:30', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.10' },
  ] },
  '1126': { name: 'Industrial Organization', sessions: [
    { g: 'P301A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.-1.10' },
    { g: 'P302A', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'D.-1.05' },
    { g: 'TXA', k: 'T', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.11' },
    { g: 'TXA', k: 'T', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.03' },
  ] },
  '1129': { name: 'Public Economics', sessions: [
    { g: 'P301A', k: 'P', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.08' },
    { g: 'P303A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.08' },
    { g: 'TXA', k: 'T', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.10' },
  ] },
  '1130': { name: 'Behavioral Economics', sessions: [
    { g: 'TPA', k: 'TP', d: 1, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.08' },
    { g: 'TPA', k: 'TP', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.09' },
  ] },
  '1133': { name: 'International Macroeconomics', sessions: [
    { g: 'P301A', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.08' },
    { g: 'P302A', k: 'P', d: 3, s: '18:30', e: '20:00', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.03' },
  ] },
  '1134': { name: 'International Trade', sessions: [
    { g: 'P301A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.02' },
    { g: 'P302A', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.05' },
    { g: 'P303A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'D.-1.13' },
    { g: 'TXA', k: 'T', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.0.09' },
  ] },
  '1217': { name: 'Financial Accounting', flexible: true, sessions: [
    { g: 'P113A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.08' },
    { g: 'P114A', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.32' },
    { g: 'P115A', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.08' },
    { g: 'P116A', k: 'P', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.07' },
    { g: 'P117A', k: 'P', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.08' },
    { g: 'P118A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.30' },
    { g: 'P119B', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.03' },
    { g: 'P120B', k: 'P', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.09' },
    { g: 'P121B', k: 'P', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.08' },
    { g: 'P122B', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.10' },
    { g: 'P123B', k: 'P', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.09' },
    { g: 'P124B', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.36' },
    { g: 'TXA', k: 'T', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXA', k: 'T', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'D.1.39' },
  ] },
  '1218': { name: 'Management Accounting', flexible: true, sessions: [
    { g: 'P210A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.30' },
    { g: 'P210A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.30' },
    { g: 'P211A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.10' },
    { g: 'P211A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.10' },
    { g: 'P212A', k: 'P', d: 1, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.31' },
    { g: 'P212A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.36' },
    { g: 'P213A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'D.0.07' },
    { g: 'P213A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.-1.14' },
    { g: 'P215A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.32' },
    { g: 'P215A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.32' },
    { g: 'P216B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.30' },
    { g: 'P216B', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.30' },
    { g: 'P217B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.31' },
    { g: 'P217B', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.36' },
    { g: 'P218B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.10' },
    { g: 'P218B', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'D.0.10' },
    { g: 'P221B', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.10' },
    { g: 'P221B', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.30' },
    { g: 'P222B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.32' },
    { g: 'P222B', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.32' },
    { g: 'TXA', k: 'T', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'D.1.39' },
  ] },
  '1219': { name: 'Finance', flexible: true, sessions: [
    { g: 'P210A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.30' },
    { g: 'P211A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.07' },
    { g: 'P212A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.31' },
    { g: 'P213A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.31' },
    { g: 'P214A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.32' },
    { g: 'P216B', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.32' },
    { g: 'P217B', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.30' },
    { g: 'P218B', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.07' },
    { g: 'P221B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.36' },
    { g: 'P222B', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.31' },
    { g: 'TXA', k: 'T', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXA', k: 'T', d: 4, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'D.1.39' },
  ] },
  '1220': { name: 'Marketing', flexible: true, sessions: [
    { g: 'P210A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.04' },
    { g: 'P211A', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'D.0.04' },
    { g: 'P212A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.05' },
    { g: 'P213A', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'D.0.05' },
    { g: 'P214A', k: 'P', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.05' },
    { g: 'P215A', k: 'P', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.04' },
    { g: 'TXA', k: 'T', d: 2, s: '14:00', e: '17:00', t: 'S1', r: 'D.1.39' },
  ] },
  '1221': { name: 'Operations Management', flexible: true, sessions: [
    { g: 'P216A', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.07' },
    { g: 'P217A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.08' },
    { g: 'P218A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'D.0.10' },
    { g: 'P219A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.07' },
    { g: 'P220A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.09' },
    { g: 'P221B', k: 'P', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.09' },
    { g: 'P222B', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.32' },
    { g: 'P223B', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.30' },
    { g: 'P224B', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'D.0.09' },
    { g: 'P225B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.09' },
    { g: 'TXA', k: 'T', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 4, s: '17:00', e: '18:30', t: 'S1', r: 'D.1.39' },
  ] },
  '1222': { name: 'Organizational Behaviour', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.29' },
    { g: 'P307A', k: 'P', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.30' },
    { g: 'P308A', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.30' },
    { g: 'P309A', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.07' },
    { g: 'P310A', k: 'P', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.07' },
    { g: 'TXA', k: 'T', d: 1, s: '08:00', e: '11:00', t: 'S1', r: 'D.1.39' },
  ] },
  '1223': { name: 'Strategy', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 2, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.29' },
    { g: 'P307A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.29' },
    { g: 'P308A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.27' },
    { g: 'P309A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.27' },
    { g: 'P310A', k: 'P', d: 2, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.27' },
    { g: 'TXA', k: 'T', d: 5, s: '08:00', e: '11:00', t: 'S1', r: 'D.1.39' },
  ] },
  '1224': { name: 'Information Systems', sessions: [
    { g: 'P306A', k: 'P', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.0.05' },
    { g: 'P309A', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.31' },
    { g: 'TXA', k: 'T', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.03' },
    { g: 'TXA', k: 'T', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'B.0.05' },
  ] },
  '1226': { name: 'Entrepreneurship', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 3, s: '18:30', e: '20:00', t: 'S1', r: 'D.0.04' },
    { g: 'P308A', k: 'P', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.05' },
    { g: 'P309A', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.04' },
    { g: 'P310A', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'D.0.05' },
    { g: 'TXA', k: 'T', d: 2, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.37' },
  ] },
  '1227': { name: 'International Management', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.29' },
    { g: 'P307A', k: 'P', d: 4, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.31' },
    { g: 'P309B', k: 'P', d: 3, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.29' },
    { g: 'P310B', k: 'P', d: 5, s: '15:30', e: '17:00', t: 'S1', r: 'D.1.34' },
    { g: 'TXA', k: 'T', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.08' },
    { g: 'TXA', k: 'T', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.08' },
    { g: 'TXB', k: 'T', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.08' },
    { g: 'TXB', k: 'T', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.0.08' },
  ] },
  '1228': { name: 'Global Business Environment', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 4, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.05' },
    { g: 'P307A', k: 'P', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'B.0.05' },
    { g: 'P309A', k: 'P', d: 2, s: '18:30', e: '20:00', t: 'S1', r: 'B.0.05' },
    { g: 'P310A', k: 'P', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.05' },
    { g: 'TXA', k: 'T', d: 1, s: '11:00', e: '12:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXA', k: 'T', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.37' },
  ] },
  '1229': { name: 'Business Seminar', flexible: true, sessions: [
    { g: 'P306A', k: 'P', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.05' },
    { g: 'P307A', k: 'P', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.05' },
    { g: 'P309A', k: 'P', d: 2, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.34' },
    { g: 'P310A', k: 'P', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.04' },
    { g: 'TXA', k: 'T', d: 4, s: '14:00', e: '17:00', t: 'S1', r: 'B.1.37' },
  ] },
  '1233': { name: 'Financial Markets', sessions: [
    { g: 'TPA', k: 'TP', d: 3, s: '08:00', e: '09:30', t: 'T1', r: 'B.0.10' },
    { g: 'TPA', k: 'TP', d: 5, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.08' },
  ] },
  '1234': { name: 'Business Principles', flexible: true, note: 'só para NOVOS alunos (2026/27+); alunos atuais ficam isentos (waiver)', sessions: [
    { g: 'TPA', k: 'TP', d: 3, s: '14:00', e: '17:00', t: 'T1', r: 'D.0.05' },
    { g: 'TPB', k: 'TP', d: 2, s: '14:00', e: '17:00', t: 'T1', r: 'D.0.04' },
    { g: 'TPC', k: 'TP', d: 2, s: '08:00', e: '11:00', t: 'T1', r: 'D.0.04' },
    { g: 'TPD', k: 'TP', d: 4, s: '08:00', e: '11:00', t: 'T1', r: 'D.0.04' },
    { g: 'TPE', k: 'TP', d: 4, s: '08:00', e: '11:00', t: 'T2', r: 'D.0.04' },
    { g: 'TPF', k: 'TP', d: 2, s: '08:00', e: '11:00', t: 'T2', r: 'D.0.04' },
    { g: 'TPG', k: 'TP', d: 4, s: '14:00', e: '17:00', t: 'T2', r: 'B.1.33' },
    { g: 'TPH', k: 'TP', d: 2, s: '14:00', e: '17:00', t: 'T2', r: 'D.0.04' },
  ] },
  '1309': { name: 'Calculus I', flexible: true, sessions: [
    { g: 'TPApt', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPApt', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.04' },
    { g: 'TPBpt', k: 'TP', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.31' },
    { g: 'TPBpt', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.04' },
    { g: 'TPC', k: 'TP', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPC', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.05' },
    { g: 'TPD', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.27' },
    { g: 'TPD', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.05' },
    { g: 'TPE', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.29' },
    { g: 'TPE', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPF', k: 'TP', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.36' },
    { g: 'TPF', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.10' },
    { g: 'TPGpt', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.31' },
    { g: 'TPGpt', k: 'TP', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.05' },
    { g: 'TPHpt', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPHpt', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.04' },
    { g: 'TPI', k: 'TP', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPI', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.29' },
    { g: 'TPJ', k: 'TP', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.30' },
    { g: 'TPJ', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.27' },
    { g: 'TPK', k: 'TP', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPK', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.05' },
    { g: 'TPL', k: 'TP', d: 3, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPL', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPM', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.30' },
    { g: 'TPM', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPNpt', k: 'TP', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPNpt', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.1.34' },
    { g: 'TPO', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.36' },
    { g: 'TPO', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.10' },
  ] },
  '1310': { name: 'Calculus II', flexible: true, sessions: [
    { g: 'TPApt', k: 'TP', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.27' },
    { g: 'TPApt', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.31' },
    { g: 'TPB', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.10' },
    { g: 'TPB', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.31' },
    { g: 'TPC', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.30' },
    { g: 'TPC', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.30' },
    { g: 'TPD', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.30' },
    { g: 'TPD', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.30' },
  ] },
  '1311': { name: 'Linear Algebra with Programming', flexible: true, sessions: [
    { g: 'TPApt', k: 'TP', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.29' },
    { g: 'TPApt', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.36' },
    { g: 'TPBpt', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPBpt', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.36' },
    { g: 'TPC', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPC', k: 'TP', d: 4, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.32' },
    { g: 'TPD', k: 'TP', d: 2, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.32' },
    { g: 'TPD', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPE', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.07' },
    { g: 'TPE', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.07' },
    { g: 'TPF', k: 'TP', d: 2, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.27' },
    { g: 'TPF', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'D.0.08' },
    { g: 'TPGpt', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.32' },
    { g: 'TPGpt', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPHpt', k: 'TP', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPHpt', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.32' },
    { g: 'TPI', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPI', k: 'TP', d: 4, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPJ', k: 'TP', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPJ', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPK', k: 'TP', d: 2, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.32' },
    { g: 'TPK', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.08' },
    { g: 'TPL', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.09' },
    { g: 'TPL', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.08' },
    { g: 'TPM', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.07' },
    { g: 'TPM', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.07' },
    { g: 'TPNpt', k: 'TP', d: 2, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPNpt', k: 'TP', d: 5, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.36' },
    { g: 'TPO', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.31' },
    { g: 'TPO', k: 'TP', d: 5, s: '08:00', e: '09:30', t: 'S1', r: 'B.1.32' },
  ] },
  '1312': { name: 'Data Analysis and Probability', flexible: true, sessions: [
    { g: 'TPA', k: 'TP', d: 2, s: '11:00', e: '12:30', t: 'S1', r: 'D.0.08' },
    { g: 'TPA', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPB', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.08' },
    { g: 'TPB', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.29' },
    { g: 'TPC', k: 'TP', d: 3, s: '11:00', e: '12:30', t: 'S1', r: 'B.1.36' },
    { g: 'TPC', k: 'TP', d: 5, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.30' },
    { g: 'TPD', k: 'TP', d: 3, s: '09:30', e: '11:00', t: 'S1', r: 'B.1.36' },
    { g: 'TPD', k: 'TP', d: 5, s: '09:30', e: '11:00', t: 'S1', r: 'D.0.07' },
  ] },
  '1313': { name: 'Statistics for Economics and Management', flexible: true, sessions: [
    { g: 'P201A', k: 'P', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.27' },
    { g: 'P202A', k: 'P', d: 4, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.31' },
    { g: 'P203A', k: 'P', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.31' },
    { g: 'P204A', k: 'P', d: 4, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.31' },
    { g: 'P205B', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.31' },
    { g: 'P206B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'D.0.07' },
    { g: 'P207B', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.27' },
    { g: 'P208B', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.29' },
    { g: 'TXA', k: 'T', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.37' },
    { g: 'TXA', k: 'T', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'D.1.39' },
    { g: 'TXB', k: 'T', d: 1, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.37' },
    { g: 'TXB', k: 'T', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.37' },
  ] },
  '1314': { name: 'Econometrics', sessions: [
    { g: 'P302A', k: 'P', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.27' },
    { g: 'P303A', k: 'P', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.27' },
    { g: 'P304A', k: 'P', d: 3, s: '18:30', e: '20:00', t: 'S1', r: 'B.1.27' },
    { g: 'TXA', k: 'T', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.10' },
    { g: 'TXA', k: 'T', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.09' },
  ] },
  '1318': { name: 'Computer Programming', flexible: true, sessions: [
    { g: 'TPA', k: 'TP', d: 4, s: '17:00', e: '20:00', t: 'S1', r: 'B.0.08' },
    { g: 'TPB', k: 'TP', d: 4, s: '17:00', e: '20:00', t: 'S1', r: 'B.0.04' },
    { g: 'TPC', k: 'TP', d: 4, s: '17:00', e: '20:00', t: 'S1', r: 'D.-1.12' },
    { g: 'TPD', k: 'TP', d: 2, s: '17:00', e: '20:00', t: 'S1', r: 'B.0.08' },
    { g: 'TPE', k: 'TP', d: 4, s: '14:00', e: '17:00', t: 'S1', r: 'D.-1.12' },
    { g: 'TPF', k: 'TP', d: 4, s: '14:00', e: '17:00', t: 'S1', r: 'B.1.36' },
    { g: 'TPG', k: 'TP', d: 1, s: '09:30', e: '12:30', t: 'S1', r: 'B.1.29' },
  ] },
  '1463': { name: 'Ethics', flexible: true, sessions: [
    { g: 'TPA', k: 'TP', d: 2, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.05' },
    { g: 'TPA', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.04' },
    { g: 'TPB', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.05' },
    { g: 'TPB', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.04' },
    { g: 'TPC', k: 'TP', d: 2, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.03' },
    { g: 'TPC', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.10' },
    { g: 'TPD', k: 'TP', d: 2, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.05' },
    { g: 'TPD', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.04' },
    { g: 'TPE', k: 'TP', d: 2, s: '18:30', e: '20:00', t: 'T1', r: 'B.0.03' },
    { g: 'TPE', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.10' },
    { g: 'TPF', k: 'TP', d: 2, s: '17:00', e: '18:30', t: 'T2', r: 'B.0.03' },
    { g: 'TPF', k: 'TP', d: 4, s: '17:00', e: '18:30', t: 'T2', r: 'B.0.02' },
    { g: 'TPG', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'T2', r: 'B.0.05' },
    { g: 'TPG', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'T2', r: 'B.0.04' },
  ] },
  '1464': { name: 'Law in Business and Economics', flexible: true, sessions: [
    { g: 'TPA', k: 'TP', d: 3, s: '18:30', e: '20:00', t: 'T1', r: 'B.0.11' },
    { g: 'TPA', k: 'TP', d: 4, s: '17:00', e: '18:30', t: 'T1', r: 'B.0.11' },
    { g: 'TPB', k: 'TP', d: 2, s: '18:30', e: '20:00', t: 'T1', r: 'B.0.11' },
    { g: 'TPB', k: 'TP', d: 3, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.11' },
    { g: 'TPC', k: 'TP', d: 3, s: '17:00', e: '18:30', t: 'T2', r: 'B.0.11' },
    { g: 'TPC', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'T2', r: 'B.0.11' },
    { g: 'TPD', k: 'TP', d: 2, s: '18:30', e: '20:00', t: 'T2', r: 'B.0.11' },
    { g: 'TPD', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.11' },
  ] },
  '1465': { name: 'Introduction to Modern and Contemporary History', sessions: [
    { g: 'TPA', k: 'TP', d: 2, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.02' },
    { g: 'TPA', k: 'TP', d: 4, s: '14:00', e: '15:30', t: 'T1', r: 'B.0.05' },
    { g: 'TPB', k: 'TP', d: 2, s: '17:00', e: '18:30', t: 'T1', r: 'B.0.02' },
    { g: 'TPB', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T1', r: 'B.0.05' },
    { g: 'TPC', k: 'TP', d: 2, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.02' },
    { g: 'TPC', k: 'TP', d: 4, s: '15:30', e: '17:00', t: 'T2', r: 'B.0.05' },
  ] },
  '1466': { name: 'Managing Impactful Projects', sessions: [
    { g: 'TPA', k: 'TP', d: 3, s: '14:00', e: '15:30', t: 'S1', r: 'B.1.34' },
    { g: 'TPB', k: 'TP', d: 3, s: '15:30', e: '17:00', t: 'S1', r: 'B.1.34' },
    { g: 'TPC', k: 'TP', d: 3, s: '17:00', e: '18:30', t: 'S1', r: 'B.1.34' },
  ] },
  '1467': { name: 'European Law', sessions: [
    { g: 'P301A', k: 'P', d: 1, s: '11:00', e: '12:30', t: 'S1', r: 'B.0.03' },
    { g: 'P306A', k: 'P', d: 1, s: '14:00', e: '15:30', t: 'S1', r: 'B.0.04' },
    { g: 'TXA', k: 'T', d: 2, s: '17:00', e: '18:30', t: 'S1', r: 'B.0.11' },
    { g: 'TXA', k: 'T', d: 4, s: '18:30', e: '20:00', t: 'S1', r: 'B.0.11' },
  ] },
  '1469': { name: 'Human Behaviour and Decision Making', flexible: true, sessions: [
    { g: 'TPA', k: 'TP', d: 3, s: '14:00', e: '17:00', t: 'T2', r: 'D.0.05' },
    { g: 'TPB', k: 'TP', d: 2, s: '14:00', e: '17:00', t: 'T2', r: 'B.1.33' },
    { g: 'TPC', k: 'TP', d: 2, s: '08:00', e: '11:00', t: 'T2', r: 'B.1.33' },
    { g: 'TPD', k: 'TP', d: 4, s: '08:00', e: '11:00', t: 'T2', r: 'B.1.33' },
    { g: 'TPE', k: 'TP', d: 4, s: '08:00', e: '11:00', t: 'T1', r: 'B.1.33' },
    { g: 'TPF', k: 'TP', d: 2, s: '08:00', e: '11:00', t: 'T1', r: 'B.1.33' },
    { g: 'TPG', k: 'TP', d: 4, s: '14:00', e: '17:00', t: 'T1', r: 'B.1.33' },
    { g: 'TPH', k: 'TP', d: 2, s: '14:00', e: '17:00', t: 'T1', r: 'B.1.33' },
    { g: 'TPI', k: 'TP', d: 5, s: '14:00', e: '17:00', t: 'T2', r: 'B.1.33' },
  ] },
  // Communication não é semanal: são 7 sessões de 3h em datas certas, de duas
  // em duas semanas, com sessões de compensação no fim (ficheiro oficial
  // "1600 Communication S1_2627 Class Calendar"). As datas mandam sobre o dia
  // da semana — ver `dates` mais abaixo.
  '1600': { name: 'Communication', flexible: true, note: '3 ECTS, 7 sessões de 3h em datas certas (quinzenal)', sessions: [
    { g: 'TPA', k: 'TP', d: 2, s: '09:30', e: '12:30', t: 'S1', r: 'B.1.34' },
    { g: 'TPB', k: 'TP', d: 2, s: '09:30', e: '12:30', t: 'S1', r: 'B.1.34' },
    { g: 'TPC', k: 'TP', d: 3, s: '09:30', e: '12:30', t: 'S1', r: 'B.1.33' },
    { g: 'TPD', k: 'TP', d: 4, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
    { g: 'TPE', k: 'TP', d: 2, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
    { g: 'TPF', k: 'TP', d: 2, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
    { g: 'TPG', k: 'TP', d: 3, s: '09:30', e: '12:30', t: 'S1', r: 'B.1.33' },
    { g: 'TPH', k: 'TP', d: 3, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
    { g: 'TPI', k: 'TP', d: 3, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
    { g: 'TPJ', k: 'TP', d: 4, s: '17:00', e: '20:00', t: 'S1', r: 'B.1.33' },
  ],
  // Datas de cada turno. Uma entrada com objeto é uma sessão de compensação
  // (mu), que pode cair noutro dia da semana e a outra hora.
  //  TPA/TPB e TPE/TPF: compensam 1 de dezembro (Restauração), na sexta 4.
  //  TPD/TPJ: compensam 29 de outubro (Conferências do Estoril), na quinta 3.
  dates: {
    TPA: ['2026-09-01', '2026-09-15', '2026-09-29', '2026-10-27', '2026-11-10', '2026-11-24',
      { date: '2026-12-04', s: '14:00', e: '17:00', mu: true }],
    TPB: ['2026-09-08', '2026-09-22', '2026-10-06', '2026-11-03', '2026-11-17', '2026-11-24',
      { date: '2026-12-04', s: '14:00', e: '17:00', mu: true }],
    TPC: ['2026-09-02', '2026-09-16', '2026-09-30', '2026-10-28', '2026-11-11', '2026-11-25', '2026-12-02'],
    TPD: ['2026-09-03', '2026-09-17', '2026-10-01', '2026-10-22', '2026-11-12', '2026-11-26',
      { date: '2026-12-03', s: '17:00', e: '20:00', mu: true }],
    TPE: ['2026-09-01', '2026-09-15', '2026-09-29', '2026-10-27', '2026-11-10', '2026-11-24',
      { date: '2026-12-04', s: '17:00', e: '20:00', mu: true }],
    TPF: ['2026-09-08', '2026-09-22', '2026-10-06', '2026-11-03', '2026-11-17', '2026-11-24',
      { date: '2026-12-04', s: '17:00', e: '20:00', mu: true }],
    TPG: ['2026-09-09', '2026-09-23', '2026-10-07', '2026-11-04', '2026-11-18', '2026-11-25', '2026-12-02'],
    TPH: ['2026-09-02', '2026-09-16', '2026-09-30', '2026-10-28', '2026-11-11', '2026-11-25', '2026-12-02'],
    TPI: ['2026-09-09', '2026-09-23', '2026-10-07', '2026-11-04', '2026-11-18', '2026-11-25', '2026-12-02'],
    TPJ: ['2026-09-10', '2026-09-24', '2026-10-08', '2026-11-05', '2026-11-19', '2026-11-26',
      { date: '2026-12-03', s: '17:00', e: '20:00', mu: true }],
  } },
}

/** Datas fixas de um turno (aulas quinzenais), ou null se corre todas as semanas. */
export function datesFor(code, turno) {
  const lista = SCHEDULES[String(code)]?.dates?.[turno]
  return lista?.length ? lista : null
}

/** A sessão de um turno com datas fixas num dia concreto, ou null. */
export function sessionOnDate(code, turno, iso) {
  const lista = datesFor(code, turno)
  if (!lista) return null
  const hit = lista.find((d) => (typeof d === 'string' ? d : d.date) === iso)
  if (!hit) return null
  return typeof hit === 'string' ? { date: hit } : hit
}

const KIND_PT = { T: 'Teóricas', P: 'Práticas', TP: 'Teórico-práticas' }

export function renderSchedules() {
  return Object.entries(SCHEDULES).map(([code, c]) => {
    if (!c.sessions.length) return `${code} ${c.name}: ${c.note || 'sem blocos'}`
    const byKind = {}
    for (const s of c.sessions) {
      const key = `${s.g}${s.t !== 'S1' ? ` (${s.t})` : ''}`
      ;((byKind[s.k] ||= {})[key] ||= []).push(`${DAY_PT[s.d]} ${s.s}-${s.e}${s.r ? ` ${s.r}` : ''}`)
    }
    const parts = ['T', 'P', 'TP'].filter((k) => byKind[k]).map((k) => {
      const turnos = Object.entries(byKind[k])
        .map(([g, times]) => `${g}: ${times.join(', ')}`).join(' | ')
      return `${KIND_PT[k]} — ${turnos}`
    })
    const flag = c.flexible ? ' [vários turnos]' : ''
    const note = c.note ? ` (${c.note})` : ''
    // Cadeiras que só têm aula em datas certas: sem isto, quem lê este resumo
    // (o Cláudio) diria que Communication é toda as semanas.
    if (c.dates) {
      const dm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`
      const linhas = Object.entries(c.dates).map(([g, lista]) => {
        const quando = lista.map((d) => (typeof d === 'string'
          ? dm(d)
          : `${dm(d.date)} ${DAY_PT[new Date(`${d.date}T12:00:00`).getDay()]} ${d.s}-${d.e}${d.mu ? ' compensação' : ''}`))
        return `${g}: ${quando.join(', ')}`
      })
      parts.push(`Só nestas datas (quinzenal) — ${linhas.join(' | ')}`)
    }
    return `${code} ${c.name}${flag}${note}\n   ${parts.join('\n   ')}`
  }).join('\n')
}
