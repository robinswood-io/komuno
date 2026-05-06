import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, selectBuilder, schema } from './storage.test-helpers';

describe('server/storage.js iteration 143', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('hasUserRegistered returns true when matching inscription exists', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([[schema.inscriptions, [{ id: 'insc-143' }]]]),
      ),
    );

    const storage = createStorage();
    const result = await storage.hasUserRegistered('evt-143-a', 'member143@example.com');

    expect(result).toBe(true);
  });

  it('hasUserRegistered returns false when no inscription exists', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.inscriptions, []]])),
    );

    const storage = createStorage();
    const result = await storage.hasUserRegistered('evt-143-b', 'none143@example.com');

    expect(result).toBe(false);
  });

  it('hasUserVoted returns true when matching vote exists', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.votes, [{ id: 'vote-143' }]]])),
    );

    const storage = createStorage();
    const result = await storage.hasUserVoted('idea-143-a', 'voter143@example.com');

    expect(result).toBe(true);
  });

  it('hasUserVoted returns false when vote does not exist', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(new Map<unknown, unknown[]>([[schema.votes, []]])),
    );

    const storage = createStorage();
    const result = await storage.hasUserVoted('idea-143-b', 'novoter143@example.com');

    expect(result).toBe(false);
  });
});
