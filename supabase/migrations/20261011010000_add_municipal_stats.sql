-- Tableau de bord de statistiques anonymes pour la vue mairie.
--
-- Règle de conception : la mairie reçoit des AGRÉGATS de sa commune, jamais de personnes. La
-- fonction ne renvoie aucun nom, e-mail ni identifiant de compte : seulement des comptages et
-- des moyennes. Elle remplace tout accès direct de la mairie à `public.users` (lisible par son
-- seul propriétaire) ou aux votes et commentaires d'autrui.

-- 1. Date de résolution -----------------------------------------------------------------------
-- Sans elle, impossible de calculer un délai de résolution. Posée par le serveur au passage du
-- statut à « resolved », jamais par le client (le trigger écrase toute valeur fournie). Les
-- signalements déjà terminés avant cette migration n'ont pas de date : ils comptent dans le taux
-- de résolution, mais pas dans le délai moyen.
alter table public.issues add column resolved_at timestamptz;

create function public.track_issue_resolution()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.resolved_at := null;
  elsif new.status is distinct from old.status then
    new.resolved_at := case when new.status = 'resolved' then now() else null end;
  else
    new.resolved_at := old.resolved_at;
  end if;
  return new;
end;
$$;

create trigger issues_track_resolution
  before insert or update on public.issues
  for each row execute function public.track_issue_resolution();

-- 2. Statistiques de la commune de l'appelant ---------------------------------------------------
-- p_months : fenêtre de la série mensuelle (1 à 36, 12 par défaut). Les autres chiffres portent
-- sur toute la vie de la commune. Les signalements révoqués sont exclus (comptés à part).
create function public.municipal_stats(p_months int default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_insee text;
  v_months int := greatest(1, least(coalesce(p_months, 12), 36));
  v_first timestamptz := date_trunc('month', now()) - make_interval(months => greatest(1, least(coalesce(p_months, 12), 36)) - 1);
  v_result jsonb;
begin
  select city_insee into v_insee
  from public.users
  where id = auth.uid() and role = 'municipal' and deleted_at is null;

  if v_insee is null then
    raise exception 'Statistiques réservées aux comptes mairie rattachés à une commune';
  end if;

  with
  ci as (
    select id, created_by, created_at, status, categories, resolved_at
    from public.issues
    where city_insee = v_insee and revoked_at is null
  ),
  vt as (
    select v.id_user, v.created_at from public.votes v join ci on v.id_issue::text = ci.id
  ),
  cm as (
    select c.id_user, c.created_at from public.comments c join ci on c.id_issue::text = ci.id
  ),
  months as (
    select generate_series(v_first, date_trunc('month', now()), interval '1 month') as m
  ),
  cat_month as (
    select date_trunc('month', ci.created_at) as m, cat::text as cat, count(*) as n
    from ci, unnest(ci.categories) as cat
    where ci.created_at >= v_first
    group by 1, 2
  )
  select jsonb_build_object(
    'registeredUsers', (select count(*) from public.users where city_insee = v_insee and deleted_at is null),
    'participants', (
      select count(distinct u) from (
        select id_user as u from vt union select id_user from cm union select created_by from ci
      ) x where u is not null
    ),
    'activeUsers30d', (
      select count(distinct u) from (
        select id_user as u from vt where created_at >= now() - interval '30 days'
        union select id_user from cm where created_at >= now() - interval '30 days'
        union select created_by from ci where created_at >= now() - interval '30 days'
      ) x where u is not null
    ),
    'issues', jsonb_build_object(
      'total', (select count(*) from ci),
      'pending', (select count(*) from ci where status is distinct from 'in-progress' and status is distinct from 'resolved'),
      'inProgress', (select count(*) from ci where status = 'in-progress'),
      'resolved', (select count(*) from ci where status = 'resolved'),
      'revoked', (select count(*) from public.issues where city_insee = v_insee and revoked_at is not null)
    ),
    'avgResolutionDays', (
      select round((avg(extract(epoch from resolved_at - created_at)) / 86400)::numeric, 1)
      from ci where status = 'resolved' and resolved_at is not null
    ),
    'resolutionSample', (select count(*) from ci where status = 'resolved' and resolved_at is not null),
    'votes', (select count(*) from vt),
    'comments', (select count(*) from cm),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('category', cat, 'count', n) order by n desc, cat), '[]'::jsonb)
      from (select cat::text as cat, count(*) as n from ci, unnest(ci.categories) as cat group by 1) t
    ),
    'monthly', (
      select jsonb_agg(
        jsonb_build_object(
          'month', to_char(months.m, 'YYYY-MM'),
          'issues', (select count(*) from ci where date_trunc('month', ci.created_at) = months.m),
          'votes', (select count(*) from vt where date_trunc('month', vt.created_at) = months.m),
          'comments', (select count(*) from cm where date_trunc('month', cm.created_at) = months.m),
          'byCategory', (
            select coalesce(jsonb_object_agg(cat_month.cat, cat_month.n), '{}'::jsonb)
            from cat_month where cat_month.m = months.m
          )
        )
        order by months.m
      )
      from months
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.municipal_stats(int) from public, anon;
grant execute on function public.municipal_stats(int) to authenticated;
