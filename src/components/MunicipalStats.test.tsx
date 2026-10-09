// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { MunicipalStats as Stats } from '../services/issuesService';

import { MunicipalStatsCharts, MunicipalStatsTiles } from './MunicipalStats';

// Les deux blocs vivent à des endroits différents de la vue mairie (en-tête / sous l'en-tête) : on les
// rend ensemble ici pour tester les chiffres et l'accessibilité.
const renderAll = (value: Stats) =>
  render(
    <div>
      <MunicipalStatsTiles stats={value} />
      <MunicipalStatsCharts stats={value} />
    </div>,
  );

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    registeredUsers: 120,
    participants: 45,
    activeUsers30d: 18,
    issues: { total: 40, pending: 10, inProgress: 10, resolved: 20, revoked: 3 },
    avgResolutionDays: 12.5,
    resolutionSample: 8,
    votes: 200,
    comments: 75,
    categories: [
      { category: 'voirie', count: 20 },
      { category: 'peinture', count: 5 },
    ],
    monthly: MONTHS.map((month, index) => ({
      month,
      issues: index === 5 ? 9 : index,
      votes: index * 10,
      comments: index * 3,
      byCategory: (index === 5 ? { voirie: 6, peinture: 3 } : {}) as Record<string, number>,
    })),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('MunicipalStats (indicateurs et graphiques)', () => {
  it('shows the headline figures of the commune, with no accessibility violation', async () => {
    const { container } = renderAll(stats());

    expect(screen.getByText('120').nextElementSibling?.textContent).toMatch(/inscrits dans la commune/);
    expect(screen.getByText('18 actifs ces 30 derniers jours')).toBeTruthy();
    expect(screen.getByText('50 %')).toBeTruthy(); // 20 terminés sur 40
    expect(screen.getByText('20 terminés sur 40')).toBeTruthy();
    expect(screen.getByText(/12,5 jours/)).toBeTruthy();
    expect(screen.getByText('Sur 8 des 20 terminés (les plus anciens n’ont pas de date)')).toBeTruthy();
    expect(screen.getByText('5 par signalement')).toBeTruthy(); // 200 votes / 40
    expect(screen.getByText('3 révoqués non comptés')).toBeTruthy();
    expect(screen.getByText('45 personnes ont participé')).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it('states that nothing personal is shown', () => {
    renderAll(stats());

    expect(screen.getByText(/aucun nom, e-mail ou identifiant d’habitant/i)).toBeTruthy();
  });

  it('reads each month of the charts to screen readers, with the category labels of the app', () => {
    renderAll(stats());

    expect(screen.getByText('octobre 2026 : 9 signalements')).toBeTruthy();
    expect(screen.getByText('juillet 2026 : 2 signalements')).toBeTruthy();
    expect(screen.getByText('octobre 2026 : 50 votes')).toBeTruthy();
    expect(screen.getByText('octobre 2026 : 15 commentaires')).toBeTruthy();
    const categories = screen.getByText(/Signalements par catégorie/).closest('figure')!;
    expect(within(categories).getByText('Voirie')).toBeTruthy();
    expect(within(categories).getByText('Peinture')).toBeTruthy();
  });

  it('offers the same figures as a table, per month and per used category only', () => {
    renderAll(stats());

    const table = screen.getByRole('table', { name: 'Activité par mois' });
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Mois', 'Signalements', 'Votes', 'Commentaires', 'Voirie', 'Peinture']);
    const october = within(table).getByRole('row', { name: /octobre 2026/ });
    expect(within(october).getAllByRole('cell').map((c) => c.textContent)).toEqual(['9', '50', '15', '6', '3']);
  });

  it('shows dashes instead of invented figures when there is nothing to measure yet, with no violation', async () => {
    const { container } = renderAll(
      stats({
        issues: { total: 0, pending: 0, inProgress: 0, resolved: 0, revoked: 0 },
        avgResolutionDays: null,
        resolutionSample: 0,
        votes: 0,
        comments: 0,
        participants: 0,
        categories: [],
        monthly: MONTHS.map((month) => ({ month, issues: 0, votes: 0, comments: 0, byCategory: {} })),
      }),
    );

    expect(screen.getAllByText('—')).toHaveLength(2); // taux de résolution et délai moyen
    expect(screen.getByText('Mesuré dès qu’un signalement passe à « terminé »')).toBeTruthy();
    expect(screen.getByText('Aucun signalement pour l\'instant.')).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it('says how many signalements the delay is based on when all of them are dated', () => {
    renderAll(stats({ issues: { total: 10, pending: 0, inProgress: 0, resolved: 4, revoked: 0 }, resolutionSample: 4, avgResolutionDays: 1 }));

    expect(screen.getByText('Sur 4 signalements terminés')).toBeTruthy();
    expect(screen.getByText('1 jour')).toBeTruthy();
  });
});
