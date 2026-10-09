// Prévient par mail les comptes mairie de la ville d'un signalement qui exige autorisation
// et matériel spécifique. Appelée par le navigateur de l'auteur juste après la création ;
// ne fait confiance à rien venant du client sauf l'id : l'appelant doit être l'auteur, les
// catégories sont relues en base, et un seul envoi par signalement (`mairie_notified_at`).
// Secrets : RESEND_API_KEY, RESEND_FROM, SITE_URL (optionnel, pour le lien dans le mail).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Doit rester synchronisé avec AUTHORIZATION_CATEGORIES (src/lib/postCategory.ts).
const AUTHORIZATION_CATEGORIES = ['voirie', 'eclairage', 'securite', 'mobilier-urbain'];
const CATEGORY_LABELS: Record<string, string> = {
  voirie: 'Voirie',
  eclairage: 'Éclairage',
  securite: 'Sécurité',
  proprete: 'Propreté',
  'espaces-verts': 'Espaces verts',
  'mobilier-urbain': 'Mobilier urbain',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return json({ error: 'Non authentifié' }, 401);

  const { issueId } = await req.json().catch(() => ({}));
  if (typeof issueId !== 'string' || !issueId) return json({ error: 'issueId manquant' }, 400);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // « Réservation » atomique : un seul appel passe, seul l'auteur y a droit, et seulement
  // si une catégorie concernée est bien cochée en base. Libérée si aucun mail ne part.
  const { data: issue } = await admin
    .from('issues')
    .update({ mairie_notified_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('created_by', user.id)
    .is('mairie_notified_at', null)
    .overlaps('categories', AUTHORIZATION_CATEGORIES)
    .select('title, description, city, city_insee, location, categories')
    .maybeSingle();
  if (!issue) return json({ error: 'Notification refusée ou déjà envoyée' }, 403);

  const release = () => admin.from('issues').update({ mairie_notified_at: null }).eq('id', issueId);

  // Rattachement par code INSEE (et non plus par nom de ville : les homonymes se confondaient).
  // Signalement sans code INSEE (lieu hors de France, API Géo injoignable) : personne à prévenir.
  const { data: agents } = issue.city_insee
    ? await admin.from('users').select('id').eq('role', 'municipal').is('deleted_at', null).eq('city_insee', issue.city_insee)
    : { data: [] };
  const agentIds = (agents ?? []).map((agent) => agent.id);

  const emails: string[] = [];
  for (const id of agentIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  if (emails.length === 0) {
    await release();
    return json({ sent: 0 });
  }

  const siteUrl = Deno.env.get('SITE_URL')?.replace(/\/$/, '');
  const link = siteUrl ? `${siteUrl}/post/${issueId}` : null;
  const address = (issue.location as { address?: string } | null)?.address ?? '';
  const categories = (issue.categories as string[]).map((c) => CATEGORY_LABELS[c] ?? c).join(', ');
  const description = issue.description?.slice(0, 500) ?? '';

  // Un mail par agent : ils ne voient pas les adresses des autres destinataires.
  let sent = 0;
  for (const to of emails) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM'),
        to: [to],
        subject: `Nouveau signalement nécessitant votre intervention : ${issue.title}`,
        html: `<p>Bonjour,</p><p>Un signalement a été déposé sur City Spot pour <strong>${escapeHtml(issue.city ?? '')}</strong> : <strong>${escapeHtml(issue.title)}</strong>.</p><p>Il ne peut pas être réalisé par les habitants sans autorisation et matériel spécifique.</p><ul><li><strong>Catégories :</strong> ${escapeHtml(categories)}</li><li><strong>Adresse :</strong> ${escapeHtml(address)}</li></ul><p>${escapeHtml(description)}</p>${link ? `<p><a href="${escapeHtml(link)}">Voir le signalement</a></p>` : ''}<p>— City Spot</p>`,
        text: `Un signalement a été déposé pour ${issue.city ?? ''} : ${issue.title}.\nIl ne peut pas être réalisé sans autorisation et matériel spécifique.\nCatégories : ${categories}\nAdresse : ${address}\n\n${description}${link ? `\n\n${link}` : ''}\n— City Spot`,
      }),
    });
    if (res.ok) sent += 1;
  }

  if (sent === 0) {
    await release();
    return json({ error: "Resend a refusé tous les envois" }, 502);
  }
  return json({ sent });
});
