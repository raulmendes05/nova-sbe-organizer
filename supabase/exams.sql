-- ============================================================
--  Biblioteca de exames e testes antigos (exam_files)
--  ATENCAO: ao contrario das outras tabelas, esta e PARTILHADA —
--  todos os alunos leem tudo; cada um so apaga o que enviou.
--  Corre isto no SQL Editor do Supabase, depois do schema.sql.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.exam_files (
  id            uuid primary key default gen_random_uuid(),
  course_code   text not null,               -- codigo do catalogo Nova SBE, ex: "1220"
  course_name   text not null,               -- desnormalizado para listar sem join
  kind          text not null default 'exame', -- exame | recurso | teste | outro
  school_year   text,                        -- ex: "2024/25"
  title         text,                        -- rotulo livre opcional
  has_solutions boolean not null default false,
  storage_path  text not null unique,        -- caminho no bucket "exams"
  file_size     bigint,
  uploaded_by   uuid references auth.users(id) on delete set null,
  uploader_name text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_exam_files_code on public.exam_files(course_code);

alter table public.exam_files enable row level security;

drop policy if exists "exams_read_all"   on public.exam_files;
drop policy if exists "exams_insert_own" on public.exam_files;
drop policy if exists "exams_delete_own" on public.exam_files;

-- Qualquer aluno autenticado le a biblioteca inteira
create policy "exams_read_all" on public.exam_files
  for select to authenticated using (true);

-- So se pode inserir em nome proprio (impede falsificar o autor)
create policy "exams_insert_own" on public.exam_files
  for insert to authenticated with check (auth.uid() = uploaded_by);

-- So se apaga o que se enviou
create policy "exams_delete_own" on public.exam_files
  for delete to authenticated using (auth.uid() = uploaded_by);

-- ------------------------------------------------------------
--  Onde ficam os ficheiros?
--  NAO no Supabase Storage. Os PDFs vivem no Cloudflare R2 (10 GB gratis
--  e, sobretudo, saida de dados gratis — o plano gratuito do Supabase so
--  da 5 GB de trafego por mes, e uma biblioteca de provas e quase so
--  descarregamentos). Aqui guarda-se apenas o "storage_path"; os URLs
--  assinados sao gerados em /api/exam-url.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
--  So contas da Nova SBE se podem registar
--  ATENCAO: mexe no registo de TODA a app, nao so nas provas.
--  Ajusta a lista ALLOWED se o teu dominio for outro; o allowlist
--  extra serve para nao te trancares fora com uma conta pessoal.
-- ------------------------------------------------------------
create or replace function public.enforce_nova_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_domains text[] := array['novasbe.pt', 'novasbe.unl.pt'];
  extra_emails    text[] := array[]::text[];  -- ex: array['o.teu@gmail.com']
  domain          text;
begin
  domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  if domain = any(allowed_domains) or lower(coalesce(new.email,'')) = any(extra_emails) then
    return new;
  end if;
  raise exception 'Só contas @novasbe.pt se podem registar nesta app.';
end $$;

drop trigger if exists trg_enforce_nova_email on auth.users;
create trigger trg_enforce_nova_email
  before insert on auth.users
  for each row execute function public.enforce_nova_email();
