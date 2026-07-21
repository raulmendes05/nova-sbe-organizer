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
--  Storage — bucket privado "exams"
--  Privado de proposito: os ficheiros so se abrem por signed URL
--  gerada para quem tem sessao iniciada (nao ficam num link publico).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('exams', 'exams', false, 20971520)   -- 20 MB por ficheiro
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "exams_obj_read"   on storage.objects;
drop policy if exists "exams_obj_insert" on storage.objects;
drop policy if exists "exams_obj_delete" on storage.objects;

create policy "exams_obj_read" on storage.objects
  for select to authenticated using (bucket_id = 'exams');

-- Nota: nao se valida o "owner" aqui — e o proprio servico de Storage que
-- preenche essa coluna depois da verificacao, por isso um with check sobre
-- ela rejeitaria envios legitimos.
create policy "exams_obj_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'exams');

create policy "exams_obj_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exams' and (owner = auth.uid() or owner_id = auth.uid()::text));
