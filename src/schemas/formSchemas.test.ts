import { describe, expect, it } from 'vitest';
import { createPostSchema, settingsFormSchema } from './formSchemas';

const validPost = {
  title: 'Nid de poule',
  description: 'Un gros nid de poule dangereux pour les cyclistes.',
  address: '12 rue de la Paix, Paris',
  isPrivateProperty: 'public' as const,
  isOwnProperty: 'no' as const,
};

describe('createPostSchema', () => {
  it('accepts a valid public-property post', () => {
    expect(createPostSchema.safeParse(validPost).success).toBe(true);
  });

  it('rejects a title that is too short', () => {
    const result = createPostSchema.safeParse({ ...validPost, title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('requires an owner email for private property not owned by the reporter', () => {
    const result = createPostSchema.safeParse({
      ...validPost,
      isPrivateProperty: 'private',
      isOwnProperty: 'no',
      ownerEmail: '',
    });
    expect(result.success).toBe(false);
  });

  it('does not require an owner email when the reporter owns the property', () => {
    const result = createPostSchema.safeParse({
      ...validPost,
      isPrivateProperty: 'private',
      isOwnProperty: 'yes',
    });
    expect(result.success).toBe(true);
  });
});

describe('settingsFormSchema', () => {
  const validSettings = { name: 'Alice', email: 'alice@example.com' };

  it('accepts a minimal valid profile', () => {
    expect(settingsFormSchema.safeParse(validSettings).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = settingsFormSchema.safeParse({ ...validSettings, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid phone number when provided', () => {
    const result = settingsFormSchema.safeParse({ ...validSettings, phone: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = settingsFormSchema.safeParse({ ...validSettings, extra: 'nope' });
    expect(result.success).toBe(false);
  });
});
