// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssue: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useIssue } from '../hooks/useIssues';
import { CreatePost } from './CreatePost';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIssue = vi.mocked(useIssue);

const CITIZEN = { id: 'u1', email: 'a@b.com', role: 'citizen' as const };

function existingPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    categories: [],
    title: 'Lampadaire cassé',
    description: 'Ne fonctionne plus depuis une semaine',
    location: { lat: 45.75, lng: 4.85, address: 'Avenue de la République' },
    imageUrl: 'https://picsum.photos/200',
    tasks: [{ id: 't1', title: 'Changer l\'ampoule', completed: false }],
    materials: ['Ampoule LED'],
    isPrivateProperty: false,
    votes: { positive: 2, negative: 0 },
    createdAt: new Date('2026-01-01'),
    status: 'pending',
    created_by: CITIZEN.id,
    ...overrides,
  };
}

function renderCreatePost(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/create" element={<CreatePost />} />
        <Route path="/create/:id" element={<CreatePost />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('CreatePost accessibility (RGAA / axe-core)', () => {
  it('the default creation form has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: null });

    const { container } = renderCreatePost('/create');
    await screen.findByLabelText(/Titre du signalement/);
    await expectNoA11yViolations(container);
  });

  it('the "voie privée / non propriétaire" branch (email field revealed) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: null });

    const { container } = renderCreatePost('/create');
    await screen.findByLabelText(/Titre du signalement/);

    fireEvent.click(screen.getByLabelText('Voie privée'));
    fireEvent.click(screen.getByLabelText('Non'));
    await screen.findByLabelText(/Email du propriétaire/);

    await expectNoA11yViolations(container);
  });

  it('the "voie privée / propriétaire" branch (document upload revealed) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: null });

    const { container } = renderCreatePost('/create');
    await screen.findByLabelText(/Titre du signalement/);

    fireEvent.click(screen.getByLabelText('Voie privée'));
    fireEvent.click(screen.getByLabelText('Oui'));
    await screen.findByText('Document de propriété');

    await expectNoA11yViolations(container);
  });

  it('the edit-mode form, pre-filled from an existing issue, has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: existingPost(), loading: false, error: null });

    const { container } = renderCreatePost('/create/post-1');
    await screen.findByDisplayValue('Lampadaire cassé');

    await expectNoA11yViolations(container);
  });

  it('the edit-mode loading state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: true, error: null });

    const { container } = renderCreatePost('/create/post-1');
    await screen.findByText('Chargement du signalement');

    await expectNoA11yViolations(container);
  });
});

describe('CreatePost — notice « mail envoyé à la mairie »', () => {
  const NOTICE = /Un mail sera envoyé à la mairie/;

  it('appears as soon as a category needing authorization is selected, with no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: null });

    const { container } = renderCreatePost('/create');
    await screen.findByLabelText(/Titre du signalement/);
    expect(screen.queryByText(NOTICE)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Propreté' }));
    expect(screen.queryByText(NOTICE)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Voirie' }));
    expect(await screen.findByText(NOTICE)).toBeTruthy();
    await expectNoA11yViolations(container);

    fireEvent.click(screen.getByRole('button', { name: 'Voirie' }));
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it('is not shown when editing (the mail is only sent at creation)', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: existingPost({ categories: ['voirie'] }), loading: false, error: null });

    renderCreatePost('/create/post-1');
    await screen.findByDisplayValue('Lampadaire cassé');
    expect(screen.queryByText(NOTICE)).toBeNull();
  });
});

