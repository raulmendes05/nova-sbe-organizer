-- ============================================================
--  Limite diario de pedidos de IA por aluno (Claudio e companhia)
--
--  A quota gratuita do Gemini e partilhada por toda a gente: poucas dezenas
--  de pedidos por dia e por modelo. Sem limite por aluno, uma pessoa (ou um
--  script com uma sessao valida) deixava os outros sem Claudio a meio do dia.
--
--  Como funciona:
--   - public.ai_usage guarda, por aluno, por dia (hora de Lisboa) e por
--     funcao (claudio, resumo, ...), quantos pedidos ja fez.
--   - A tabela tem RLS ligada e NENHUMA policy: o browser nao a le nem lhe
--     mexe. So a funcao ai_usage_hit() la escreve.
--   - As funcoes /api chamam ai_usage_hit() com o token do PROPRIO aluno
--     (o servidor so tem a anon key). A funcao tira o aluno de auth.uid() —
--     nunca de um parametro — por isso ninguem conta pedidos em nome de outro.
--   - Os limites vem do servidor (variaveis AI_LIMIT_* na Vercel). Quem
--     chamasse a funcao diretamente so conseguia AUMENTAR o seu proprio
--     contador; nunca o baixar, nem tocar no de mais ninguem.
--
--  Corre-se no SQL Editor. Pode correr duas vezes. Se o codigo for publicado
--  antes disto, as funcoes /api deixam passar tudo (com um aviso no log).
-- ============================================================

begin;

create table if not exists public.ai_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,                       -- dia em Europe/Lisbon
  endpoint   text not null check (endpoint in ('claudio','resumo','apontamentos','corrigir','exercicios','horario')),
  hits       integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, endpoint)            -- tambem serve de indice da FK user_id
);

alter table public.ai_usage enable row level security;
-- Sem policies de proposito. E, por cima, sem privilegios para os papeis da API.
revoke all on table public.ai_usage from anon, authenticated;

-- ------------------------------------------------------------
-- ai_usage_hit(endpoint, limite_da_funcao, limite_total)
--
-- Conta UM pedido do aluno da sessao, se ainda estiver dentro dos limites,
-- e devolve o estado. Um pedido recusado NAO conta.
--   {"allowed": true|false, "scope": null|"endpoint"|"total",
--    "used": n_nesta_funcao, "total": n_em_todas, "limit": .., "total_limit": .., "day": "AAAA-MM-DD"}
-- Limite null ou <= 0 = sem limite.
--
-- SECURITY DEFINER para poder escrever numa tabela que o papel authenticated
-- nao pode tocar. Por isso search_path vazio e tudo qualificado.
-- O advisory lock por (aluno, dia) torna a leitura+escrita atomica: dois
-- pedidos ao mesmo tempo nao passam os dois no ultimo lugar livre.
-- ------------------------------------------------------------
create or replace function public.ai_usage_hit(
  p_endpoint    text,
  p_limit       integer default null,
  p_total_limit integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date := (pg_catalog.now() at time zone 'Europe/Lisbon')::date;
  v_used  integer;
  v_total integer;
  v_scope text;
begin
  if v_uid is null then
    raise exception 'ai_usage_hit: sem sessao' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint not in ('claudio','resumo','apontamentos','corrigir','exercicios','horario') then
    raise exception 'ai_usage_hit: funcao desconhecida %', p_endpoint using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai_usage:' || v_uid::text || ':' || v_day::text, 0));

  select coalesce(sum(u.hits), 0)::integer,
         coalesce(sum(u.hits) filter (where u.endpoint = p_endpoint), 0)::integer
    into v_total, v_used
    from public.ai_usage u
   where u.user_id = v_uid and u.day = v_day;

  if p_limit is not null and p_limit > 0 and v_used >= p_limit then
    v_scope := 'endpoint';
  elsif p_total_limit is not null and p_total_limit > 0 and v_total >= p_total_limit then
    v_scope := 'total';
  end if;

  if v_scope is null then
    insert into public.ai_usage as u (user_id, day, endpoint, hits)
    values (v_uid, v_day, p_endpoint, 1)
    on conflict (user_id, day, endpoint)
    do update set hits = u.hits + 1, updated_at = pg_catalog.now();
    v_used  := v_used + 1;
    v_total := v_total + 1;
  end if;

  return pg_catalog.jsonb_build_object(
    'allowed',     v_scope is null,
    'scope',       v_scope,
    'used',        v_used,
    'total',       v_total,
    'limit',       p_limit,
    'total_limit', p_total_limit,
    'day',         v_day
  );
end
$$;

-- So alunos com sessao. Nem anon, nem PUBLIC (que o Supabase concede por omissao).
revoke all on function public.ai_usage_hit(text, integer, integer) from public, anon;
grant execute on function public.ai_usage_hit(text, integer, integer) to authenticated;

commit;

-- ------------------------------------------------------------
-- Ver o uso de hoje (no SQL Editor, como postgres):
--   select u.day, a.email, u.endpoint, u.hits
--     from public.ai_usage u join auth.users a on a.id = u.user_id
--    where u.day = (now() at time zone 'Europe/Lisbon')::date
--    order by u.hits desc;
--
-- Dar mais uma oportunidade a alguem hoje:
--   delete from public.ai_usage where user_id = '<uuid>' and day = (now() at time zone 'Europe/Lisbon')::date;
--
-- Para desfazer tudo:
--   drop function if exists public.ai_usage_hit(text, integer, integer);
--   drop table if exists public.ai_usage;
-- ------------------------------------------------------------
