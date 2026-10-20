-- ============================================================
--  Nova SBE Organizer — esquema da base de dados (Supabase)
--  Corre isto no SQL Editor do teu projeto Supabase.
--  Escala de notas: 0-20 (padrao portugues). Creditos: ECTS.
-- ============================================================

-- Extensao para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  CADEIRAS (courses)
-- ------------------------------------------------------------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  code        text,
  professor   text,
  ects        numeric default 6,
  semester    text,                         -- ex: "1o Semestre 2025/26"
  color       text default '#1f5aa3',
  final_grade numeric,                      -- nota final 0-20 (principal; null = sem nota)
  year        smallint,                     -- ano do curso: 1 | 2 | 3
  term        smallint,                     -- semestre: 1 | 2 (null = nao definido)
  is_equivalence boolean default false,     -- creditada de outra universidade
  created_at  timestamptz not null default now()
);

-- Migracao para bases de dados ja existentes:
alter table public.courses add column if not exists final_grade numeric;
alter table public.courses add column if not exists year smallint;
alter table public.courses add column if not exists term smallint;
alter table public.courses add column if not exists is_equivalence boolean default false;

-- ------------------------------------------------------------
--  HORARIO (schedule_blocks)  — blocos semanais recorrentes
-- ------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  title       text not null,                -- ex: "Microeconomia - Teorica"
  day_of_week smallint not null,            -- 1=Segunda ... 7=Domingo
  start_time  time not null,
  end_time    time not null,
  location    text,                         -- ex: "Sala C.017"
  kind        text default 'aula',          -- aula | pratica | seminario | outro
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  EXCECOES AO HORARIO (schedule_exceptions)
--
--  O horario e recorrente: "Micro, sexta, 17:00". Mas uma semana nunca e
--  igual a outra — ha a aula que o professor desmarcou, a de reposicao noutro
--  dia, a troca de turno so naquela semana. Isto guarda essas alteracoes
--  SOLTAS do horario, para um dia so, sem lhe tocar.
--
--  action = 'skip'  -> `block_id` nao corre nesse dia (fica cancelada, da para
--                      repor: basta apagar a linha).
--  action = 'extra' -> uma aula que so existe nesse dia, com os campos todos
--                      proprios (nao vem de nenhum bloco do horario).
-- ------------------------------------------------------------
create table if not exists public.schedule_exceptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  on_date     date not null,                 -- o dia concreto, YYYY-MM-DD
  action      text not null check (action in ('skip', 'extra')),
  block_id    uuid references public.schedule_blocks(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  title       text,
  start_time  time,
  end_time    time,
  location    text,
  kind        text default 'aula',
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  PRAZOS / TRABALHOS (assignments)
-- ------------------------------------------------------------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  title       text not null,
  description text,
  due_date    timestamptz,
  kind        text default 'trabalho',      -- trabalho | exame | teste | apresentacao | outro
  status      text default 'todo',          -- todo | doing | done
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  NOTAS / AVALIACOES (grades)  — componentes de avaliacao
-- ------------------------------------------------------------
create table if not exists public.grades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,                -- ex: "Exame Final", "Trabalho de grupo"
  weight      numeric not null default 0,   -- peso em % (0-100)
  grade       numeric,                      -- nota 0-20 (null = ainda sem nota)
  -- Quando esta linha foi CONCLUIDA. So interessa aos creditos Pass/Fail: os 4
  -- modulos do Careers with Impact fazem-se ao longo do curso, um por semestre,
  -- e a candidatura a Erasmus so conta os que ja estavam fechados. null = usa o
  -- ano/semestre da propria cadeira, que e como funcionava antes disto.
  year        smallint,                     -- ano do curso: 1 | 2 | 3
  term        smallint,                     -- semestre: 1 | 2
  created_at  timestamptz not null default now()
);

-- Migracao para bases de dados ja existentes:
alter table public.grades add column if not exists year smallint;
alter table public.grades add column if not exists term smallint;

-- ------------------------------------------------------------
--  NOTAS PESSOAIS + TAREFAS (notes)
-- ------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  title       text,
  body        text,
  is_task     boolean not null default false,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY — cada utilizador so ve os seus dados
-- ============================================================
alter table public.courses         enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.assignments     enable row level security;
alter table public.grades          enable row level security;
alter table public.notes           enable row level security;

-- Politica generica: dono = auth.uid(). Uma por tabela.
do $$
declare t text;
begin
  foreach t in array array['courses','schedule_blocks','schedule_exceptions','assignments','grades','notes']
  loop
    execute format('drop policy if exists "own_select" on public.%I;', t);
    execute format('drop policy if exists "own_insert" on public.%I;', t);
    execute format('drop policy if exists "own_update" on public.%I;', t);
    execute format('drop policy if exists "own_delete" on public.%I;', t);

    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id);', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id);', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id);', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- Indices uteis
create index if not exists idx_schedule_user_day on public.schedule_blocks(user_id, day_of_week);
create index if not exists idx_exc_user_date    on public.schedule_exceptions(user_id, on_date);
-- Cancelar a mesma aula duas vezes no mesmo dia nao quer dizer nada.
create unique index if not exists uq_exc_skip on public.schedule_exceptions(user_id, block_id, on_date)
  where action = 'skip';
create index if not exists idx_assign_user_due   on public.assignments(user_id, due_date);
create index if not exists idx_grades_user_course on public.grades(user_id, course_id);
create index if not exists idx_notes_user         on public.notes(user_id);
