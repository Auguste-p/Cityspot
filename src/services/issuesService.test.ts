import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '../lib/supabase';

const mockedGetSupabaseClient = vi.mocked(getSupabaseClient);

// Minimal chainable stand-in for the Supabase query builder: every intermediate
// call (select/eq/in/order/insert/update/delete) returns the same thenable, and
// awaiting it resolves to the row(s) configured for that table.
function tableStub(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);
  const chain: any = resolved;
  for (const method of ['select', 'eq', 'is', 'not', 'in', 'order', 'insert', 'update', 'delete']) {
    chain[method] = () => chain;
  }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

function fakeClient(tables: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: (table: string) => tableStub(tables[table]),
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://fake.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  } as any;
}

afterEach(() => {
  mockedGetSupabaseClient.mockReset();
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
              categories: [],
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
          data: [{ id: 'c1', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'Bien vu', author_name: 'Jeanne Dupont' }],
          error: null,
        },
      }),
    );

    await expect(listComments('i1')).resolves.toEqual([
      { id: 'c1', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'Bien vu', authorName: 'Jeanne Dupont' },
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

describe('deleteIssue (RLS directe sur `issues`)', () => {
  it('resolves true when the row is actually deleted (owner)', async () => {
    const { deleteIssue } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: { data: [{ id: 'issue-1' }], error: null },
      }),
    );

    await expect(deleteIssue('issue-1')).resolves.toBe(true);
  });

  it('throws when RLS silently blocks a non-owner (0 row returned, SEC-02/03)', async () => {
    const { deleteIssue } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: { data: [], error: null },
      }),
    );

    await expect(deleteIssue('issue-1')).rejects.toThrow("Vous n'êtes pas autorisé à supprimer ce signalement");
  });

  it('throws the database error message on a real error', async () => {
    const { deleteIssue } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: { data: null, error: new Error('connection lost') },
      }),
    );

    await expect(deleteIssue('issue-1')).rejects.toThrow('connection lost');
  });

  it('returns no private note and rejects saving one without Supabase', async () => {
    vi.resetModules();
    const { getPrivateNote, savePrivateNote } = await import('./issuesService');

    await expect(getPrivateNote('issue-1')).resolves.toBe('');
    await expect(savePrivateNote('issue-1', 'user-1', 'note')).rejects.toThrow('Supabase non configuré');
  });
  it('revokes an issue through the revoke_issue RPC', async () => {
    const { revokeIssue } = await import('./issuesService');
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const invoke = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ rpc, functions: { invoke } } as any);

    await expect(revokeIssue('issue-1', 'Hors compétence communale')).resolves.toEqual({ emailSent: true });

    expect(rpc).toHaveBeenCalledWith('revoke_issue', {
      p_issue_id: 'issue-1',
      p_reason: 'Hors compétence communale',
    });
    expect(invoke).toHaveBeenCalledWith('notify-revocation', { body: { issueId: 'issue-1' } });
  });

  it('keeps the revocation valid when the notification email fails', async () => {
    const { revokeIssue } = await import('./issuesService');
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const invoke = vi.fn().mockResolvedValue({ error: new Error('resend down') });
    mockedGetSupabaseClient.mockReturnValue({ rpc, functions: { invoke } } as any);

    await expect(revokeIssue('issue-1', 'Doublon')).resolves.toEqual({ emailSent: false });
  });

  it('does not send any email when the revocation itself is refused', async () => {
    const { revokeIssue } = await import('./issuesService');
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'Révocation refusée' } });
    const invoke = vi.fn();
    mockedGetSupabaseClient.mockReturnValue({ rpc, functions: { invoke } } as any);

    await expect(revokeIssue('issue-1', 'Doublon')).rejects.toThrow('Révocation refusée');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('lists the revoked issues of a user, hydrated like the others', async () => {
    const { listRevokedIssuesByUser } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: [{
            id: 'issue-1', title: 'T', description: null, location: {}, image_url: null,
            is_private_property: false, is_own_property: null, owner_email: null,
            positive_votes: 0, negative_votes: 0, created_at: null, status: 'open',
            is_municipal_project: false, categories: [], created_by: 'u1', city: 'Castelnau-le-Lez',
            revoked_at: '2026-10-07T10:00:00Z', revoked_reason: 'Doublon',
          }],
          error: null,
        },
        tasks: { data: [], error: null },
        materials: { data: [], error: null },
      }),
    );

    const posts = await listRevokedIssuesByUser('u1');
    expect(posts).toHaveLength(1);
    expect(posts[0].revoked?.reason).toBe('Doublon');
  });

  it('returns no revoked issue without Supabase', async () => {
    mockedGetSupabaseClient.mockReturnValue(null);
    vi.resetModules();
    const { listRevokedIssuesByUser } = await import('./issuesService');
    await expect(listRevokedIssuesByUser('u1')).resolves.toEqual([]);
  });

  it('surfaces the RPC refusal when revoking is not allowed', async () => {
    const { revokeIssue } = await import('./issuesService');
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'Révocation refusée' } });
    mockedGetSupabaseClient.mockReturnValue({ rpc, functions: { invoke: vi.fn() } } as any);

    await expect(revokeIssue('issue-1', 'motif')).rejects.toThrow('Révocation refusée');
  });

  it('maps revocation columns and city onto the post', async () => {
    const { getIssueById } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: {
            id: 'issue-1', title: 'T', description: null, location: {}, image_url: null,
            is_private_property: false, is_own_property: null, owner_email: null,
            positive_votes: 0, negative_votes: 0, created_at: null, status: 'open',
            is_municipal_project: false, categories: [], created_by: 'u1', city: 'Castelnau-le-Lez',
            revoked_at: '2026-10-07T10:00:00Z', revoked_reason: 'Doublon',
          },
          error: null,
        },
        tasks: { data: [], error: null },
        materials: { data: [], error: null },
      }),
    );

    const post = await getIssueById('issue-1');
    expect(post?.city).toBe('Castelnau-le-Lez');
    expect(post?.revoked).toEqual({ at: new Date('2026-10-07T10:00:00Z'), reason: 'Doublon' });
  });

  it('drops categories unknown to the app instead of letting the UI crash on them', async () => {
    const { getIssueById } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: {
            id: 'issue-1', title: 'T', description: null, location: {}, image_url: null,
            is_private_property: false, is_own_property: null, owner_email: null,
            positive_votes: 0, negative_votes: 0, created_at: null, status: 'open',
            is_municipal_project: false, categories: ['voirie', 'pothole', ''], created_by: 'u1', city: null,
          },
          error: null,
        },
        tasks: { data: [], error: null },
        materials: { data: [], error: null },
      }),
    );

    const post = await getIssueById('issue-1');
    expect(post?.categories).toEqual(['voirie']);
  });

  it('reports whether the mairie notification was sent, found nobody, or failed', async () => {
    const { notifyMairie } = await import('./issuesService');
    const invoke = vi.fn();
    mockedGetSupabaseClient.mockReturnValue({ functions: { invoke } } as any);

    invoke.mockResolvedValueOnce({ data: { sent: 2 }, error: null });
    await expect(notifyMairie('issue-1')).resolves.toBe('sent');
    expect(invoke).toHaveBeenCalledWith('notify-mairie', { body: { issueId: 'issue-1' } });

    invoke.mockResolvedValueOnce({ data: { sent: 0 }, error: null });
    await expect(notifyMairie('issue-1')).resolves.toBe('none');

    invoke.mockResolvedValueOnce({ data: null, error: new Error('resend down') });
    await expect(notifyMairie('issue-1')).resolves.toBe('failed');
  });

  it('does not notify anyone without Supabase', async () => {
    mockedGetSupabaseClient.mockReturnValue(null);
    vi.resetModules();
    const { notifyMairie } = await import('./issuesService');
    await expect(notifyMairie('issue-1')).resolves.toBe('none');
  });

  it('logs the HTTP status and body of a failing Edge Function so the cause is readable in the console', async () => {
    const { notifyMairie } = await import('./issuesService');
    const context = new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
    const invoke = vi.fn().mockResolvedValue({ data: null, error: Object.assign(new Error('non-2xx'), { context }) });
    mockedGetSupabaseClient.mockReturnValue({ functions: { invoke } } as any);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyMairie('issue-1')).resolves.toBe('failed');

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('notify-mairie'), 401, expect.stringContaining('Non authentifié'));
    consoleError.mockRestore();
  });
});
