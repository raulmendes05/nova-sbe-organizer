# Nova SBE Organizer 🎓

App pessoal (PWA) para organizar a vida académica na **Nova SBE**:

- 📅 **Horário** — os teus blocos de aulas por dia da semana
- 📋 **Prazos** — trabalhos, testes e exames com contagem decrescente
- 📊 **Notas** — componentes de avaliação e média ponderada por ECTS (escala 0–20)
- 📝 **Notas & Tarefas** — apontamentos rápidos e checklist

Feito para telemóvel (instalável no ecrã principal), com sincronização na cloud entre dispositivos.

## Stack

React 18 · Vite 5 · Tailwind CSS · Supabase (Auth + Postgres) · vite-plugin-pwa · deploy na Vercel.

## Arranque rápido

Segue o **[SETUP.md](SETUP.md)** — cria o projeto Supabase, liga as variáveis de ambiente e faz deploy. Em resumo:

```bash
npm install
cp .env.example .env.local   # e preenche com as tuas credenciais Supabase
npm run dev
```

## Estrutura

```
src/
  context/     AuthContext, CoursesContext
  lib/         supabase client, useCollection (CRUD), helpers (datas, médias)
  components/  ui (icones/modal/fab), BottomNav, Layout, CourseSelect
  pages/       Home, Schedule, Assignments, Grades, Notes, Login
supabase/
  schema.sql   tabelas + Row Level Security
```
