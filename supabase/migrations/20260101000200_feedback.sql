-- ============================================================
--  MENSAGENS DOS UTILIZADORES (feedback) — bugs e sugestoes
--  Corre isto no SQL Editor do teu projeto Supabase.
--
--  Quem escreve ve so as suas mensagens; o administrador ve todas e e o
--  unico que lhes pode mexer no estado. Quem administra esta definido numa
--  funcao unica (is_admin) — muda o email la e muda em todo o lado.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
--  Quem administra
-- ------------------------------------------------------------
-- O email vem do proprio JWT da sessao, nao de nada que o browser envie:
-- ninguem se pode fazer passar por administrador a partir do cliente.
-- Sem `security definer` de proposito: a funcao so le o JWT de quem esta a
-- fazer o pedido (auth.jwt() ja vem qualificada, nao depende do search_path).
-- Correr com os privilegios do dono nao traria nada e e um risco a mais.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('75960@novasbe.pt')
$$;

-- ------------------------------------------------------------
--  A tabela
-- ------------------------------------------------------------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  -- on delete set null: uma conta apagada nao leva o report com ela.
  user_id     uuid references auth.users(id) on delete set null,
  user_email  text,                          -- copia, para saber a quem responder
  kind        text not null default 'bug',   -- bug | melhoria | outro
  message     text not null,
  page        text,                          -- em que ecra estava (ex: "/notas")
  app_version text,
  user_agent  text,
  status      text not null default 'novo',  -- novo | visto | resolvido
  triage      jsonb,                         -- o que o Cláudio percebeu do report
  created_at  timestamptz not null default now()
);

-- Uma mensagem vazia ou um romance de 50 mil caracteres nao sao reports.
alter table public.feedback drop constraint if exists feedback_message_len;
alter table public.feedback add constraint feedback_message_len
  check (char_length(message) between 5 and 4000);

alter table public.feedback drop constraint if exists feedback_kind_valid;
alter table public.feedback add constraint feedback_kind_valid
  check (kind in ('bug', 'melhoria', 'outro'));

alter table public.feedback drop constraint if exists feedback_status_valid;
alter table public.feedback add constraint feedback_status_valid
  check (status in ('novo', 'visto', 'resolvido'));

-- ------------------------------------------------------------
--  RLS
-- ------------------------------------------------------------
alter table public.feedback enable row level security;

drop policy if exists "feedback_insert_own" on public.feedback;
drop policy if exists "feedback_select_own_or_admin" on public.feedback;
drop policy if exists "feedback_update_own_triage" on public.feedback;
drop policy if exists "feedback_update_admin" on public.feedback;
drop policy if exists "feedback_delete_admin" on public.feedback;

-- Escrever: so em nome proprio.
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

-- Ler: as minhas; o administrador le todas.
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (auth.uid() = user_id or public.is_admin());

-- Alterar: so quem administra. O servidor faz a triagem ANTES de inserir e
-- grava-a na mesma linha, por isso ninguem precisa de poder reescrever um
-- report depois de enviado — nem o proprio autor.
create policy "feedback_update_admin" on public.feedback
  for update using (public.is_admin()) with check (public.is_admin());

create policy "feedback_delete_admin" on public.feedback
  for delete using (public.is_admin());

-- ------------------------------------------------------------
--  Indices
-- ------------------------------------------------------------
create index if not exists idx_feedback_created on public.feedback(created_at desc);
create index if not exists idx_feedback_user    on public.feedback(user_id, created_at desc);
create index if not exists idx_feedback_status  on public.feedback(status, created_at desc);
