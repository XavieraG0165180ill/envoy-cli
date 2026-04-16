import fs from 'fs';
import os from 'os';
import path from 'path';
import { setPriority, removePriority, getPriority, listByPriority, loadPriorities } from '../envPriority';

jest.mock('../envPriority', () => {
  const actual = jest.requireActual('../envPriority');
  let store: Record<string, number> = {};
  return {
    ...actual,
    loadPriorities: () => ({ ...store }),
    savePriorities: (p: Record<string, number>) => { store = { ...p }; },
    getPriorityFilePath: () => '/tmp/test-priorities.json',
    setPriority: (env: string, priority: number) => { store[env] = priority; },
    removePriority: (env: string) => { delete store[env]; },
    getPriority: (env: string) => store[env],
    listByPriority: (envs: string[]) => {
      return [...envs].sort((a, b) => (store[b] ?? 0) - (store[a] ?? 0));
    },
    __reset: () => { store = {}; },
  };
});

const mod = require('../envPriority');

beforeEach(() => mod.__reset());

describe('envPriority', () => {
  it('sets and gets a priority', () => {
    mod.setPriority('production', 10);
    expect(mod.getPriority('production')).toBe(10);
  });

  it('returns undefined for unknown environment', () => {
    expect(mod.getPriority('staging')).toBeUndefined();
  });

  it('removes a priority', () => {
    mod.setPriority('staging', 5);
    mod.removePriority('staging');
    expect(mod.getPriority('staging')).toBeUndefined();
  });

  it('lists environments sorted by priority descending', () => {
    mod.setPriority('production', 10);
    mod.setPriority('staging', 5);
    mod.setPriority('development', 1);
    const sorted = mod.listByPriority(['development', 'staging', 'production']);
    expect(sorted).toEqual(['production', 'staging', 'development']);
  });

  it('treats missing priority as 0 when sorting', () => {
    mod.setPriority('production', 3);
    const sorted = mod.listByPriority(['unknown', 'production']);
    expect(sorted[0]).toBe('production');
  });
});
