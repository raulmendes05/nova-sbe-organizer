// Gera um ficheiro iCalendar (.ics) com as aulas do semestre, prontas a
// importar para o Google Calendar ou o Calendário (Apple).
//
// Em vez de eventos semanais "cegos", percorre o CALENDÁRIO ACADÉMICO dia a
// dia e cria um evento por cada aula que realmente acontece: salta pausas,
// feriados e o verão, e nos dias de compensação usa o dia da semana certo.
// Os blocos com marca de meio-semestre no título — "(T1)"/"(T2)" — só entram
// na metade a que pertencem.
import { PERIODS, dayStatus, dowOf } from '../data/calendar.js'

// Europe/Lisbon com a regra de mudança de hora da UE — para as horas ficarem
// certas quer em outubro (WEST, +1) quer depois da mudança (WET, +0).
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Lisbon',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0000',
  'TZOFFSETTO:+0100',
  'TZNAME:WEST',
  'DTSTART:19700329T010000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0000',
  'TZNAME:WET',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

const pad = (n) => String(n).padStart(2, '0')
const hhmmss = (t) => {
  const [h, m, s] = String(t || '').split(':')
  return `${pad(h || 0)}${pad(m || 0)}${pad(s || 0)}`
}
const stampFrom = (iso, time) => `${iso.replace(/-/g, '')}T${hhmmss(time)}`

// Escapa vírgulas, pontos-e-vírgula, barras e quebras de linha (RFC 5545).
const esc = (s) => String(s || '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

// Dobra linhas com mais de 75 octetos (continuação começa por espaço).
function fold(line) {
  if (line.length <= 75) return line
  const out = []
  let s = line
  while (s.length > 75) { out.push(s.slice(0, 75)); s = ' ' + s.slice(75) }
  out.push(s)
  return out.join('\r\n')
}

// Adiciona um dia a uma data ISO (YYYY-MM-DD), sem problemas de fuso.
function nextISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

const termOf = (title) => (String(title).match(/\((T[1-4])\)/i)?.[1] || '').toUpperCase()

/**
 * @param blocks  linhas de schedule_blocks (day_of_week, start_time, end_time, title, location, id)
 * @param opts    { semester: 1|2, name, dtstamp, deadlines }
 *                `deadlines` sao linhas de assignments — vao para o mesmo
 *                ficheiro, para o calendario do telemovel mostrar as aulas e
 *                as entregas lado a lado.
 * @returns { text, count, deadlineCount }
 */
export function buildICS(blocks, { semester = 1, name = 'Horário Nova SBE', dtstamp, deadlines = [] } = {}) {
  const halves = Number(semester) === 2 ? ['T3', 'T4'] : ['T1', 'T2']
  const p1 = PERIODS.find((p) => p.key === halves[0])
  const p2 = PERIODS.find((p) => p.key === halves[1])
  if (!p1 || !p2 || (!blocks?.length && !deadlines?.length)) return { text: '', count: 0, deadlineCount: 0 }

  const stamp = dtstamp || new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const events = []

  for (let iso = p1.start; iso <= p2.end; iso = nextISO(iso)) {
    const st = dayStatus(iso)
    let periodKey = null
    let weekday = null
    if (st.type === 'classes') { periodKey = st.key; weekday = dowOf(iso) }
    else if (st.type === 'makeup') {
      weekday = st.sourceWeekday
      periodKey = PERIODS.find((p) => p.kind === 'classes' && iso >= p.start && iso <= p.end)?.key
    } else continue
    if (!periodKey || !halves.includes(periodKey)) continue

    for (const b of blocks) {
      if (b.day_of_week !== weekday) continue
      // marca de meio-semestre: só filtra se for uma das metades deste semestre
      const term = termOf(b.title)
      if (term && halves.includes(term) && term !== periodKey) continue

      const uid = `${b.id}-${iso}@nova-sbe-organizer`
      const ev = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Lisbon:${stampFrom(iso, b.start_time)}`,
        `DTEND;TZID=Europe/Lisbon:${stampFrom(iso, b.end_time)}`,
        `SUMMARY:${esc(b.title)}`,
      ]
      if (b.location) ev.push(`LOCATION:${esc(b.location)}`)
      ev.push('END:VEVENT')
      events.push(...ev)
    }
  }

  const count = events.filter((l) => l === 'BEGIN:VEVENT').length

  // Prazos: um evento de meia hora à hora da entrega. A data vem do fuso do
  // telemóvel (é assim que foi escrita no Prazos), por isso lê-se do Date local.
  let deadlineCount = 0
  for (const a of deadlines || []) {
    const d = a?.due_date ? new Date(a.due_date) : null
    if (!d || isNaN(d.getTime())) continue
    const fim = new Date(d.getTime() + 30 * 60000)
    const isoDe = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
    const horaDe = (x) => `${pad(x.getHours())}:${pad(x.getMinutes())}`
    events.push(
      'BEGIN:VEVENT',
      `UID:prazo-${a.id}@nova-sbe-organizer`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Lisbon:${stampFrom(isoDe(d), horaDe(d))}`,
      `DTEND;TZID=Europe/Lisbon:${stampFrom(isoDe(fim), horaDe(fim))}`,
      `SUMMARY:${esc(a.title)}`,
      'END:VEVENT',
    )
    deadlineCount++
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nova SBE Organizer//Horario//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-TIMEZONE:Europe/Lisbon',
    ...VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ]
  return { text: lines.map(fold).join('\r\n') + '\r\n', count, deadlineCount }
}
