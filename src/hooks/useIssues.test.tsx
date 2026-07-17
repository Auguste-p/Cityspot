// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/issuesService', () => ({
  listIssues: vi.fn(),
  getIssueById: vi.fn(),
  listComments: vi.fn(),
  createComment: vi.fn(),
  listVotes: vi.fn(),
  createVote: vi.fn(),
}));

import {
  createComment,
  createVote,
  getIssueById,
  listComments,
  listIssues,
  listVotes,
} from '../services/issuesService';
import { useComments, useIssue, useIssues, useVotes } from './useIssues';

afterEach(() => {
  vi.resetAllMocks();
});

describe('useIssues', () => {
  it('loads issues and clears the loading flag', async () => {
    vi.mocked(listIssues).mockResolvedValue([{ id: '1' } as any]);
    const { result } = renderHook(() => useIssues());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.issues).toEqual([{ id: '1' }]);
    expect(result.current.error).toBeNull();
  });

  it('captures a thrown error instead of crashing', async () => {
    vi.mocked(listIssues).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useIssues());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('network down');
    expect(result.current.issues).toEqual([]);
  });

  it('reload() refetches the issue list', async () => {
    vi.mocked(listIssues).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: '2' } as any]);
    const { result } = renderHook(() => useIssues());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.issues).toEqual([{ id: '2' }]);
  });
});

describe('useIssue', () => {
  it('skips fetching when no id is given', async () => {
    const { result } = renderHook(() => useIssue(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.issue).toBeNull();
    expect(getIssueById).not.toHaveBeenCalled();
  });

  it('loads a single issue by id', async () => {
    vi.mocked(getIssueById).mockResolvedValue({ id: '42' } as any);
    const { result } = renderHook(() => useIssue('42'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.issue).toEqual({ id: '42' });
  });
});

describe('useComments', () => {
  it('appends a new comment locally once addComment resolves', async () => {
    vi.mocked(listComments).mockResolvedValue([]);
    vi.mocked(createComment).mockResolvedValue({
      id: 'c1',
      created_at: 'now',
      id_user: 'u1',
      id_issue: 'i1',
      comment: 'hello',
    });

    const { result } = renderHook(() => useComments('i1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addComment('u1', 'hello');
    });

    expect(result.current.comments).toEqual([
      { id: 'c1', created_at: 'now', id_user: 'u1', id_issue: 'i1', comment: 'hello' },
    ]);
  });
});

describe('useVotes', () => {
  it('appends a new vote locally once addVote resolves', async () => {
    vi.mocked(listVotes).mockResolvedValue([]);
    vi.mocked(createVote).mockResolvedValue({
      id: 'v1',
      created_at: 'now',
      id_user: 'u1',
      id_issue: 'i1',
      yes: true,
    });

    const { result } = renderHook(() => useVotes('i1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addVote('u1', true);
    });

    expect(result.current.votes).toEqual([
      { id: 'v1', created_at: 'now', id_user: 'u1', id_issue: 'i1', yes: true },
    ]);
  });
});
