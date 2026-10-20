-- ============================================================
--  Quem administra: uma tabela, em vez de um email escrito no codigo
--
--  Ate aqui o is_admin() comparava o email do JWT com um endereco escrito
--  dentro da propria funcao. Mudar de administrador — ou ter dois — obrigava
--  a reescrever a funcao e a corre-la outra vez no SQL Editor.
--
--  A lista passa a ser uma tabela. Ninguem lhe chega por fora: tem RLS sem
--  policy nenhuma e os grants revogados, por isso nem com sessao se descobre
--  quem administra. Quem a le e a propria is_admin(), que a partir daqui
--  corre como dona (`security definer`).
--
--  Isto inverte uma decisao anterior, e de proposito: antes a funcao so lia o
--  JWT de quem perguntava e nao tocava em tabela nenhuma, logo nao precisava
--  de privilegios — correr como dona seria risco a troco de nada. Agora tem
--  de ler uma tabela que mais ninguem pode ler: ou corre como dona, ou a
--  lista de administradores ficava legivel por toda a gente com sessao. O
--  `search_path = ''` com os nomes todos qualificados fecha o risco habitual
--  do security definer (ninguem lhe pode trocar as tabelas por baixo).
-- ============================================================

create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text not null,
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Sem policies de proposito. Isto e so o cinto a mais: sem policy, o RLS ja
-- nao devolvia linha nenhuma a ninguem.
revoke all on public.admins from anon, authenticated;

-- O administrador que ja existia, para nada mudar ao correr isto.
insert into public.admins (user_id, email)
select u.id, u.email
  from auth.users u
 where lower(u.email) = lower('75960@novasbe.pt')
on conflict (user_id) do nothing;

do $$
begin
  if not exists (select 1 from public.admins) then
    raise notice 'ATENCAO: a tabela admins ficou VAZIA (nenhuma conta com esse email). Enquanto assim estiver, ninguem ve as mensagens de feedback — acrescenta-te com o insert comentado no fim deste ficheiro.';
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  )
$$;

-- As policies chamam-na em nome de quem faz o pedido, por isso tem de poder
-- ser executada por ele. Era o que ja acontecia (por omissao e de PUBLIC);
-- fica escrito para nao se perder se alguem mexer nos defaults.
grant execute on function public.is_admin() to anon, authenticated;

-- ------------------------------------------------------------
--  Acrescentar um administrador (a conta tem de ja ter entrado na app uma
--  vez — e so entao que existe em auth.users):
--
--    insert into public.admins (user_id, email)
--    select id, email from auth.users where lower(email) = lower('NUMERO@novasbe.pt')
--    on conflict (user_id) do nothing;
--
--  Tirar:
--    delete from public.admins where lower(email) = lower('NUMERO@novasbe.pt');
--
--  Ver quem esta la (so corre no SQL Editor; pela app ninguem consegue):
--    select email, added_at from public.admins order by added_at;
--
--  Voltar atras:
--    create or replace function public.is_admin()
--    returns boolean language sql stable set search_path = '' as $$
--      select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('75960@novasbe.pt')
--    $$;
-- ------------------------------------------------------------
