// Prévient par mail l'auteur d'un signalement que la mairie l'a révoqué.
// Appelée par le navigateur de la mairie juste après la RPC `revoke_issue` ; ne fait
// confiance à rien venant du client sauf l'id : l'appelant doit être l'auteur de la
// révocation (`revoked_by`), et un seul envoi par révocation (`revocation_notified_at`).
// Secrets : RESEND_API_KEY, RESEND_FROM (SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY sont fournis).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // « Réservation » atomique de l'envoi : un seul appel passe, et seul l'auteur
  // de la révocation y a droit. Libéré (`release`) si l'envoi échoue, pour permettre un nouvel essai.
  const { data: issue } = await admin
    .from('issues')
    .update({ revocation_notified_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('revoked_by', user.id)
    .is('revocation_notified_at', null)
    .not('revoked_at', 'is', null)
    .select('title, city, created_by, revoked_reason')
    .maybeSingle();
  if (!issue) return json({ error: 'Notification refusée ou déjà envoyée' }, 403);

  const release = () => admin.from('issues').update({ revocation_notified_at: null }).eq('id', issueId);

  const { data: author } = await admin.auth.admin.getUserById(issue.created_by);
  const to = author?.user?.email;
  if (!to) {
    await release();
    return json({ error: "Adresse e-mail de l'auteur introuvable" }, 422);
  }

  const title = escapeHtml(issue.title);
  const reason = escapeHtml(issue.revoked_reason ?? '');
  const city = issue.city ? ` de ${escapeHtml(issue.city)}` : '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM'),
      to: [to],
      subject: `Votre signalement « ${issue.title} » a été révoqué`,
      html: `<p>Bonjour,</p><p>La mairie${city} a révoqué votre signalement <strong>${title}</strong>.</p><p><strong>Motif :</strong> ${reason}</p><p>Il n'apparaît plus sur la carte ; vous pouvez toujours le consulter depuis l'onglet « Révoqués » de votre profil.</p><p>— City Spot</p>`,
      text: `La mairie${issue.city ? ` de ${issue.city}` : ''} a révoqué votre signalement « ${issue.title} ».\nMotif : ${issue.revoked_reason ?? ''}\nVous pouvez le consulter depuis l'onglet « Révoqués » de votre profil.\n— City Spot`,
    }),
  });

  if (!res.ok) {
    await release();
    return json({ error: `Resend a refusé l'envoi (${res.status})` }, 502);
  }
  return json({ sent: true });
});
