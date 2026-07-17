import axe from 'axe-core';

/**
 * RGAA 4.1 is built on WCAG 2.1 (niveaux A et AA) — axe-core n'a pas de tag
 * "rgaa" natif, donc on filtre sur les tags WCAG qui correspondent aux critères
 * RGAA testables automatiquement. Voir ACCESSIBILITE.md pour le détail du mapping.
 *
 * `color-contrast` est désactivée : sous jsdom il n'y a pas de vrai moteur de
 * rendu (pas de layout, pas de résolution des couleurs calculées), la règle
 * produit des faux positifs/négatifs systématiques. Le contraste doit être
 * vérifié manuellement ou via un outil qui fait un vrai rendu (Lighthouse, axe
 * DevTools dans un navigateur réel).
 */
const RGAA_RELEVANT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export async function getA11yViolations(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: RGAA_RELEVANT_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations;
}

export async function expectNoA11yViolations(container: Element) {
  const violations = await getA11yViolations(container);

  if (violations.length > 0) {
    const details = violations
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nœud(s))`)
      .join('\n');
    throw new Error(`Violations d'accessibilité détectées:\n${details}`);
  }
}
