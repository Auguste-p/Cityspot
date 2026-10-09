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
    from: (table: string) => tableStub(tables[table] ?? { data: null, error: null }),
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

  it('flags the comments written by a city hall account (municipal_user_ids view)', async () => {
    const { listComments } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        comments: {
          data: [
            { id: 'c1', created_at: 'now', id_user: 'mairie', id_issue: 'i1', comment: 'Pris en charge', author_name: 'Mairie de Lyon' },
            { id: 'c2', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'Merci', author_name: 'Jeanne' },
          ],
          error: null,
        },
        municipal_user_ids: { data: [{ id: 'mairie' }], error: null },
      }),
    );

    const comments = await listComments('i1');
    expect(comments.map((c) => c.authorIsMunicipal)).toEqual([true, undefined]);
  });

  it('still returns the comments, without badge, when the municipal view cannot be read', async () => {
    const { listComments } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        comments: {
          data: [{ id: 'c1', created_at: 'now', id_user: 'mairie', id_issue: 'i1', comment: 'Pris en charge', author_name: null }],
          error: null,
        },
        municipal_user_ids: { data: null, error: new Error('permission denied') },
      }),
    );

    const comments = await listComments('i1');
    expect(comments).toHaveLength(1);
    expect(comments[0].authorIsMunicipal).toBeUndefined();
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
            is_private_property: false, is_own_property: null,
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
            is_private_property: false, is_own_property: null,
            positive_votes: 0, negative_votes: 0, created_at: null, status: 'open',
            is_municipal_project: false, categories: [], created_by: 'u1', city: 'Castelnau-le-Lez', city_insee: '34057',
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
    expect(post?.cityInsee).toBe('34057');
    expect(post?.revoked).toEqual({ at: new Date('2026-10-07T10:00:00Z'), reason: 'Doublon' });
  });

  it('drops categories unknown to the app instead of letting the UI crash on them', async () => {
    const { getIssueById } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: {
            id: 'issue-1', title: 'T', description: null, location: {}, image_url: null,
            is_private_property: false, is_own_property: null,
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

  it('lists the revoked issues of a city, hydrated like the others', async () => {
    const { listRevokedIssuesByCity } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(
      fakeClient({
        issues: {
          data: [{
            id: 'issue-1', title: 'T', description: null, location: {}, image_url: null,
            is_private_property: false, is_own_property: null,
            positive_votes: 0, negative_votes: 0, created_at: null, status: 'open',
            is_municipal_project: false, categories: ['voirie'], created_by: 'u1', city: 'Lyon',
            revoked_at: '2026-10-07T10:00:00Z', revoked_reason: 'Doublon',
          }],
          error: null,
        },
        tasks: { data: [], error: null },
        materials: { data: [], error: null },
      }),
    );

    const posts = await listRevokedIssuesByCity('Lyon');
    expect(posts).toHaveLength(1);
    expect(posts[0].revoked?.reason).toBe('Doublon');
  });

  it('returns no revoked issue for an empty city or without Supabase', async () => {
    const { listRevokedIssuesByCity } = await import('./issuesService');
    mockedGetSupabaseClient.mockReturnValue(fakeClient({}));
    await expect(listRevokedIssuesByCity('')).resolves.toEqual([]);

    mockedGetSupabaseClient.mockReturnValue(null);
    vi.resetModules();
    const mod = await import('./issuesService');
    await expect(mod.listRevokedIssuesByCity('Lyon')).resolves.toEqual([]);
  });
});

describe('reportContent', () => {
  const input = { userId: 'u1', issueId: 'i1', reason: 'spam' as const };

  it('inserts the report as the caller, trimming details and defaulting comment_id to null', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    mockedGetSupabaseClient.mockReturnValue({ from } as any);
    const { reportContent } = await import('./issuesService');

    await expect(reportContent({ ...input, details: '  pub  ' })).resolves.toBe('sent');
    expect(from).toHaveBeenCalledWith('content_reports');
    expect(insert).toHaveBeenCalledWith({
      reporter_id: 'u1', issue_id: 'i1', comment_id: null, reason: 'spam', details: 'pub',
    });
  });

  it('forwards the comment id', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockedGetSupabaseClient.mockReturnValue({ from: () => ({ insert }) } as any);
    const { reportContent } = await import('./issuesService');

    await reportContent({ ...input, commentId: 'c9' });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 'c9', details: null }));
  });

  it('treats an already-reported content (unique violation) as a success', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    mockedGetSupabaseClient.mockReturnValue({ from: () => ({ insert }) } as any);
    const { reportContent } = await import('./issuesService');

    await expect(reportContent(input)).resolves.toBe('duplicate');
  });

  it('throws on any other database error and when Supabase is not configured', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '42501', message: 'rls refused' } });
    mockedGetSupabaseClient.mockReturnValue({ from: () => ({ insert }) } as any);
    const { reportContent } = await import('./issuesService');
    await expect(reportContent(input)).rejects.toThrow('rls refused');

    mockedGetSupabaseClient.mockReturnValue(null);
    await expect(reportContent(input)).rejects.toThrow('Supabase non configuré');
  });
});

// Variante de tableStub qui enregistre chaque appel (table, méthode, arguments).
function recordingClient(tables: Record<string, { data: unknown; error: unknown }>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const client = {
    from: (table: string) => {
      const result = tables[table] ?? { data: null, error: null };
      const chain: any = Promise.resolve(result);
      for (const method of ['select', 'eq', 'is', 'not', 'in', 'order', 'insert', 'update', 'upsert', 'delete']) {
        chain[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return chain;
        };
      }
      chain.single = () => Promise.resolve(result);
      chain.maybeSingle = () => Promise.resolve(result);
      return chain;
    },
    storage: { from: (bucket: string) => ({ getPublicUrl: (path: string) => ({ data: { publicUrl: `https://fake.supabase.co/${bucket}/${path}` } }) }) },
  } as any;
  return { client, calls };
}

const issueRow = { id: 'issue-1', title: 'T', description: null, location: {}, image_url: null, created_by: 'u1', categories: [] };
const ownerCalls = (calls: { table: string; method: string; args: unknown[] }[]) => calls.filter((call) => call.table === 'issue_owner_contacts');

describe('commune par code INSEE', () => {
  it('filters the issue list by city_insee', async () => {
    const { listIssues } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: [], error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await listIssues('34057');

    expect(calls).toContainEqual({ table: 'issues', method: 'eq', args: ['city_insee', '34057'] });
  });

  it('does not filter by commune when no code is given', async () => {
    const { listIssues } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: [], error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await listIssues();

    expect(calls.some((call) => call.method === 'eq' && call.args[0] === 'city_insee')).toBe(false);
  });

  it('filters the revoked issues of a commune by city_insee, and returns nothing without a code', async () => {
    const { listRevokedIssuesByCity } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: [], error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await listRevokedIssuesByCity('34057');
    expect(calls).toContainEqual({ table: 'issues', method: 'eq', args: ['city_insee', '34057'] });

    await expect(listRevokedIssuesByCity('')).resolves.toEqual([]);
  });

  it('stores the commune name and INSEE code of a new issue', async () => {
    const { createIssue } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await createIssue({ title: 'T', description: 'D', address: 'A', city: 'Castelnau-le-Lez', cityInsee: '34057' });

    const insert = calls.find((call) => call.table === 'issues' && call.method === 'insert');
    expect(insert?.args[0]).toMatchObject({ city: 'Castelnau-le-Lez', city_insee: '34057' });
  });

  it('leaves the commune untouched on update when none is resolved', async () => {
    const { updateIssue } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await updateIssue('issue-1', { title: 'T', description: 'D', location: { lat: 1, lng: 2, address: 'A' } });

    const update = calls.find((call) => call.table === 'issues' && call.method === 'update');
    expect(update?.args[0]).not.toHaveProperty('city_insee');
    expect(update?.args[0]).not.toHaveProperty('city');
  });
});

describe("e-mail du propriétaire dans une table à part", () => {
  it('writes it to issue_owner_contacts at creation, never to the issues row', async () => {
    const { createIssue } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    const post = await createIssue({ title: 'T', description: 'D', address: 'A', ownerEmail: '  prop@example.fr ' });

    const issuesInsert = calls.find((call) => call.table === 'issues' && call.method === 'insert');
    expect(issuesInsert?.args[0]).not.toHaveProperty('owner_email');
    expect(ownerCalls(calls)).toContainEqual({
      table: 'issue_owner_contacts',
      method: 'insert',
      args: [{ issue_id: expect.any(String), owner_email: 'prop@example.fr' }],
    });
    expect(post.ownerEmail).toBe('prop@example.fr');
  });

  it('writes nothing when no e-mail is given', async () => {
    const { createIssue } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    await createIssue({ title: 'T', description: 'D', address: 'A', ownerEmail: '   ' });

    expect(ownerCalls(calls)).toEqual([]);
  });

  it('replaces it on update when given, removes it when emptied', async () => {
    const { updateIssue } = await import('./issuesService');
    const input = { title: 'T', description: 'D', location: { lat: 1, lng: 2, address: 'A' } };

    const withEmail = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(withEmail.client);
    await updateIssue('issue-1', { ...input, ownerEmail: 'prop@example.fr' });
    expect(ownerCalls(withEmail.calls)).toContainEqual({
      table: 'issue_owner_contacts',
      method: 'upsert',
      args: [{ issue_id: 'issue-1', owner_email: 'prop@example.fr' }, { onConflict: 'issue_id' }],
    });

    const emptied = recordingClient({ issues: { data: issueRow, error: null } });
    mockedGetSupabaseClient.mockReturnValue(emptied.client);
    await updateIssue('issue-1', { ...input, ownerEmail: '' });
    expect(ownerCalls(emptied.calls).map((call) => call.method)).toEqual(['delete', 'eq']);
  });

  it('reads it with the issue when the RLS lets the caller see it, and not otherwise', async () => {
    const { getIssueById } = await import('./issuesService');

    mockedGetSupabaseClient.mockReturnValue(
      recordingClient({
        issues: { data: issueRow, error: null },
        issue_owner_contacts: { data: { owner_email: 'prop@example.fr' }, error: null },
      }).client,
    );
    expect((await getIssueById('issue-1'))?.ownerEmail).toBe('prop@example.fr');

    // Citoyen tiers : la RLS ne renvoie aucune ligne.
    mockedGetSupabaseClient.mockReturnValue(
      recordingClient({ issues: { data: issueRow, error: null }, issue_owner_contacts: { data: null, error: null } }).client,
    );
    expect((await getIssueById('issue-1'))?.ownerEmail).toBeUndefined();
  });

  it('does not expose the e-mail in issue lists', async () => {
    const { listIssues } = await import('./issuesService');
    const { client, calls } = recordingClient({ issues: { data: [issueRow], error: null } });
    mockedGetSupabaseClient.mockReturnValue(client);

    const [post] = await listIssues();

    expect(post.ownerEmail).toBeUndefined();
    expect(ownerCalls(calls)).toEqual([]);
  });
});
