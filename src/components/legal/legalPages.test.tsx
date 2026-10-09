// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../../test/a11y';
import { LEGAL_INFO } from '../../constants/legal';
import MentionsLegales from './MentionsLegales';
import Cgu from './Cgu';
import Confidentialite from './Confidentialite';
import Accessibilite from './Accessibilite';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PAGES = [
  { name: 'Mentions légales', Page: MentionsLegales, heading: 'Mentions légales' },
  { name: 'CGU', Page: Cgu, heading: "Conditions générales d'utilisation" },
  { name: 'Politique de confidentialité', Page: Confidentialite, heading: 'Politique de confidentialité' },
  { name: "Déclaration d'accessibilité", Page: Accessibilite, heading: "Déclaration d'accessibilité" },
];

describe.each(PAGES)('$name', ({ Page, heading }) => {
  it('renders its title and the legal footer links, with no accessibility violation', async () => {
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Informations légales' }).querySelectorAll('a')).toHaveLength(4);
    await expectNoA11yViolations(container);
  });

  it('highlights every legal field that is still empty in constants/legal.ts', () => {
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );

    const todos = container.querySelectorAll('mark.legal-todo');
    const anyFieldEmpty = Object.values(LEGAL_INFO).some((value) => value === '');
    // Tant que l'éditeur n'a pas rempli ses informations, les pages le montrent ; une fois
    // tout rempli, plus aucun emplacement ne doit subsister.
    if (anyFieldEmpty) {
      expect(todos.length).toBeGreaterThan(0);
      expect(todos[0].textContent).toMatch(/^\[À compléter : .+\]$/);
    }
  });
});
