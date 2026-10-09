import { Card } from './ui/card';
import { POST_CATEGORIES, POST_CATEGORY_CONFIG } from '../lib/postCategory';
import type { MunicipalStats as Stats } from '../services/issuesService';
import type { PostCategory } from '../types/Post';

// Hauteur de la zone de tracé des colonnes : une valeur en pixels plutôt qu'en pourcentage — le CSS
// est un export statique et les hauteurs en % dans un flex ont déjà posé problème (BUG-16).
const PLOT_HEIGHT = 112;

const nf = (n: number) => n.toLocaleString('fr-FR');
const plural = (n: number, one: string, many = `${one}s`) => (n > 1 ? many : one);

const monthDate = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1, 1));
};
const monthShort = (month: string) => monthDate(month).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
const monthLong = (month: string) =>
  monthDate(month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const categoryLabel = (category: string) => POST_CATEGORY_CONFIG[category as PostCategory]?.label ?? category;

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="stats-tile">
      <div className="stats-tile-value">{value}</div>
      <div className="stats-tile-label">{label}</div>
      {hint && <div className="stats-tile-hint">{hint}</div>}
    </Card>
  );
}

interface ColumnDatum {
  month: string;
  value: number;
}

// Colonnes d'une seule série, une teinte, valeur écrite seulement sur le maximum et le dernier mois ;
// les autres valeurs sont dans le texte lu par les lecteurs d'écran, l'infobulle et le tableau.
function ColumnChart({ title, unit, data }: { title: string; unit: (n: number) => string; data: ColumnDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const lastIndex = data.length - 1;

  return (
    <figure className="stats-chart">
      <figcaption className="stats-chart-title">{title}</figcaption>
      <ol className="stats-columns">
        {data.map((d, index) => {
          const height = d.value > 0 ? Math.max(2, Math.round((d.value / max) * PLOT_HEIGHT)) : 0;
          const showValue = d.value > 0 && (d.value === max || index === lastIndex);
          const showYear = index === 0 || d.month.endsWith('-01');
          return (
            <li key={d.month} className="stats-col" title={`${monthLong(d.month)} : ${unit(d.value)}`}>
              <span className="sr-only">{`${monthLong(d.month)} : ${unit(d.value)}`}</span>
              <div className="stats-col-plot" aria-hidden="true">
                {showValue && <span className="stats-col-value">{nf(d.value)}</span>}
                <span className="stats-col-bar" style={{ height }} />
              </div>
              <div className="stats-col-label" aria-hidden="true">
                <span>{monthShort(d.month)}</span>
                <span>{showYear ? d.month.slice(0, 4) : ' '}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

function CategoryBars({ categories }: { categories: Stats['categories'] }) {
  const max = Math.max(1, ...categories.map((c) => c.count));

  return (
    <figure className="stats-chart">
      <figcaption className="stats-chart-title">Signalements par catégorie (depuis le lancement)</figcaption>
      {categories.length === 0 ? (
        <p className="stats-empty">Aucun signalement pour l'instant.</p>
      ) : (
        <ul className="stats-hbars">
          {categories.map((c) => (
            <li key={c.category} className="stats-hbar-row" title={`${categoryLabel(c.category)} : ${nf(c.count)}`}>
              <span className="stats-hbar-label">{categoryLabel(c.category)}</span>
              <span className="stats-hbar-track" aria-hidden="true">
                <span className="stats-hbar-fill" style={{ width: `${Math.max(2, (c.count / max) * 100)}%` }} />
              </span>
              <span className="stats-hbar-value">{nf(c.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

function DataTables({ stats }: { stats: Stats }) {
  // Seules les catégories réellement utilisées sont en colonnes : pas de colonnes vides.
  const usedCategories = POST_CATEGORIES.filter((c) => stats.categories.some((s) => s.category === c));

  return (
    <details className="stats-details">
      <summary>Voir les chiffres en tableau</summary>
      <div className="stats-table-wrap">
        <table>
          <caption>Activité par mois</caption>
          <thead>
            <tr>
              <th scope="col">Mois</th>
              <th scope="col">Signalements</th>
              <th scope="col">Votes</th>
              <th scope="col">Commentaires</th>
              {usedCategories.map((c) => (
                <th scope="col" key={c}>
                  {POST_CATEGORY_CONFIG[c].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((m) => (
              <tr key={m.month}>
                <th scope="row">{monthLong(m.month)}</th>
                <td>{nf(m.issues)}</td>
                <td>{nf(m.votes)}</td>
                <td>{nf(m.comments)}</td>
                {usedCategories.map((c) => (
                  <td key={c}>{nf(m.byCategory[c] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Indicateurs clés, affichés dans l'en-tête de la vue mairie. Les chiffres viennent de la RPC
// municipal_stats : anonymes et limités à la commune de l'agent.
export function MunicipalStatsTiles({ stats }: { stats: Stats }) {
  const { issues } = stats;
  const resolutionRate = issues.total > 0 ? Math.round((issues.resolved / issues.total) * 100) : null;
  const votesPerIssue = issues.total > 0 ? stats.votes / issues.total : null;

  const delayHint =
    stats.resolutionSample === 0
      ? 'Mesuré dès qu’un signalement passe à « terminé »'
      : stats.resolutionSample < issues.resolved
        ? `Sur ${nf(stats.resolutionSample)} des ${nf(issues.resolved)} terminés (les plus anciens n’ont pas de date)`
        : `Sur ${nf(stats.resolutionSample)} ${plural(stats.resolutionSample, 'signalement terminé', 'signalements terminés')}`;

  return (
    <div>
      <div className="stats-grid">
        <StatTile
          label={`${plural(stats.registeredUsers, 'inscrit')} dans la commune`}
          value={nf(stats.registeredUsers)}
          hint={`${nf(stats.activeUsers30d)} ${plural(stats.activeUsers30d, 'actif')} ces 30 derniers jours`}
        />
        <StatTile
          label={plural(issues.total, 'signalement')}
          value={nf(issues.total)}
          hint={issues.revoked > 0 ? `${nf(issues.revoked)} ${plural(issues.revoked, 'révoqué')} non comptés` : undefined}
        />
        <StatTile
          label="Taux de résolution"
          value={resolutionRate === null ? '—' : `${resolutionRate} %`}
          hint={issues.total > 0 ? `${nf(issues.resolved)} terminés sur ${nf(issues.total)}` : undefined}
        />
        <StatTile
          label="Délai moyen de résolution"
          value={
            stats.avgResolutionDays === null
              ? '—'
              : `${stats.avgResolutionDays.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${plural(stats.avgResolutionDays, 'jour')}`
          }
          hint={delayHint}
        />
        <StatTile
          label={plural(stats.votes, 'vote')}
          value={nf(stats.votes)}
          hint={
            votesPerIssue === null
              ? undefined
              : `${votesPerIssue.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} par signalement`
          }
        />
        <StatTile
          label={plural(stats.comments, 'commentaire')}
          value={nf(stats.comments)}
          hint={`${nf(stats.participants)} ${plural(stats.participants, 'personne a participé', 'personnes ont participé')}`}
        />
      </div>
      <p className="stats-note">
        Chiffres anonymes de votre commune : aucun nom, e-mail ou identifiant d’habitant n’est affiché.
      </p>
    </div>
  );
}

// Graphiques et tableau, dépliés à la demande sous l'en-tête.
export function MunicipalStatsCharts({ stats }: { stats: Stats }) {
  return (
    <div className="stats-panel space-y-6">
      <section className="space-y-4">
        <h2>Signalements</h2>
        <ColumnChart
          title="Signalements créés par mois"
          unit={(n) => `${nf(n)} ${plural(n, 'signalement')}`}
          data={stats.monthly.map((m) => ({ month: m.month, value: m.issues }))}
        />
        <CategoryBars categories={stats.categories} />
      </section>

      <section className="space-y-4">
        <h2>Participation</h2>
        <ColumnChart
          title="Votes par mois"
          unit={(n) => `${nf(n)} ${plural(n, 'vote')}`}
          data={stats.monthly.map((m) => ({ month: m.month, value: m.votes }))}
        />
        <ColumnChart
          title="Commentaires par mois"
          unit={(n) => `${nf(n)} ${plural(n, 'commentaire')}`}
          data={stats.monthly.map((m) => ({ month: m.month, value: m.comments }))}
        />
      </section>

      <DataTables stats={stats} />
    </div>
  );
}
