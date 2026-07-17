import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('./authService', () => ({
  getAccessToken: vi.fn(),
}));

import { getSupabaseClient } from '../lib/supabase';
import { getAccessToken } from './authService';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);
const mockedGetAccessToken = vi.mocked(getAccessToken);

// Minimal chainable stand-in for the Supabase query builder: every intermediate
// call (select/eq/in/order/insert/update/delete) returns the same thenable, and
// awaiting it resolves to the row(s) configured for that table.
function tableStub(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);
  const chain: any = resolved;
  for (const method of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete']) {
    chain[method] = () => chain;
  }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

function fakeClient(tables: Record<string, { data: unknown; error: unknown }>) {
  return { from: (table: string) => tableStub(tables[table]) } as any;
}

afterEach(() => {
  mockedGetSupabaseClient.mockReset();
  mockedGetAccessToken.mockReset();
});

describe('local fallback (no Supabase configured)', () => {
  beforeEach(() => {
    mockedGetSupabaseClient.mockReturnValue(null);
  });

  it('starts with an empty issue list', async () => {
    vi.resetModules();
    const { listIssues } = await import('./issuesService');
    await expect(listIssues()).resolves.toEqual([]);
  });

  it('creates, lists and fetches an issue locally', async () => {
    vi.resetModules();
    const { listIssues, createIssue, getIssueById } = await import('./issuesService');

    const created = await createIssue({
      title: 'Nid de poule',
      description: 'Trou dangereux',
      address: 'Rue Victor Hugo',
      tasks: ['Reboucher'],
      materials: ['Bitume'],
    });

    expect(created.status).toBe('pending');
    expect(created.tasks).toEqual([{ id: expect.any(String), title: 'Reboucher', completed: false }]);
    expect(created.materials).toEqual(['Bitume']);
    expect(created.imageUrl).toBe('https://picsum.photos/200');

    await expect(listIssues()).resolves.toEqual([created]);
    await expect(getIssueById(created.id)).resolves.toEqual(created);
    await expect(getIssueById('does-not-exist')).resolves.toBeNull();
  });

  it('updates a locally-created issue in place', async () => {
    vi.resetModules();
    const { createIssue, updateIssue } = await import('./issuesService');

    const created = await createIssue({
      title: 'Lampadaire cassé',
      description: 'Ne fonctionne plus',
      address: 'Avenue de la République',
    });

    const updated = await updateIssue(created.id, {
      title: 'Lampadaire réparé',
      description: 'Toujours en panne',
      location: { lat: 45.75, lng: 4.85, address: 'Avenue de la République' },
      tasks: ['Changer l\'ampoule'],
      materials: ['Ampoule LED'],
    });

    expect(updated.title).toBe('Lampadaire réparé');
    expect(updated.location).toEqual({ lat: 45.75, lng: 4.85, address: 'Avenue de la République' });
    expect(updated.tasks.map((t) => t.title)).toEqual(["Changer l'ampoule"]);
    expect(updated.materials).toEqual(['Ampoule LED']);
  });

  it('rejects updating an issue that does not exist', async () => {
    vi.resetModules();
    const { updateIssue } = await import('./issuesService');

    await expect(
      updateIssue('missing-id', {
        title: 'x',
        description: 'y',
        location: { lat: 0, lng: 0, address: 'z' },
      }),
    ).rejects.toThrow('Signalement introuvable');
  });

  it('returns an empty comment/vote list and rejects creation without Supabase', async () => {
    vi.resetModules();
    const { listComments, createComment, listVotes, createVote } = await import('./issuesService');

    await expect(listComments('issue-1')).resolves.toEqual([]);
    await expect(listVotes('issue-1')).resolves.toEqual([]);
    await expect(createComment('issue-1', 'user-1', 'hello')).rejects.toThrow('Supabase non configuré');
    await expect(createVote('issue-1', 'user-1', true)).rejects.toThrow('Supabase non configuré');
  });
});

describe('Supabase-backed reads', () => {
  it('lists issues and hydrates tasks/materials, mapping resolved -> completed', async () => {
    const { listIssues } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: [
            {
              id: 'i1',
              title: 'Trottoir dégradé',
              description: null,
              location: { lat: '45.7', address: 'Rue A' },
              image_url: null,
              is_private_property: null,
              positive_votes: 5,
              negative_votes: 1,
              created_at: '2026-01-01T00:00:00.000Z',
              status: 'resolved',
              is_municipal_project: null,
              category: null,
              created_by: 'u1',
            },
          ],
          error: null,
        },
        tasks: { data: [{ id: 't1', issue_id: 'i1', title: 'Reboucher', completed: true }], error: null },
        materials: { data: [{ id: 1, issue_id: 'i1', name: 'Bitume' }], error: null },
      }),
    );

    const result = await listIssues();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
    expect(result[0].location).toEqual({ lat: 45.7, lng: 0, address: 'Rue A' });
    expect(result[0].tasks).toEqual([{ id: 't1', title: 'Reboucher', completed: true }]);
    expect(result[0].materials).toEqual(['Bitume']);
  });

  it('propagates a database error as a plain Error', async () => {
    const { listIssues } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({ issues: { data: null, error: { message: 'db down' } } }),
    );

    await expect(listIssues()).rejects.toThrow('db down');
  });

  it('getIssueById returns null when no row matches', async () => {
    const { getIssueById } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(fakeClient({ issues: { data: null, error: null } }));

    await expect(getIssueById('missing')).resolves.toBeNull();
  });
});

describe('comments and votes', () => {
  it('maps comment rows to the public Comment shape', async () => {
    const { listComments } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        comments: {
          data: [{ id: 'c1', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'Bien vu' }],
          error: null,
        },
      }),
    );

    await expect(listComments('i1')).resolves.toEqual([
      { id: 'c1', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'Bien vu' },
    ]);
  });

  it('maps vote rows to the public Vote shape', async () => {
    const { listVotes } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        votes: { data: [{ id: 'v1', created_at: 'now', id_user: 'u1', id_issue: 'i1', yes: true }], error: null },
      }),
    );

    await expect(listVotes('i1')).resolves.toEqual([
      { id: 'v1', created_at: 'now', id_user: 'u1', id_issue: 'i1', yes: true },
    ]);
  });
});

describe('deleteIssue (delete-issue edge function)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves true when the edge function confirms deletion', async () => {
    const { deleteIssue } = await import('./issuesService');
    mockedGetAccessToken.mockResolvedValue('tok');
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);

    await expect(deleteIssue('issue-1')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/delete-issue'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        body: JSON.stringify({ issueId: 'issue-1' }),
      }),
    );
  });

  it('throws the server error message on a non-owner deletion attempt (SEC-02/03)', async () => {
    const { deleteIssue } = await import('./issuesService');
    mockedGetAccessToken.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Vous n'êtes pas autorisé à supprimer ce signalement" }),
    } as Response);

    await expect(deleteIssue('issue-1')).rejects.toThrow("Vous n'êtes pas autorisé à supprimer ce signalement");
  });
});
