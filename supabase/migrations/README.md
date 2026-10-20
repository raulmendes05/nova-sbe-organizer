# Migrações

Correm no **SQL Editor** do Supabase, **por ordem do nome**, uma de cada vez.
Todas podem correr mais do que uma vez sem estragar nada (`create ... if not
exists`, `create or replace`).

| ficheiro | o que faz |
|---|---|
| `20260101000000_schema.sql` | tabelas da app (cadeiras, horário, prazos, notas, notas soltas) + RLS |
| `20260101000100_exams.sql` | biblioteca partilhada de provas antigas (`exam_files`) e o trigger que só deixa entrar emails da Nova |
| `20260101000200_feedback.sql` | mensagens dos utilizadores e quem as administra |
| `20261008133639_hardening_and_perf.sql` | `search_path` fixo nas funções, policies mais rápidas, índices em falta |
| `20261008133723_ai_usage_limit.sql` | contador do limite de IA por aluno (`ai_usage`) e por modelo |
| `20261020203000_admins.sql` | quem administra passa a ser uma linha na tabela `admins` |

## Sobre as datas dos três primeiros

Estes três ficheiros existiam antes de haver pasta de migrações — eram
`supabase/schema.sql`, `exams.sql` e `feedback.sql`, corridos à mão pela
ordem em que aparecem no SETUP. A data `2026-01-01` é uma convenção para
fixar essa ordem (o `exams.sql` depende do `schema.sql`); não é a data em que
foram escritos nem aplicados.

No projeto de produção já estão todas aplicadas.
