// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../../test/a11y';
import { Card } from './card';

afterEach(cleanup);

describe('Card keyboard accessibility', () => {
  it('is not focusable or a button when no onClick is given', () => {
    render(<Card>Static content</Card>);
    const el = screen.getByText('Static content');
    expect(el.getAttribute('role')).not.toBe('button');
    expect(el.getAttribute('tabindex')).toBeNull();
  });

  it('is reachable by keyboard and activatable with Enter when clickable', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Nid de poule rue Victor Hugo</Card>);

    const card = screen.getByRole('button', { name: /nid de poule/i });
    expect(card.getAttribute('tabindex')).toBe('0');

    card.focus();
    expect(document.activeElement).toBe(card);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates on Space as well', () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Signalement</Card>);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Card accessibility (RGAA / axe-core)', () => {
  it('has no automatically-detectable violation when clickable', async () => {
    const { container } = render(<Card onClick={() => {}}>Nid de poule rue Victor Hugo</Card>);
    await expectNoA11yViolations(container);
  });
});
