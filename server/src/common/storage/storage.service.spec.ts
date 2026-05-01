import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockSessionStore {
  id: string;
}

interface MockDb {
  name: string;
}

const mockState = vi.hoisted(() => ({
  constructorError: null as Error | null,
  sessionStoreError: null as Error | null,
  dbError: null as Error | null,
  constructorCalls: 0,
  sessionStoreValue: { id: 'session-store' } as MockSessionStore,
  dbValue: { name: 'mock-db' } as MockDb,
}));

vi.mock('../../../storage', () => {
  class MockDatabaseStorage {
    constructor() {
      mockState.constructorCalls += 1;
      if (mockState.constructorError) {
        throw mockState.constructorError;
      }
    }

    get sessionStore(): MockSessionStore {
      if (mockState.sessionStoreError) {
        throw mockState.sessionStoreError;
      }
      return mockState.sessionStoreValue;
    }
  }

  return {
    DatabaseStorage: MockDatabaseStorage,
  };
});

vi.mock('../../../db', () => ({
  get db(): MockDb {
    if (mockState.dbError) {
      throw mockState.dbError;
    }
    return mockState.dbValue;
  },
}));

import { StorageService } from './storage.service';

describe('StorageService', () => {
  beforeEach(() => {
    mockState.constructorError = null;
    mockState.sessionStoreError = null;
    mockState.dbError = null;
    mockState.constructorCalls = 0;
    mockState.sessionStoreValue = { id: 'session-store' };
    mockState.dbValue = { name: 'mock-db' };
  });

  describe('constructor', () => {
    it('should instantiate DatabaseStorage successfully', () => {
      const service = new StorageService();

      expect(service.storage).toBeDefined();
      expect(mockState.constructorCalls).toBe(1);
    });

    it('should propagate constructor errors from DatabaseStorage', () => {
      mockState.constructorError = new Error('storage init failed');

      expect(() => new StorageService()).toThrow('storage init failed');
      expect(mockState.constructorCalls).toBe(1);
    });
  });

  describe('sessionStore', () => {
    it('should expose sessionStore from wrapped storage', () => {
      const service = new StorageService();

      const result = service.sessionStore;

      expect(result).toEqual({ id: 'session-store' });
    });

    it('should propagate errors from wrapped sessionStore getter', () => {
      const service = new StorageService();
      mockState.sessionStoreError = new Error('session store unavailable');

      expect(() => service.sessionStore).toThrow('session store unavailable');
    });
  });

  describe('instance', () => {
    it('should return the wrapped storage instance', () => {
      const service = new StorageService();

      expect(service.instance).toBe(service.storage);
    });

    it('should propagate errors when storage reference is unavailable', () => {
      const service = new StorageService();

      Object.defineProperty(service, 'storage', {
        configurable: true,
        get() {
          throw new Error('storage reference unavailable');
        },
      });

      expect(() => service.instance).toThrow('storage reference unavailable');
    });
  });

  describe('getDb', () => {
    it('should expose drizzle db instance', () => {
      const service = new StorageService();

      const result = service.getDb();

      expect(result).toEqual({ name: 'mock-db' });
    });

    it('should propagate db access errors', () => {
      const service = new StorageService();
      mockState.dbError = new Error('db unavailable');

      expect(() => service.getDb()).toThrow('db unavailable');
    });
  });
});
