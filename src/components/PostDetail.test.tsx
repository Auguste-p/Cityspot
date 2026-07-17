// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssue: vi.fn(),
  useComments: vi.fn(),
  useVotes: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useComments, useIssue, useVotes } from '../hooks/useIssues';
import { PostDetail } from './PostDetail';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIssue = vi.mocked(useIssue);
const mockedUseComments = vi.mocked(useComments);
const mockedUseVotes = vi.mocked(useVotes);

const CITIZEN = { id: 'u1', email: 'a@b.com', role: 'citizen' as const };

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    title: 'Nid de poule rue Victor Hugo',
    description: 'Un trou dangereux pour les cyclistes',
    location: { lat: 45.75, lng: 4.85, address: '12 rue Victor Hugo, Lyon' },
    imageUrl: 'https://picsum.photos/200',
    tasks: [{ id: 't1', title: 'Reboucher', completed: false }],
    materials: ['Bitume'],
    isPrivateProperty: false,
    votes: { positive: 3, negative: 1 },
    createdAt: new Date('2026-01-01'),
    status: 'pending',
    created_by: 'someone-else',
    ...overrides,
  };
}

function renderPostDetail() {
  return render(
    <MemoryRouter initialEntries={['/post/post-1']}>
      <Routes>
        <Route path="/post/:id" element={<PostDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('PostDetail accessibility (RGAA / axe-core)', () => {
  it('the loading state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: true, error: null });
    mockedUseComments.mockReturnValue({ comments: [], loading: true, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: true, error: null, addVote: vi.fn() });

    const { container } = renderPostDetail();
    await screen.findByText('Chargement du signalement');
    await expectNoA11yViolations(container);
  });

  it('the error state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: new Error('Panne réseau') });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderPostDetail();
    await screen.findByText('Impossible de charger le signalement');
    await expectNoA11yViolations(container);
  });

  it('the not-found state has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: null, loading: false, error: null });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderPostDetail();
    await screen.findByText('Signalement introuvable');
    await expectNoA11yViolations(container);
  });

  it('the loaded view (comments, tasks, votes, own post) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: post({ created_by: CITIZEN.id }), loading: false, error: null });
    mockedUseComments.mockReturnValue({
      comments: [{ id: 'c1', created_at: '2026-01-02T00:00:00.000Z', id_user: CITIZEN.id, id_issue: 'post-1', comment: 'Bien vu !' }],
      loading: false,
      error: null,
      addComment: vi.fn(),
    });
    mockedUseVotes.mockReturnValue({
      votes: [{ id: 'v1', created_at: '2026-01-02T00:00:00.000Z', id_user: CITIZEN.id, id_issue: 'post-1', yes: true }],
      loading: false,
      error: null,
      addVote: vi.fn(),
    });

    const { container } = renderPostDetail();
    await screen.findByText('Nid de poule rue Victor Hugo');
    await expectNoA11yViolations(container);
  });

  it('a completed, municipal, private-property post (no vote CTA) has no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({
      issue: post({
        status: 'completed',
        isMunicipalProject: true,
        isPrivateProperty: true,
        ownerEmail: 'proprietaire@example.com',
        tasks: [{ id: 't1', title: 'Reboucher', completed: true }],
      }),
      loading: false,
      error: null,
    });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    const { container } = renderPostDetail();
    await screen.findByText('Nid de poule rue Victor Hugo');
    await expectNoA11yViolations(container);
  });
});
