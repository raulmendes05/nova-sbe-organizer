// ============================================================
//  Plano de estudos Nova SBE — Management & Economics BSc
//  Fonte: Transition Plan 26/27 (Nov 2025).
//  area: 'mandatory' | 'area' | 'general' | 'additional'
//  ECTS conforme o novo plano curricular 26/27.
// ============================================================

const ADDITIONAL = [
  { code: '1490', name: 'Long Curricular Internship', ects: 7 },
  { code: '1492', name: 'Short Curricular Internship', ects: 3.5 },
  { code: '7036', name: 'Sustainability for All', ects: 3 },
]

export const PROGRAMS = {
  management: {
    label: 'Management',
    minArea: 7, // min. ECTS em eletivas de area
    mandatory: [
      { code: '1117', name: 'Principles of Microeconomics', ects: 7 },
      { code: '1118', name: 'Principles of Macroeconomics', ects: 7 },
      { code: '1119', name: 'Microeconomics', ects: 7 },
      { code: '1217', name: 'Financial Accounting', ects: 7 },
      { code: '1218', name: 'Management Accounting', ects: 7 },
      { code: '1219', name: 'Finance', ects: 7 },
      { code: '1220', name: 'Marketing', ects: 7 },
      { code: '1221', name: 'Operations Management', ects: 7 },
      { code: '1222', name: 'Organizational Behaviour', ects: 7 },
      { code: '1223', name: 'Strategy', ects: 7 },
      { code: '1234', name: 'Business Principles', ects: 3.5 },
      { code: '1309', name: 'Calculus I', ects: 7 },
      { code: '1310', name: 'Calculus II', ects: 7 },
      { code: '1311', name: 'Linear Algebra with Programming', ects: 7 },
      { code: '1312', name: 'Data Analysis and Probability', ects: 7 },
      { code: '1313', name: 'Statistics for Economics and Management', ects: 7 },
      { code: '1318', name: 'Computer Programming', ects: 7 },
      { code: '1321', name: 'Data Handling: Excel', ects: 2 },
      { code: '1322', name: 'Data Handling: Data Tools', ects: 1 },
      { code: '1463', name: 'Ethics', ects: 3.5 },
      { code: '1464', name: 'Law in Business and Economics', ects: 3.5 },
      { code: '1469', name: 'Human Behaviour and Decision Making', ects: 3.5 },
      { code: '1471', name: 'Careers with Impact (I, II, III, IV)', ects: 4 },
      { code: '1600', name: 'Communication', ects: 3 },
    ],
    area: [
      { code: '1224', name: 'Information Systems', ects: 7 },
      { code: '1226', name: 'Entrepreneurship', ects: 7 },
      { code: '1227', name: 'International Management', ects: 7 },
      { code: '1228', name: 'Global Business Environment', ects: 7 },
      { code: '1229', name: 'Business Seminar', ects: 7 },
      { code: '1232', name: 'Cultural Diversity Management', ects: 3 },
      { code: '1233', name: 'Financial Markets', ects: 3.5 },
      { code: '1466', name: 'Managing Impactful Projects', ects: 4 },
    ],
    general: [
      { code: '1120', name: 'Macroeconomics', ects: 7 },
      { code: '1121', name: 'Seminar in European Economics', ects: 7 },
      { code: '1123', name: 'Development Economics', ects: 7 },
      { code: '1124', name: 'Economic History', ects: 3.5 },
      { code: '1125', name: 'Advanced Microeconomics', ects: 7 },
      { code: '1126', name: 'Industrial Organization', ects: 7 },
      { code: '1129', name: 'Public Economics', ects: 7 },
      { code: '1130', name: 'Behavioral Economics', ects: 3.5 },
      { code: '1131', name: 'Environment and Natural Resources Economics', ects: 3.5 },
      { code: '1132', name: 'History of Economic Thought', ects: 3.5 },
      { code: '1133', name: 'International Macroeconomics', ects: 7 },
      { code: '1134', name: 'International Trade', ects: 7 },
      { code: '1136', name: 'Economic History of Portuguese Speaking Countries', ects: 3 },
      { code: '1137', name: 'Macroeconomic Policies', ects: 3.5 },
      { code: '1314', name: 'Econometrics', ects: 7 },
      { code: '1319', name: 'Multivariate Statistics', ects: 7 },
      { code: '1465', name: 'Introduction to Modern and Contemporary History', ects: 3.5 },
      { code: '1467', name: 'European Law', ects: 7 },
      { code: '1472', name: 'Business Law', ects: 3.5 },
    ],
    additional: ADDITIONAL,
  },

  economics: {
    label: 'Economics',
    minArea: 28,
    mandatory: [
      { code: '1117', name: 'Principles of Microeconomics', ects: 7 },
      { code: '1118', name: 'Principles of Macroeconomics', ects: 7 },
      { code: '1119', name: 'Microeconomics', ects: 7 },
      { code: '1120', name: 'Macroeconomics', ects: 7 },
      { code: '1121', name: 'Seminar in European Economy', ects: 7 },
      { code: '1124', name: 'Economic History', ects: 3.5 },
      { code: '1125', name: 'Advanced Microeconomics', ects: 7 },
      { code: '1217', name: 'Financial Accounting', ects: 7 },
      { code: '1219', name: 'Finance', ects: 7 },
      { code: '1234', name: 'Business Principles', ects: 3.5 },
      { code: '1309', name: 'Calculus I', ects: 7 },
      { code: '1310', name: 'Calculus II', ects: 7 },
      { code: '1311', name: 'Linear Algebra with Programming', ects: 7 },
      { code: '1312', name: 'Data Analysis and Probability', ects: 7 },
      { code: '1313', name: 'Statistics for Economics and Management', ects: 7 },
      { code: '1314', name: 'Econometrics', ects: 7 },
      { code: '1318', name: 'Computer Programming', ects: 7 },
      { code: '1321', name: 'Data Handling: Excel', ects: 2 },
      { code: '1322', name: 'Data Handling: Data Tools', ects: 1 },
      { code: '1463', name: 'Ethics', ects: 3.5 },
      { code: '1465', name: 'Introduction to Modern and Contemporary History', ects: 3.5 },
      { code: '1469', name: 'Human Behaviour and Decision Making', ects: 3.5 },
      { code: '1471', name: 'Careers with Impact (I, II, III, IV)', ects: 4 },
      { code: '1600', name: 'Communication', ects: 3 },
    ],
    area: [
      { code: '1123', name: 'Development Economics', ects: 7 },
      { code: '1126', name: 'Industrial Organization', ects: 7 },
      { code: '1129', name: 'Public Economics', ects: 7 },
      { code: '1130', name: 'Behavioral Economics', ects: 3.5 },
      { code: '1131', name: 'Environment and Natural Resources Economics', ects: 3.5 },
      { code: '1132', name: 'History of Economic Thought', ects: 3.5 },
      { code: '1133', name: 'International Macroeconomics', ects: 7 },
      { code: '1134', name: 'International Trade', ects: 7 },
      { code: '1135', name: 'Research in Economics - Project', ects: 7 },
      { code: '1136', name: 'Economic History of Portuguese Speaking Countries', ects: 3 },
      { code: '1137', name: 'Macroeconomic Policies', ects: 3.5 },
      { code: '1233', name: 'Financial Markets', ects: 3.5 },
    ],
    general: [
      { code: '1218', name: 'Management Accounting', ects: 7 },
      { code: '1220', name: 'Marketing', ects: 7 },
      { code: '1221', name: 'Operations Management', ects: 7 },
      { code: '1222', name: 'Organizational Behavior', ects: 7 },
      { code: '1223', name: 'Strategy', ects: 7 },
      { code: '1224', name: 'Information Systems', ects: 7 },
      { code: '1226', name: 'Entrepreneurship', ects: 7 },
      { code: '1227', name: 'International Management', ects: 7 },
      { code: '1228', name: 'Global Business Environment', ects: 7 },
      { code: '1229', name: 'Business Seminar', ects: 7 },
      { code: '1232', name: 'Cultural Diversity Management', ects: 3 },
      { code: '1319', name: 'Multivariate Statistics', ects: 7 },
      { code: '1464', name: 'Law in Economics and Business', ects: 3.5 },
      { code: '1466', name: 'Managing Impactful Projects', ects: 4 },
      { code: '1467', name: 'European Law', ects: 7 },
      { code: '1472', name: 'Business Law', ects: 3.5 },
    ],
    additional: ADDITIONAL,
  },
}

export const AREA_LABELS = {
  mandatory: 'Obrigatórias',
  area: 'Eletivas de área',
  general: 'Eletivas gerais',
  additional: 'Cadeiras adicionais',
}

// Cadeiras nucleares do 1o ano (comuns a Management e Economics).
// Usadas para auto-preencher quando o aluno ja concluiu o 1o ano.
export const FIRST_YEAR_CODES = [
  '1117', // Principles of Microeconomics (Intro to Micro)
  '1118', // Principles of Macroeconomics (Intro to Macro)
  '1217', // Financial Accounting
  '1309', // Calculus I
  '1310', // Calculus II
  '1311', // Linear Algebra with Programming
  '1312', // Data Analysis and Probability
  '1465', // Introduction to Modern and Contemporary History
  '1469', // Human Behaviour and Decision Making
]

export function firstYearCourses(programKey = 'management') {
  const byCode = Object.fromEntries(flatCatalog(programKey).map((c) => [c.code, c]))
  return FIRST_YEAR_CODES.map((code) => byCode[code]).filter(Boolean)
}

// Lista plana de um curso, com a área anexada a cada cadeira
export function flatCatalog(programKey) {
  const p = PROGRAMS[programKey]
  if (!p) return []
  return [
    ...p.mandatory.map((c) => ({ ...c, area: 'mandatory' })),
    ...p.area.map((c) => ({ ...c, area: 'area' })),
    ...p.general.map((c) => ({ ...c, area: 'general' })),
    ...p.additional.map((c) => ({ ...c, area: 'additional' })),
  ]
}
