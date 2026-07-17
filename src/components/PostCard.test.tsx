// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { PostCard } from './PostCard';
import type { Post } from '../types/Post';

afterEach(cleanup);

function buildPost(overrides: Partial<Post> = {}): Post {
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
    ...overrides,
  };
}

describe('PostCard accessibility (RGAA / axe-core)', () => {
  it('a standard public signalement has no violation', async () => {
    const { container } = render(<PostCard post={buildPost()} />);
    await expectNoA11yViolations(container);
  });

  it('a municipal, in-progress, private-property signalement has no violation', async () => {
    const post = buildPost({
      status: 'in-progress',
      isMunicipalProject: true,
      isPrivateProperty: true,
      votes: { positive: 10, negative: 0 },
    });
    const { container } = render(<PostCard post={post} />);
    await expectNoA11yViolations(container);
  });

  it('a clickable card (button role) has no violation', async () => {
    const { container } = render(<PostCard post={buildPost()} onClick={() => {}} />);
    await expectNoA11yViolations(container);
  });
});
