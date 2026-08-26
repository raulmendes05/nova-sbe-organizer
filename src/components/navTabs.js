// Separadores de navegação, partilhados pela barra inferior (telemóvel)
// e pela barra lateral (computador). `key` é a chave de tradução (src/i18n).
export const NAV_TABS = [
  { to: '/', icon: 'home', key: 'nav.home', end: true },
  { to: '/horario', icon: 'calendar', key: 'nav.schedule' },
  { to: '/prazos', icon: 'clipboard', key: 'nav.deadlines' },
  { to: '/notas', icon: 'chart', key: 'nav.grades' },
  { to: '/tarefas', icon: 'note', key: 'nav.tasks' },
  { to: '/provas', icon: 'archive', key: 'nav.exams' },
  { to: '/claudio', icon: 'spark', key: 'nav.claudio' },
]

// O Perfil fica à parte: no computador vai para o fundo da barra lateral, e no
// telemóvel entra pelo cabeçalho do Início — a barra inferior já leva 7 e um
// oitavo separador deixaria os rótulos ilegíveis.
export const PROFILE_TAB = { to: '/perfil', icon: 'user', key: 'nav.profile' }
