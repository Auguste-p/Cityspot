import { describe, expect, it } from 'vitest';
import { VOTE_GOAL, getActualStatus, getNetVotes, getStatusConfig } from './postStatus';

describe('getNetVotes', () => {
  it('subtracts negative votes from positive votes', () => {
    expect(getNetVotes({ votes: { positive: 12, negative: 4 } })).toBe(8);
  });

  it('can be negative when downvotes dominate', () => {
    expect(getNetVotes({ votes: { positive: 1, negative: 5 } })).toBe(-4);
  });
});

describe('getActualStatus', () => {
  it('stays pending below the vote goal', () => {
    const post = { status: 'pending' as const, votes: { positive: VOTE_GOAL - 1, negative: 0 } };
    expect(getActualStatus(post)).toBe('pending');
  });

  it('flips to in-progress once net votes reach the goal', () => {
    const post = { status: 'pending' as const, votes: { positive: VOTE_GOAL, negative: 0 } };
    expect(getActualStatus(post)).toBe('in-progress');
  });

  it('keeps a completed post completed regardless of votes', () => {
    const post = { status: 'completed' as const, votes: { positive: 0, negative: 0 } };
    expect(getActualStatus(post)).toBe('completed');
  });
});

describe('getStatusConfig', () => {
  it('returns a distinct label for each status', () => {
    expect(getStatusConfig('pending').label).toBe('En vote');
    expect(getStatusConfig('in-progress').label).toBe('En cours');
    expect(getStatusConfig('completed').label).toBe('Terminé');
  });
});
