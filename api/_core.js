// ============================================================
//  Cláudio — núcleo do assistente (partilhado dev + produção)
//  Modelo: claude-opus-4-8 via SDK oficial @anthropic-ai/sdk.
// ============================================================
import { GoogleGenAI } from '@google/genai'
import { PROGRAMS } from '../src/data/curriculum.js'
import { renderSchedules } from '../src/data/schedules.js'
import { renderExams } from '../src/data/exams.js'

const MODEL = 'gemini-flash-latest'

// Interruptor do Cláudio. A false, não faz NENHUMA chamada à API (custo zero).
const CLAUDIO_ENABLED = true

// Ferramentas que o Cláudio pode usar para AGIR na app (executadas no cliente).
const TOOLS = [
  {
    name: 'criar_tarefa',
    description: 'Cria uma tarefa (to-do) no separador "Notas & Tarefas". Usa quando o utilizador pede para adicionar/criar uma tarefa, lembrete ou coisa a fazer.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'O que precisa de ser feito' },
        detalhes: { type: 'string', description: 'Detalhes opcionais' },
        cadeira: { type: 'string', description: 'Nome ou código da cadeira associada (opcional)' },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'criar_nota',
    description: 'Cria uma nota/apontamento (NÃO é tarefa) no separador "Notas & Tarefas".',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string' },
        texto: { type: 'string', description: 'Conteúdo da nota' },
        cadeira: { type: 'string' },
      },
      required: ['texto'],
    },
  },
  {
    name: 'criar_prazo',
    description: 'Cria um prazo (trabalho, teste, exame, apresentação) no separador "Prazos".',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string' },
        tipo: { type: 'string', enum: ['trabalho', 'exame', 'teste', 'apresentacao', 'outro'] },
        data: { type: 'string', description: 'Data-limite em ISO: YYYY-MM-DD ou YYYY-MM-DDTHH:mm' },
        cadeira: { type: 'string' },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'adicionar_aula',
    description: 'Adiciona um bloco de aula ao "Horário" semanal.',
    input_schema: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Ex.: "Marketing — Teórica"' },
        dia: { type: 'integer', description: '1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 7=Domingo' },
        inicio: { type: 'string', description: 'Hora de início HH:mm' },
        fim: { type: 'string', description: 'Hora de fim HH:mm' },
        sala: { type: 'string' },
        tipo: { type: 'string', enum: ['aula', 'pratica', 'seminario', 'outro'] },
        cadeira: { type: 'string' },
      },
      required: ['titulo', 'dia', 'inicio', 'fim'],
    },
  },
  {
    name: 'editar_aula',
    description: 'Altera um bloco de aula existente no Horário (muda hora, dia, sala, nome ou tipo). Identifica a aula pelo `id` (que vem no contexto do horário) ou, em alternativa, pelo título e/ou dia.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'id da aula (do contexto), se souberes' },
        titulo: { type: 'string', description: 'título atual da aula, para a encontrar' },
        dia: { type: 'integer', description: 'dia atual (1-7) para desambiguar' },
        novo_titulo: { type: 'string' },
        novo_dia: { type: 'integer', description: 'novo dia 1-7' },
        inicio: { type: 'string', description: 'nova hora de início HH:mm' },
        fim: { type: 'string', description: 'nova hora de fim HH:mm' },
        sala: { type: 'string' },
        tipo: { type: 'string', enum: ['aula', 'pratica', 'seminario', 'outro'] },
      },
    },
  },
  {
    name: 'remover_aula',
    description: 'Remove/elimina um bloco de aula do Horário. Identifica pelo `id` (do contexto) ou pelo título e/ou dia.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        titulo: { type: 'string' },
        dia: { type: 'integer' },
      },
    },
  },
  {
    name: 'simular_nota',
    description: 'Calcula que nota é precisa nas componentes que faltam de uma cadeira para PASSAR (9,5) e/ou para atingir um objetivo. Usa SEMPRE esta ferramenta para perguntas do tipo "que nota preciso no exame?", "quanto preciso para passar/para ter 16?". Não faças a conta de cabeça.',
    input_schema: {
      type: 'object',
      properties: {
        cadeira: { type: 'string', description: 'Nome ou código da cadeira' },
        objetivo: { type: 'number', description: 'Nota objetivo 0-20 (opcional; se não for dada, calcula só para passar)' },
      },
      required: ['cadeira'],
    },
  },
  {
    name: 'criar_cadeira',
    description: 'Adiciona uma cadeira à lista de "Notas". Podes usar o código do catálogo Nova SBE (preenche ECTS).',
    input_schema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        codigo: { type: 'string' },
        ects: { type: 'number' },
        ano: { type: 'integer', description: 'Ano do curso: 1, 2 ou 3' },
        semestre: { type: 'integer', description: 'Semestre: 1 ou 2' },
      },
      required: ['nome'],
    },
  },
]

function curriculumSummary() {
  return Object.entries(PROGRAMS).map(([key, p]) => {
    const line = (c) => `${c.code} ${c.name} (${c.ects})`
    return [
      `## ${p.label} (min. ${p.minArea} ECTS eletivas de área)`,
      `Obrigatórias: ${p.mandatory.map(line).join('; ')}`,
      `Eletivas de área: ${p.area.map(line).join('; ')}`,
      `Eletivas gerais: ${p.general.map(line).join('; ')}`,
    ].join('\n')
  }).join('\n\n')
}

function buildSystemPrompt(context = {}) {
  const ctx = JSON.stringify(context ?? {}, null, 2)
  return `És o **Cláudio**, o assistente pessoal dentro da app "Nova SBE Organizer" — uma app onde o estudante organiza a vida académica na Nova School of Business and Economics (Nova SBE). Falas **português de Portugal (pt-PT)**, de forma amigável, direta e concisa. Usas markdown simples (listas, negrito). Não inventas factos; se não souberes, dizes.

# A tua função
1. **Escolha de cadeiras sem sobreposição de horário.** O maior objetivo: ajudar o estudante a decidir que cadeiras fazer no próximo semestre de forma a que as aulas **não se sobreponham**. O estudante vai colar/enviar os horários das cadeiras (dias e horas) e, mais tarde, as datas dos exames. Quando tiveres esses horários, analisa-os cuidadosamente, deteta conflitos (mesma faixa horária no mesmo dia) e recomenda combinações viáveis. Considera também o equilíbrio de ECTS e as regras do curso. Se ainda não tiveres os horários, pede-os.
2. **Explicar a app e ajudar a usá-la** (ver secção "A app" abaixo).
3. **Aconselhar sobre o plano de estudos e a transição 26/27** (ver secção abaixo).
4. **Agir na app**: podes criar, alterar e eliminar coisas na conta do utilizador usando as ferramentas — criar_tarefa, criar_nota, criar_prazo, adicionar_aula, editar_aula, remover_aula, criar_cadeira. Usa-as sempre que o utilizador pedir (ex.: "cria uma tarefa", "mete Marketing à terça às 14h", "muda a aula de Finance para as 15h", "apaga a aula de Marketing de terça"). Para **alterar/eliminar aulas** do horário, identifica a aula pelo contexto (usa o id do horário quando possível, ou o título/dia); se houver mais do que uma aula parecida, pergunta qual antes de agir. Depois de executar, confirma em 1 frase curta. Não inventes que fizeste algo sem chamar a ferramenta.
5. **Simular notas**: para perguntas do tipo "que nota preciso no exame?", "quanto preciso para passar?", "o que me falta para ter 16 em X?", usa a ferramenta **simular_nota** (é determinística e não erra a conta). Depois explica o resultado em linguagem natural. Se a cadeira não tiver componentes com pesos, diz ao aluno que precisa de os adicionar primeiro (nas Notas → Detalhar por componentes).

# A app (o que existe e como se usa)
- **Início**: dashboard com média global (0–20, ponderada por ECTS), nº de cadeiras, prazos abertos, aulas de hoje e próximos prazos.
- **Horário**: blocos de aulas por dia da semana (nome, horas, sala, tipo).
- **Prazos**: trabalhos/testes/exames com contagem decrescente e separadores "Por fazer"/"Concluídos".
- **Notas**: escala **0–20**. Cada cadeira tem uma **nota final** (principal) e, opcionalmente, **componentes** de avaliação com pesos (média ponderada). As cadeiras estão agrupadas por **ano e semestre** (dropdowns), e há um separador **Equivalências** para cadeiras creditadas de outra universidade (contam para a média e ECTS). Adicionam-se cadeiras pelo **Catálogo Nova SBE** (pesquisa por nome/código, preenche ECTS automaticamente).
- **Notas & Tarefas**: apontamentos e checklist.
- No **primeiro login** a app pergunta nome, ano e semestre; quem já fez o 1º ano pode pré-carregar as 9 cadeiras nucleares do 1º ano.

# Plano de estudos e Transição 26/27 (factos-chave)
- Novo plano entra em vigor no **outono de 2026**. Alunos atuais ("ongoing") ficam cobertos por um **plano de transição desenhado para os beneficiar** — nada os prejudica.
- Total do curso: **180 ECTS** (máx. 195), ~30 ECTS/semestre, 3 anos. O 1º ano é **comum** a Management e Economics.
- **Management**: abre-se mais espaço para eletivas de gestão. Passam de obrigatórias a **eletivas** (podem à mesma ser feitas): **Macroeconomics, Introduction to Modern and Contemporary History, Managing Impactful Projects (MIP), Multivariate Statistics e Econometrics**. É preciso um **mínimo de ~20,5 ECTS em eletivas de gestão** e há espaço para um máximo de **7 ECTS** de "opção livre" (ex.: línguas, cadeiras em intercâmbio).
- **Nova cadeira obrigatória "Business Principles" (3,5 ECTS)** é só para **novos** alunos (inscritos em 2026/27+). Alunos atuais ficam **isentos (waiver)** se aprovarem uma de: **Introduction to Modern and Contemporary History**, **Managing Impactful Projects**, **BCG Case Challenge** ou **Principles of Management** (economia: MIP ou Principles of Management). *Nota:* uma cadeira usada como waiver de Business Principles **não conta** para os ECTS das eletivas; e o BCG Case Challenge, se usado como waiver, não dá equivalência a MIP.
- **Communication (3 ECTS)** substitui **Communication & Leadership (4 ECTS)**: quem já fez a antiga mantém os 4 ECTS e a nota e fica isento. **Data Handling** muda ligeiramente de ECTS; quem já passou mantém os créditos.
- **Economics**: mudanças mínimas; **Introduction to Modern and Contemporary History continua obrigatória** em Economics (por isso não serve de waiver como em Management). MIP deixa de ser obrigatória.
- O nº de eletivas **não é um alvo fixo**: resulta por diferença entre os 180 ECTS totais e as obrigatórias — o que interessa é cumprir todas as obrigatórias + os mínimos de eletivas e chegar a 180.

# Catálogo do curso (código nome (ECTS))
${curriculumSummary()}

# Horários S1 26/27 (ficheiro oficial "T&TP schedules")
Formato: "código Nome — TURNO: Dia hh:mm-hh:mm, ...". Cada turno (ex.: TXA, TPB) é uma alternativa; o aluno frequenta UM turno por cadeira.
${renderSchedules()}

## Regras para detetar sobreposições (MUITO IMPORTANTE)
- Duas aulas só colidem se forem no **mesmo dia**, com **horas que se cruzam**, **E** no mesmo período do semestre.
- **T1 e T2 são as duas metades do semestre**: uma aula marcada (T1) NÃO colide com uma (T2), mesmo à mesma hora/dia. Cadeiras "S1" correm o semestre inteiro e podem colidir com T1 e com T2.
- Cadeiras com **[vários turnos]** são flexíveis: se houver choque, sugere trocar de turno em vez de descartar a cadeira. Diz qual o turno que evita o conflito.
- Estes são os blocos **T&TP** do ficheiro oficial. Algumas cadeiras podem ter aulas teóricas plenárias adicionais não listadas — se um horário parecer demasiado curto para os ECTS, assinala a incerteza em vez de afirmares "sem conflito" com certeza absoluta.
- Ao recomendar cadeiras para o semestre, verifica par a par as sobreposições e apresenta uma combinação viável (com os turnos escolhidos) e os ECTS totais. Lembra-te das regras do curso (Management: mín. ~20,5 ECTS eletivas de gestão; total 30 ECTS/semestre).

## Como montar um horário (fluxo obrigatório)
Quando o aluno pedir para montares/organizares o horário (ou escolher turnos), **primeiro faz algumas perguntas de preferências** antes de propor seja o que for. Pergunta de forma breve (lista curta, tudo de uma vez):
1. Prefere aulas de **manhã** ou de **tarde** (ou tanto faz)?
2. Se de manhã, **a partir de que horas** quer começar (ex.: não antes das 9h)?
3. Se de tarde, **até que horas** quer no máximo (ex.: nada depois das 18h)?
4. Há algum **dia** em que preferia **não ter aulas**?
Espera pela resposta antes de montar. (Se o aluno já tiver dado estas preferências, não voltes a perguntar — usa-as.)

Depois, ao montar o horário, respeita SEMPRE estas regras:
- **Aulas seguidas:** minimiza os "buracos" no dia — evita ter uma aula às 8h e a seguinte só às 14h. Tenta blocos contíguos.
- **Hora de almoço:** deixa **sempre 12:30–14:00 livre** (não marques aulas nesse intervalo).
- Respeita as preferências de manhã/tarde, horas-limite e dia(s) livre(s) que o aluno indicou.
- Escolhe os **turnos** (TXA/TXB/TP…) que melhor cumprem estas regras e que não se sobrepõem.
- No fim, apresenta o horário organizado por dia (Seg→Sex, com horas), lista os turnos escolhidos e os ECTS totais, e nota qualquer preferência que não tenha sido possível cumprir (e porquê).

# Calendário de exames S1 26/27 (ficheiro oficial)
Formato: "Nome — Tipo dd mmm hh:mm · ...". "Exame" = época normal; "Recurso" = época de recurso; T1/T2 = testes intercalares.
${renderExams()}

## Considerar exames ao escolher cadeiras
- Além das aulas, verifica também os **exames**: duas cadeiras com **exame final no mesmo dia** (ainda pior, à mesma hora) são um problema — avisa o aluno.
- Ao recomendar uma combinação de cadeiras, mostra as **datas dos exames finais** de cada uma e assinala se ficam muito juntas (ex.: dois no mesmo dia ou em dias seguidos).
- As datas de exames podem depender do período (T1/T2) da cadeira. Usa a linha correta.

# Contexto atual do estudante (dados reais da app)
\`\`\`json
${ctx}
\`\`\`
Usa este contexto para dares respostas personalizadas (média, cadeiras já feitas, horário atual, prazos). Se algo não estiver no contexto, pede ou assume com cuidado e diz que assumiste.`
}

// ---- Tradução do formato (contrato do cliente = estilo Anthropic) para o Gemini ----

// Ferramentas Anthropic -> functionDeclarations do Gemini
function geminiTools() {
  return [{
    functionDeclarations: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.input_schema,
    })),
  }]
}

// Mensagens (estilo Anthropic) -> contents do Gemini (role user/model, parts)
function geminiContents(messages) {
  const idToName = {}
  const contents = []
  for (const m of messages) {
    if (m.role === 'assistant') {
      const blocks = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content || '') }]
      const parts = []
      for (const b of blocks) {
        if (b.type === 'text' && b.text) parts.push({ text: b.text })
        else if (b.type === 'tool_use') {
          idToName[b.id] = b.name
          parts.push({ functionCall: { name: b.name, args: b.input || {} } })
        }
      }
      if (parts.length) contents.push({ role: 'model', parts })
    } else {
      // user
      if (typeof m.content === 'string') {
        contents.push({ role: 'user', parts: [{ text: m.content }] })
      } else if (Array.isArray(m.content)) {
        const parts = m.content
          .filter((b) => b.type === 'tool_result')
          .map((b) => ({
            functionResponse: {
              name: idToName[b.tool_use_id] || 'tool',
              response: { result: typeof b.content === 'string' ? b.content : JSON.stringify(b.content) },
            },
          }))
        if (parts.length) contents.push({ role: 'user', parts })
      }
    }
  }
  return contents
}

export async function runClaudio({ messages, context, apiKey }) {
  // Desativado: não chama a API (custo zero).
  if (!CLAUDIO_ENABLED) {
    return {
      content: [{ type: 'text', text: 'O Cláudio está desativado de momento. 🔒' }],
      stop_reason: 'end_turn',
    }
  }
  if (!apiKey) throw new Error('Falta a GEMINI_API_KEY.')

  const clean = (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
  if (!clean.length) throw new Error('Sem mensagens.')

  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: geminiContents(clean),
    config: {
      systemInstruction: buildSystemPrompt(context),
      tools: geminiTools(),
      maxOutputTokens: 4096,
    },
  })

  // Extrai texto sem usar o getter .text (evita aviso quando há functionCall)
  const parts = response.candidates?.[0]?.content?.parts || []
  const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('').trim()

  // Resposta do Gemini -> blocos estilo Anthropic (o cliente já sabe lidar)
  const calls = response.functionCalls || []
  if (calls.length) {
    const content = []
    if (text) content.push({ type: 'text', text })
    calls.forEach((c, i) => {
      content.push({ type: 'tool_use', id: `call_${i}_${clean.length}`, name: c.name, input: c.args || {} })
    })
    return { content, stop_reason: 'tool_use' }
  }
  return { content: [{ type: 'text', text: text || '(sem resposta)' }], stop_reason: 'end_turn' }
}
