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
--
--  Por cima disto, uma segunda camada (mais abaixo): a quota do Gemini por
--  MODELO, que e o que a Google conta (por projeto, por modelo, por dia do
--  Pacifico). ai_model_hit() conta cada chamada ao Gemini antes de ela sair:
--   - a parte de cada aluno nesse modelo (per_user_max) — limite por aluno;
--   - o tecto da app (global_max) — so rede de seguranca, a quota real.
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

-- ============================================================
--  Quota do Gemini por modelo (dia do Pacifico, como a Google)
--
--  A Google conta o plano gratuito por projeto, por modelo e por dia, e o dia
--  dela recomeca a meia-noite do Pacifico (08:00 em Lisboa na maior parte do
--  ano; 07:00 nas semanas em que so um dos lados mudou a hora). Contar pelo
--  mesmo relogio e o que deixa o tecto bater certo com a quota real: com o
--  dia de Lisboa, entre a meia-noite e as 08:00 o contador ja tinha voltado a
--  zero e a Google ainda nao.
--
--  ai_model_limits: um balde por modelo. So o postgres a edita (SQL Editor):
--    global_max   = tecto da app nesse modelo. O servidor pode pedir menos
--                   (AI_GLOBAL_LIMIT_* na Vercel, por omissao a quota - 10%),
--                   nunca mais. Por omissao = a quota gratuita (RPD).
--    per_user_max = quanto desse modelo um aluno pode gastar por dia (0 = sem
--                   limite). E isto que impede um aluno de esgotar um modelo
--                   para todos, mesmo chamando a funcao diretamente.
--  ai_model_usage: quem gastou quanto, por dia e modelo. Sem acesso pela API.
-- ============================================================

create table if not exists public.ai_model_limits (
  bucket       text primary key,                 -- id do modelo na API do Gemini
  rpd_free     integer not null,                 -- quota gratuita (pedidos/dia), so para referencia
  global_max   integer not null check (global_max >= 0),
  per_user_max integer not null check (per_user_max >= 0),
  updated_at   timestamptz not null default now()
);

-- Quotas gratuitas de set./out. 2026 (Google AI Studio; a Google deixou de as
-- publicar em ai.google.dev). "on conflict do nothing": correr outra vez nao
-- desfaz o que se tenha mudado a mao.
insert into public.ai_model_limits (bucket, rpd_free, global_max, per_user_max) values
  ('gemini-3.5-flash',       20,  20,  4),
  ('gemini-3.6-flash',       20,  20,  4),
  ('gemini-flash-latest',    20,  20,  4),
  ('gemini-3.5-flash-lite', 500, 500, 40),   -- tambem conta o gemini-flash-lite-latest
  ('gemini-3.1-flash-lite', 500, 500, 40)
on conflict (bucket) do nothing;

create table if not exists public.ai_model_usage (
  day        date not null,                       -- dia em America/Los_Angeles (o da Google)
  bucket     text not null,                       -- validado contra ai_model_limits na funcao
  user_id    uuid not null references auth.users(id) on delete cascade,
  hits       integer not null default 0 check (hits >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, bucket, user_id)              -- serve a soma da app por (dia, modelo)
);
create index if not exists idx_ai_model_usage_user on public.ai_model_usage(user_id);

alter table public.ai_model_limits enable row level security;
alter table public.ai_model_usage  enable row level security;
-- Sem policies. Os alunos nao leem nem mexem em nenhuma das duas.
revoke all on table public.ai_model_limits from anon, authenticated;
revoke all on table public.ai_model_usage  from anon, authenticated;

-- ------------------------------------------------------------
-- ai_model_hit(modelo, tecto_pedido_pelo_servidor)
--
-- Conta UMA chamada ao Gemini do aluno da sessao nesse modelo, se couber na
-- parte dele E no tecto da app. Uma chamada recusada nao conta.
--   {"allowed": .., "scope": null|"user"|"global", "used_user": .., "user_limit": ..,
--    "used_global": .., "global_limit": .., "day": "AAAA-MM-DD", "resets_at": "...+00"}
-- ------------------------------------------------------------
create or replace function public.ai_model_hit(
  p_bucket       text,
  p_global_limit integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := (pg_catalog.now() at time zone 'America/Los_Angeles')::date;
  v_cfg    public.ai_model_limits%rowtype;
  v_global integer;
  v_used_g integer;
  v_used_u integer;
  v_scope  text;
begin
  if v_uid is null then
    raise exception 'ai_model_hit: sem sessao' using errcode = '42501';
  end if;
  select * into v_cfg from public.ai_model_limits l where l.bucket = p_bucket;
  if not found then
    raise exception 'ai_model_hit: modelo desconhecido %', p_bucket using errcode = '22023';
  end if;
  -- O servidor pode pedir um tecto mais baixo; nunca mais alto do que a tabela.
  v_global := case when p_global_limit is null or p_global_limit <= 0 then v_cfg.global_max
                   else least(p_global_limit, v_cfg.global_max) end;

  -- Um cadeado por (modelo, dia): dois pedidos ao mesmo tempo nao passam os
  -- dois no ultimo lugar livre.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai_model:' || p_bucket || ':' || v_day::text, 0));

  select coalesce(sum(u.hits), 0)::integer,
         coalesce(sum(u.hits) filter (where u.user_id = v_uid), 0)::integer
    into v_used_g, v_used_u
    from public.ai_model_usage u
   where u.day = v_day and u.bucket = p_bucket;

  if v_cfg.per_user_max > 0 and v_used_u >= v_cfg.per_user_max then
    v_scope := 'user';
  elsif v_used_g >= v_global then
    v_scope := 'global';
  end if;

  if v_scope is null then
    insert into public.ai_model_usage as u (day, bucket, user_id, hits)
    values (v_day, p_bucket, v_uid, 1)
    on conflict (day, bucket, user_id)
    do update set hits = u.hits + 1, updated_at = pg_catalog.now();
    v_used_g := v_used_g + 1;
    v_used_u := v_used_u + 1;
  end if;

  return pg_catalog.jsonb_build_object(
    'allowed',      v_scope is null,
    'scope',        v_scope,
    'used_user',    v_used_u,
    'user_limit',   nullif(v_cfg.per_user_max, 0),
    'used_global',  v_used_g,
    'global_limit', v_global,
    'day',          v_day,
    'resets_at',    ((v_day + 1)::timestamp at time zone 'America/Los_Angeles')
  );
end
$$;

revoke all on function public.ai_model_hit(text, integer) from public, anon;
grant execute on function public.ai_model_hit(text, integer) to authenticated;

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
-- Gasto de hoje por modelo (dia da Google):
--   select bucket, sum(hits) as usados from public.ai_model_usage
--    where day = (now() at time zone 'America/Los_Angeles')::date group by bucket;
--
-- Mudar um tecto ou a parte de cada aluno (ex.: passar a plano pago):
--   update public.ai_model_limits set global_max = 1000, per_user_max = 100 where bucket = 'gemini-3.5-flash';
--
-- Para desfazer tudo:
--   drop function if exists public.ai_model_hit(text, integer);
--   drop table if exists public.ai_model_usage;
--   drop table if exists public.ai_model_limits;
--   drop function if exists public.ai_usage_hit(text, integer, integer);
--   drop table if exists public.ai_usage;
-- ------------------------------------------------------------
