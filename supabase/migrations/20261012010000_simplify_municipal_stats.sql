-- Simplifie municipal_stats (20261011010000, déjà appliquée) sans changer ses résultats :
--   - plus de paramètre p_months : la fenêtre est toujours de 12 mois, personne n'en demandait d'autre ;
--   - « participants » et « actifs sur 30 jours » partent d'une seule liste d'acteurs (CTE `actors`)
--     au lieu de deux unions recopiées.
-- Le paramètre disparaît de la signature : il faut supprimer l'ancienne fonction. L'appel sans argument
-- (rpc('municipal_stats')) fonctionne aussi avec l'ancienne version (valeur par défaut) : l'ordre de
-- déploiement front / base n'a pas d'importance.
drop function public.municipal_stats(int);

create function public.municipal_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_insee text;
  v_first timestamptz := date_trunc('month', now()) - interval '11 months';
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
  actors as (
    select id_user as u, created_at as t from vt
    union all select id_user, created_at from cm
    union all select created_by, created_at from ci
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
    'participants', (select count(distinct u) from actors),
    'activeUsers30d', (select count(distinct u) from actors where t >= now() - interval '30 days'),
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

revoke all on function public.municipal_stats() from public, anon;
grant execute on function public.municipal_stats() to authenticated;
