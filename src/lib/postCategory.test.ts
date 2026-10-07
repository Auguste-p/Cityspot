import { describe, expect, it } from 'vitest';
import { requiresAuthorization } from './postCategory';

describe('requiresAuthorization', () => {
  it.each(['voirie', 'eclairage', 'securite', 'mobilier-urbain'] as const)('is true as soon as %s is selected', (category) => {
    expect(requiresAuthorization([category])).toBe(true);
    expect(requiresAuthorization(['proprete', category])).toBe(true);
  });

  it('is false for categories that need no authorization, or none at all', () => {
    expect(requiresAuthorization([])).toBe(false);
    expect(requiresAuthorization(['proprete', 'espaces-verts'])).toBe(false);
  });
});
