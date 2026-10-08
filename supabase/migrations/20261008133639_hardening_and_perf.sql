-- ============================================================
--  Seguranca e velocidade da base de dados (avisos do Supabase Advisor)
--
--  Escrito a partir das definicoes que estao MESMO em producao (pg_policies,
--  pg_proc, pg_indexes, triggers de auth.users em 08/10/2026), nao so dos
--  ficheiros supabase/*.sql. Corre-se no SQL Editor, de uma vez. Pode correr
--  duas vezes sem estragar nada (tudo e ALTER / IF NOT EXISTS).
--
--  O que muda:
--   1. enforce_nova_email(): deixa de se poder chamar por /rest/v1/rpc.
--   2. enforce_nova_email() e is_admin(): search_path fixo e vazio.
--   3. 28 policies (+3 do is_admin): auth.uid() passa a (select auth.uid()),
--      que o Postgres calcula UMA vez por pedido em vez de uma vez por linha.
--      O significado de cada policy fica exatamente igual.
--   4. 8 indices nas chaves estrangeiras que nao tinham nenhum.
--
--  Nada aqui apaga ou altera dados.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1 + 2. enforce_nova_email() — o trigger que so deixa criar contas
--        @novasbe.pt (trg_enforce_nova_email, BEFORE INSERT em auth.users).
--
-- Era SECURITY DEFINER e executavel por PUBLIC/anon/authenticated, por isso
-- aparecia na API como /rest/v1/rpc/enforce_nova_email. Chama-la assim nao
-- faz nada de util (sem NEW da erro), mas nao tem de estar exposta.
--
-- Tirar o EXECUTE nao desliga o trigger: o Postgres so verifica o EXECUTE da
-- funcao quando o trigger e CRIADO, nao de cada vez que dispara. O GoTrue
-- (supabase_auth_admin) continua a inserir em auth.users e o trigger corre.
--
-- search_path = '': o corpo so usa lower/split_part/coalesce, que vivem em
-- pg_catalog — esse e sempre procurado, mesmo com o search_path vazio.
-- ------------------------------------------------------------
alter function public.enforce_nova_email() set search_path = '';
revoke execute on function public.enforce_nova_email() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. is_admin() — search_path fixo. O corpo usa auth.jwt(), ja qualificada,
--    e lower/coalesce de pg_catalog: nada depende do search_path.
-- ------------------------------------------------------------
alter function public.is_admin() set search_path = '';

-- ------------------------------------------------------------
-- 3. Policies: auth.uid() -> (select auth.uid())
--
-- ALTER POLICY so muda a expressao: o nome, o comando (SELECT/INSERT/...),
-- os papeis (TO public / TO authenticated) e o PERMISSIVE ficam como estao.
-- As policies de UPDATE "own_update" nao tem WITH CHECK em producao (o
-- Postgres usa o USING nos dois sentidos) e assim continuam.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['assignments','courses','grades','notes','schedule_blocks','schedule_exceptions']
  loop
    execute format('alter policy "own_select" on public.%I using ((select auth.uid()) = user_id)', t);
    execute format('alter policy "own_insert" on public.%I with check ((select auth.uid()) = user_id)', t);
    execute format('alter policy "own_update" on public.%I using ((select auth.uid()) = user_id)', t);
    execute format('alter policy "own_delete" on public.%I using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- exam_files (TO authenticated). "exams_read_all" e using (true): fica igual.
alter policy "exams_insert_own" on public.exam_files
  with check ((select auth.uid()) = uploaded_by);
alter policy "exams_delete_own" on public.exam_files
  using ((select auth.uid()) = uploaded_by);

-- feedback. O is_admin() tambem le auth.jwt(); embrulhado em (select ...)
-- passa igualmente a ser calculado uma vez por pedido.
alter policy "feedback_insert_own" on public.feedback
  with check ((select auth.uid()) = user_id);
alter policy "feedback_select_own_or_admin" on public.feedback
  using (((select auth.uid()) = user_id) or (select public.is_admin()));
alter policy "feedback_update_admin" on public.feedback
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter policy "feedback_delete_admin" on public.feedback
  using ((select public.is_admin()));

-- ------------------------------------------------------------
-- 4. Indices nas chaves estrangeiras sem indice.
--
-- Servem os joins por cadeira e, sobretudo, o ON DELETE CASCADE / SET NULL:
-- apagar uma cadeira ou uma conta deixava de varrer as tabelas inteiras.
-- As tabelas sao pequenas (a maior tem ~1700 linhas), por isso criar estes
-- indices dentro da transacao demora milissegundos.
--
-- user_id: assignments, grades, notes, schedule_blocks e schedule_exceptions
-- ja tem um indice que comeca por user_id (o que a RLS filtra). Faltava so
-- em courses, que e uma das 8 abaixo.
-- ------------------------------------------------------------
create index if not exists idx_assignments_course      on public.assignments(course_id);
create index if not exists idx_courses_user            on public.courses(user_id);
create index if not exists idx_exam_files_uploaded_by  on public.exam_files(uploaded_by);
create index if not exists idx_grades_course           on public.grades(course_id);
create index if not exists idx_notes_course            on public.notes(course_id);
create index if not exists idx_schedule_blocks_course  on public.schedule_blocks(course_id);
create index if not exists idx_exc_block               on public.schedule_exceptions(block_id);
create index if not exists idx_exc_course              on public.schedule_exceptions(course_id);

commit;

-- ------------------------------------------------------------
-- Para desfazer (se alguma vez for preciso), por partes:
--   grant execute on function public.enforce_nova_email() to public, anon, authenticated;
--   alter function public.enforce_nova_email() set search_path = public;
--   alter function public.is_admin() reset search_path;
--   alter policy "own_select" on public.<tabela> using (auth.uid() = user_id);  -- etc.
--   drop index if exists public.idx_assignments_course;  -- etc.
-- ------------------------------------------------------------
