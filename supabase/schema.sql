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
  created_at  timestamptz not null default now()
);

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
  created_at  timestamptz not null default now()
);

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
alter table public.assignments     enable row level security;
alter table public.grades          enable row level security;
alter table public.notes           enable row level security;

-- Politica generica: dono = auth.uid(). Uma por tabela.
do $$
declare t text;
begin
  foreach t in array array['courses','schedule_blocks','assignments','grades','notes']
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
create index if not exists idx_assign_user_due   on public.assignments(user_id, due_date);
create index if not exists idx_grades_user_course on public.grades(user_id, course_id);
create index if not exists idx_notes_user         on public.notes(user_id);
