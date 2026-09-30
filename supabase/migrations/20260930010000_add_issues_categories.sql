-- Multi-catégories : `categories` remplace `category` (conservée pour l'instant, à supprimer plus tard).
alter table public.issues add column if not exists categories text[] not null default '{}';

update public.issues
set categories = array[category]
where category is not null and categories = '{}';
