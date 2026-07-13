# Nova SBE Organizer — Guia de Arranque 🚀

App pessoal para organizares a tua vida na Nova SBE: **horário**, **prazos**, **notas (0–20)** e **tarefas**. Funciona no telemóvel (podes instalar no ecrã principal) e sincroniza entre dispositivos.

Stack: React + Vite + Tailwind + Supabase (login + base de dados) + Vercel (deploy). O mesmo que o teu projeto Champi.

---

## Passo 1 — Criar a base de dados (Supabase) · ~3 min

1. Vai a **https://supabase.com** e cria conta (gratuito).
2. Clica **New project**. Dá-lhe um nome (ex: `nova-sbe`) e uma password para a base de dados (guarda-a). Escolhe a região **Europe (Frankfurt / Ireland)**.
3. Espera ~1 min até o projeto ficar pronto.
4. No menu lateral vai a **SQL Editor** → **New query**.
5. Abre o ficheiro [`supabase/schema.sql`](supabase/schema.sql) deste projeto, copia **tudo**, cola no editor e clica **Run**. Deve aparecer *Success*.
6. No menu vai a **Project Settings** (roda dentada) → **API**. Copia dois valores:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public** (em *Project API keys*) → começa por `eyJ...`

---

## Passo 2 — Ligar a app à base de dados · ~1 min

1. Neste projeto, faz uma cópia do ficheiro `.env.example` com o nome `.env.local`.
2. Preenche com os valores do passo anterior:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Corre a app localmente:

   ```bash
   npm install
   npm run dev
   ```

   Abre **http://localhost:5173**, cria conta com o teu email, e entra. 🎉

> **Confirmação de email:** por defeito o Supabase pede confirmação por email.
> Para uso pessoal podes desligar em **Authentication → Providers → Email → "Confirm email" (off)**,
> ou simplesmente clicar no link que chega ao teu email.

---

## Passo 2.5 — Ativar o Cláudio (assistente) · ~2 min

O **Cláudio** é o assistente dentro da app (ajuda a escolher cadeiras sem sobreposição de horário e explica o site). Usa o modelo **Claude (Anthropic)**, por isso precisa de uma chave de API.

1. Vai a **https://console.anthropic.com** → cria conta → **API Keys** → cria uma chave (`sk-ant-...`).
2. No teu `.env.local`, adiciona a linha (repara: **sem** `VITE_` — a chave fica só no servidor, nunca no browser):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. **Reinicia** o `npm run dev` (para carregar a chave) e abre o separador **Cláudio**.

> Sem esta chave, a app funciona toda na mesma — só o separador Cláudio é que mostra um aviso.
> Nota: a API da Anthropic é paga por utilização (tens algum crédito grátis inicial).

---

## Passo 3 — Pôr online (Vercel) · ~3 min

1. Cria um repositório no GitHub e faz push deste projeto.
2. Vai a **https://vercel.com** → **Add New → Project** → importa o repositório.
3. A Vercel deteta Vite automaticamente. Antes de *Deploy*, em **Environment Variables** adiciona:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (para o Cláudio funcionar online)
4. Clica **Deploy**. Em ~1 min tens o link (ex: `nova-sbe.vercel.app`).

A partir daqui, cada `git push` para a branch principal faz deploy automático — igual ao Champi.

---

## Passo 4 — Instalar no iPhone 📱

1. Abre o link da Vercel no **Safari**.
2. Toca no botão **Partilhar** → **Adicionar ao ecrã principal**.
3. Fica com ícone próprio e abre em ecrã inteiro, como uma app nativa.

---

## Comandos úteis

| Comando            | O que faz                                  |
| ------------------ | ------------------------------------------ |
| `npm run dev`      | Corre localmente (http://localhost:5173)   |
| `npm run build`    | Build de produção para a pasta `dist/`     |
| `npm run preview`  | Pré-visualiza o build de produção          |
| `npm run icons`    | Regenera os ícones da app a partir do SVG  |

---

## Dúvidas frequentes

- **Os meus dados são privados?** Sim. Cada conta só vê os seus próprios dados (Row Level Security ativada no schema).
- **Perco os dados se mudar de telemóvel?** Não — está tudo na cloud (Supabase), basta fazer login.
- **É grátis?** Sim, dentro dos planos gratuitos do Supabase e da Vercel (mais que suficiente para uso pessoal).
