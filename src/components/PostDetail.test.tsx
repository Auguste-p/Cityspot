// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import type { Post } from '../types/Post';

vi.mock('../hooks/useIssues', () => ({
  useIssue: vi.fn(),
  useComments: vi.fn(),
  useVotes: vi.fn(),
}));

vi.mock('../services/issuesService', () => ({
  deleteIssue: vi.fn(),
  revokeIssue: vi.fn(),
  reportContent: vi.fn(),
  getPrivateNote: vi.fn(),
  savePrivateNote: vi.fn(),
}));

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
}));

import { useUser } from '../context/UserContext';
import { useComments, useIssue, useVotes } from '../hooks/useIssues';
import { getPrivateNote, reportContent, revokeIssue } from '../services/issuesService';
import { PostDetail } from './PostDetail';

const mockedUseUser = vi.mocked(useUser);
const mockedUseIssue = vi.mocked(useIssue);
const mockedUseComments = vi.mocked(useComments);
const mockedUseVotes = vi.mocked(useVotes);

const CITIZEN = { id: 'u1', email: 'a@b.com', role: 'citizen' as const };

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    categories: [],
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

  it('shows the private note to a municipal account only, with no violation', async () => {
    vi.mocked(getPrivateNote).mockResolvedValue('à surveiller');
    const MUNICIPAL = { id: 'm1', email: 'm@ville.fr', role: 'municipal' as const };
    mockedUseIssue.mockReturnValue({ issue: post(), loading: false, error: null });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });

    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    renderPostDetail();
    await screen.findByText('Nid de poule rue Victor Hugo');
    expect(screen.queryByLabelText(/Note privée/)).toBeNull();
    cleanup();

    mockedUseUser.mockReturnValue({ user: MUNICIPAL, loading: false, isMunicipalUser: true, refreshUser: vi.fn() });
    const { container } = renderPostDetail();
    expect(await screen.findByDisplayValue('à surveiller')).toBeTruthy();
    await expectNoA11yViolations(container);
  });
});

describe('PostDetail city hall badge on comments', () => {
  const comment = (id: string, id_user: string, authorIsMunicipal?: boolean) => ({
    id, created_at: '2026-10-07T10:00:00Z', id_issue: 'post-1', id_user, comment: `Message ${id}`, authorName: `Auteur ${id}`, authorIsMunicipal,
  });
  const withComments = (comments: ReturnType<typeof comment>[]) => {
    mockedUseIssue.mockReturnValue({ issue: post(), loading: false, error: null });
    mockedUseComments.mockReturnValue({ comments, loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });
  };

  it('marks only the comments written by a city hall account, with no violation', async () => {
    mockedUseUser.mockReturnValue({ user: CITIZEN, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    withComments([comment('c1', 'mairie', true), comment('c2', 'someone')]);

    const { container } = renderPostDetail();
    await screen.findByText('Message c1');
    expect(screen.getAllByText('Mairie')).toHaveLength(1);
    await expectNoA11yViolations(container);
  });

  it('marks my own comment when I am a city hall account (no need to re-read the view)', async () => {
    const MAIRIE = { id: 'm1', email: 'm@ville.fr', role: 'municipal' as const };
    vi.mocked(getPrivateNote).mockResolvedValue('');
    mockedUseUser.mockReturnValue({ user: MAIRIE, loading: false, isMunicipalUser: true, refreshUser: vi.fn() });
    withComments([comment('c1', 'm1')]);

    renderPostDetail();
    await screen.findByText('Message c1');
    expect(screen.getAllByText('Mairie')).toHaveLength(1);
  });
});

describe('PostDetail revocation by the city hall', () => {
  const MAIRIE = { id: 'm1', email: 'm@ville.fr', role: 'municipal' as const, city: 'Castelnau-le-Lez, Occitanie', cityInsee: '34057' };
  const asUser = (user: typeof CITIZEN | typeof MAIRIE) =>
    mockedUseUser.mockReturnValue({ user, loading: false, isMunicipalUser: user.role === 'municipal', refreshUser: vi.fn() });
  const withIssue = (overrides: Partial<Post> = {}) => {
    mockedUseIssue.mockReturnValue({ issue: post({ city: 'Castelnau-le-Lez', cityInsee: '34057', ...overrides }), loading: false, error: null });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });
    vi.mocked(getPrivateNote).mockResolvedValue('');
  };

  it('is offered to the city hall of the issue commune only (by INSEE code, not by name)', async () => {
    withIssue();
    asUser(CITIZEN);
    renderPostDetail();
    await screen.findByText('Nid de poule rue Victor Hugo');
    expect(screen.queryByRole('button', { name: 'Révoquer le signalement' })).toBeNull();
    cleanup();

    // Même nom de ville, autre commune (homonyme) : pas de droit de révocation.
    asUser({ ...MAIRIE, city: 'Castelnau-le-Lez, Occitanie', cityInsee: '34172' });
    renderPostDetail();
    await screen.findByText('Nid de poule rue Victor Hugo');
    expect(screen.queryByRole('button', { name: 'Révoquer le signalement' })).toBeNull();
    cleanup();

    asUser(MAIRIE);
    renderPostDetail();
    expect(await screen.findByRole('button', { name: 'Révoquer le signalement' })).toBeTruthy();
  });

  it('requires a reason, then calls revokeIssue', async () => {
    withIssue();
    asUser(MAIRIE);
    vi.mocked(revokeIssue).mockResolvedValue({ emailSent: true });
    renderPostDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Révoquer le signalement' }));
    const confirm = await screen.findByRole('button', { name: 'Confirmer la révocation' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Motif de la révocation/), { target: { value: '  Doublon  ' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(revokeIssue).toHaveBeenCalledWith('post-1', 'Doublon'));
  });

  it('shows the banner with the reason and hides the actions on a revoked issue, with no violation', async () => {
    withIssue({ revoked: { at: new Date('2026-10-07'), reason: 'Hors compétence communale' } });
    asUser(MAIRIE);
    const { container } = renderPostDetail();

    expect(await screen.findByText(/Hors compétence communale/)).toBeTruthy();
    expect(screen.getByText('Révoqué')).toBeTruthy();
    expect(screen.queryByText('En vote')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Révoquer le signalement' })).toBeNull();
    expect(screen.queryByText('Voter pour ce projet')).toBeNull();
    expect(screen.queryByLabelText('Ajouter un commentaire')).toBeNull();
    await expectNoA11yViolations(container);
  });
});


describe('PostDetail content reporting', () => {
  const comment = (id: string, id_user: string) => ({
    id, created_at: '2026-10-07T10:00:00Z', id_issue: 'post-1', id_user, comment: `Message ${id}`, authorName: `Auteur ${id}`,
  });
  const setup = (userId = 'u1') => {
    mockedUseUser.mockReturnValue({ user: { ...CITIZEN, id: userId }, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({ issue: post({ created_by: 'author' }), loading: false, error: null });
    mockedUseComments.mockReturnValue({
      comments: [comment('c1', 'u1'), comment('c2', 'someone')], loading: false, error: null, addComment: vi.fn(),
    });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });
  };

  it('reports the issue with a reason, then confirms', async () => {
    setup();
    vi.mocked(reportContent).mockResolvedValue('sent');
    renderPostDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Signaler ce signalement' }));
    const send = await screen.findByRole('button', { name: 'Envoyer le signalement' });
    expect((send as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Spam ou publicité' }));
    fireEvent.click(send);

    await waitFor(() =>
      expect(reportContent).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', issueId: 'post-1', commentId: undefined, reason: 'spam' }),
      ),
    );
  });

  it('reports a comment written by someone else, never my own', async () => {
    setup();
    vi.mocked(reportContent).mockResolvedValue('sent');
    renderPostDetail();

    await screen.findByText('Message c2');
    expect(screen.queryByRole('button', { name: 'Signaler le commentaire de Auteur c1' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Signaler le commentaire de Auteur c2' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Contenu illicite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));

    await waitFor(() =>
      expect(reportContent).toHaveBeenCalledWith(expect.objectContaining({ commentId: 'c2', reason: 'illegal' })),
    );
  });

  it("does not offer to report one's own issue", async () => {
    setup('author');
    renderPostDetail();

    await screen.findByText('Message c2');
    expect(screen.queryByRole('button', { name: 'Signaler ce signalement' })).toBeNull();
  });

  it('the open report dialog has no violation', async () => {
    setup();
    renderPostDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Signaler ce signalement' }));
    await screen.findByRole('button', { name: 'Envoyer le signalement' });
    await expectNoA11yViolations(document.body);
  });
});

describe('PostDetail creator name', () => {
  const setup = (userId: string, overrides: Partial<Post> = {}) => {
    mockedUseUser.mockReturnValue({ user: { ...CITIZEN, id: userId }, loading: false, isMunicipalUser: false, refreshUser: vi.fn() });
    mockedUseIssue.mockReturnValue({
      issue: post({ created_by: 'author', authorName: 'Jeanne Dupont', ...overrides }),
      loading: false,
      error: null,
    });
    mockedUseComments.mockReturnValue({ comments: [], loading: false, error: null, addComment: vi.fn() });
    mockedUseVotes.mockReturnValue({ votes: [], loading: false, error: null, addVote: vi.fn() });
  };

  it('shows who reported it, between the photo and the status badge, with no violation', async () => {
    setup('u1');
    const { container } = renderPostDetail();

    const author = await screen.findByText('Signalé par', { exact: false });
    expect(author.textContent).toBe('Signalé par Jeanne Dupont');

    const photo = screen.getByRole('img', { name: 'Nid de poule rue Victor Hugo' });
    const badge = screen.getByText('En vote');
    expect(photo.compareDocumentPosition(author) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(author.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it('lays out the title with the creator on one row, and the description with the status badge on the next', async () => {
    setup('u1');
    renderPostDetail();

    const author = await screen.findByText('Signalé par', { exact: false });
    const title = screen.getByRole('heading', { level: 1, name: 'Nid de poule rue Victor Hugo' });
    const description = screen.getByText('Un trou dangereux pour les cyclistes');
    const badge = screen.getByText('En vote');

    expect(title.parentElement).toBe(author.parentElement);
    expect(description.parentElement).toBe(badge.closest('div')?.parentElement);
    expect(title.parentElement).not.toBe(description.parentElement);
    // La photo garde son écart habituel avec ce qui suit, nom ou pas.
    expect(screen.getByRole('img', { name: 'Nid de poule rue Victor Hugo' }).parentElement?.className).toContain('mb-6');
  });

  it('says "vous" to the creator of the signalement', async () => {
    setup('author');
    renderPostDetail();

    expect((await screen.findByText('Signalé par', { exact: false })).textContent).toBe('Signalé par vous');
    // Le créateur retrouve son propre profil (privé), pas la page publique.
    expect(screen.getByRole('link', { name: 'vous' }).getAttribute('href')).toBe('/profile');
  });

  it('links the creator name to the public profile of the creator, with no violation', async () => {
    setup('u1');
    const { container } = renderPostDetail();

    const link = await screen.findByRole('link', { name: 'Jeanne Dupont' });
    expect(link.getAttribute('href')).toBe('/user/author');
    expect(link.className).toContain('link-underline');
    await expectNoA11yViolations(container);
  });

  it('does not link a deleted account: it has no profile to open', async () => {
    setup('u1', { authorName: 'Utilisateur supprimé' });
    renderPostDetail();

    expect((await screen.findByText('Signalé par', { exact: false })).textContent).toBe('Signalé par Utilisateur supprimé');
    expect(screen.queryByRole('link', { name: 'Utilisateur supprimé' })).toBeNull();
  });

  it('shows nothing when the creator has no name', async () => {
    setup('u1', { authorName: undefined });
    renderPostDetail();

    await screen.findByText('Nid de poule rue Victor Hugo');
    expect(screen.queryByText('Signalé par', { exact: false })).toBeNull();

  });
});
