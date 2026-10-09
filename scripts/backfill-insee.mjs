// Renseigne `city_insee` des signalements et des comptes qui n'en ont pas encore, à partir de leurs
// coordonnées (API Géo : commune qui contient le point). À lancer UNE fois après la migration
// 20261010010000, avant de déployer le front. Idempotent : ne touche que les lignes sans code.
//
// Il lui faut la clé SERVICE (Supabase → Project Settings → API → « service_role » ou « secret ») :
// la clé anon ne peut ni lire ni modifier les lignes des autres comptes (RLS). L'URL est lue dans ton
// .env (VITE_SUPABASE_URL) grâce à --env-file ; la clé service, elle, se passe sur la ligne de
// commande, sans jamais l'écrire dans un fichier :
//
//   SUPABASE_SERVICE_ROLE_KEY=<clé> node --env-file=.env scripts/backfill-insee.mjs          # simulation
//   SUPABASE_SERVICE_ROLE_KEY=<clé> node --env-file=.env scripts/backfill-insee.mjs --apply  # écrit
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');

if (!url || !serviceKey) {
  console.error(
    [
      'Il manque :',
      !url && '  - SUPABASE_URL ou VITE_SUPABASE_URL (lancer avec : node --env-file=.env scripts/backfill-insee.mjs)',
      !serviceKey && '  - SUPABASE_SERVICE_ROLE_KEY (clé service, à passer devant la commande, pas dans le .env)',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exit(1);
}

// Une clé anon renverrait 0 ligne ou refuserait les écritures sans erreur claire : on l'écarte d'emblée.
function isServiceKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('sb_publishable_')) return false;
  try {
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role';
  } catch {
    return false;
  }
}
if (!isServiceKey(serviceKey)) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY n'est pas une clé service (c'est probablement la clé anon). " +
      'Prends la clé « service_role » (ou « secret ») dans Supabase → Project Settings → API.',
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const GEO = 'https://geo.api.gouv.fr/communes';
const cache = new Map();

async function geo(params) {
  const key = params.toString();
  if (!cache.has(key)) {
    const response = await fetch(`${GEO}?${key}`);
    cache.set(key, response.ok ? await response.json() : []);
    await new Promise((resolve) => setTimeout(resolve, 40)); // loin de la limite de 50 req/s
  }
  return cache.get(key);
}

const byPoint = async (lat, lng) =>
  (await geo(new URLSearchParams({ lat: String(lat), lon: String(lng), fields: 'nom,code' })))[0];
const byName = async (name) =>
  (await geo(new URLSearchParams({ nom: name, fields: 'nom,code', boost: 'population', limit: '1' })))[0];

const report = { issues: { updated: 0, skipped: 0 }, users: { updated: 0, skipped: 0 } };

async function run(table, rows, resolve) {
  for (const row of rows) {
    const commune = await resolve(row).catch(() => undefined);
    if (!commune) {
      report[table].skipped += 1;
      console.log(`  ? ${table} ${row.id} : commune introuvable`);
      continue;
    }
    console.log(`  ${apply ? '✓' : '·'} ${table} ${row.id} → ${commune.code} (${commune.nom})`);
    if (apply) {
      const { error } = await db.from(table).update({ city_insee: commune.code }).eq('id', row.id);
      if (error) throw error;
    }
    report[table].updated += 1;
  }
}

const { data: issues, error: issuesError } = await db.from('issues').select('id, location').is('city_insee', null);
if (issuesError) throw issuesError;
await run('issues', issues, (row) => {
  const { lat, lng } = row.location ?? {};
  return Number.isFinite(Number(lat)) && Number(lat) !== 0 ? byPoint(Number(lat), Number(lng)) : undefined;
});

const { data: users, error: usersError } = await db
  .from('users')
  .select('id, city, "cityLat", "cityLng"')
  .is('city_insee', null)
  .not('city', 'is', null);
if (usersError) throw usersError;
await run('users', users, (row) =>
  row.cityLat != null && row.cityLng != null
    ? byPoint(row.cityLat, row.cityLng)
    : byName(row.city.split(',')[0].trim()),
);

console.log(`\n${apply ? 'Appliqué' : 'Simulation (rien écrit — relance avec --apply)'} :`, JSON.stringify(report));
