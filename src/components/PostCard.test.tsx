// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { PostCard } from './PostCard';
import type { Post } from '../types/Post';

afterEach(cleanup);

function buildPost(overrides: Partial<Post> = {}): Post {
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

  it('a revoked signalement shows the "Révoqué" badge instead of its status, with no violation', async () => {
    const { container } = render(
      <PostCard post={buildPost({ revoked: { at: new Date('2026-10-07'), reason: 'Doublon' } })} />,
    );
    expect(screen.getByText('Révoqué')).toBeTruthy();
    expect(screen.queryByText('En vote')).toBeNull();
    await expectNoA11yViolations(container);
  });
});

describe('PostCard layout', () => {
  it('puts the address, the categories and the votes on three separate lines', () => {
    render(<PostCard post={buildPost({ categories: ['voirie', 'peinture'] })} />);

    const address = screen.getByTestId('card-address');
    const categories = screen.getByTestId('card-categories');
    const progress = screen.getByTestId('card-progress');

    expect(new Set([address, categories, progress]).size).toBe(3);
    expect(address.parentElement).toBe(categories.parentElement);
    expect(categories.parentElement).toBe(progress.parentElement);
    expect(address.textContent).toContain('12 rue Victor Hugo');
    expect(categories.textContent).toMatch(/Voirie.*Peinture/);
    expect(progress.textContent).toContain('/');
    expect(progress.textContent).toContain('votes');
    // L'adresse ne contient ni catégorie ni vote.
    expect(address.textContent).not.toMatch(/Voirie|votes/);
  });

  it('omits the lines that have nothing to show', () => {
    render(<PostCard post={buildPost({ categories: [], status: 'completed', tasks: [] })} />);

    expect(screen.queryByTestId('card-categories')).toBeNull();
    expect(screen.getByTestId('card-progress').textContent).toContain('0/0');
    expect(screen.queryByText(/votes/)).toBeNull();
  });

  it('shows the private-property mention on the last line with the votes', () => {
    render(<PostCard post={buildPost({ isPrivateProperty: true })} />);

    const progress = screen.getByTestId('card-progress');
    expect(progress.textContent).toContain('votes');
    expect(progress.textContent).toContain('Privé');
  });
});
