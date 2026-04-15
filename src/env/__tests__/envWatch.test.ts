import fs from 'fs';
import path from 'path';
import {
  watchEnvironment,
  unwatchEnvironment,
  unwatchAll,
  listWatched,
  WatchEvent,
} from '../envWatch';
import { getStorePath } from '../envStore';

jest.mock('fs');
jest.mock('../envStore');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGetStorePath = getStorePath as jest.MockedFunction<typeof getStorePath>;

describe('envWatch', () => {
  const mockWatcher = { close: jest.fn() } as unknown as fs.FSWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    unwatchAll();
    mockGetStorePath.mockReturnValue('/mock/.envoy/production.enc');
    mockFs.watch.mockReturnValue(mockWatcher);
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
  });

  describe('watchEnvironment', () => {
    it('should start watching the environment directory', () => {
      watchEnvironment('production', jest.fn());
      expect(mockFs.watch).toHaveBeenCalledWith(
        path.dirname('/mock/.envoy/production.enc'),
        expect.any(Function)
      );
    });

    it('should call callback with modified event when file changes', () => {
      const callback = jest.fn();
      mockFs.watch.mockImplementation((_dir, cb) => {
        (cb as Function)('change', 'production.enc');
        return mockWatcher;
      });

      watchEnvironment('production', callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'production',
          changeType: 'modified',
        })
      );
    });

    it('should ignore events for other files', () => {
      const callback = jest.fn();
      mockFs.watch.mockImplementation((_dir, cb) => {
        (cb as Function)('change', 'staging.enc');
        return mockWatcher;
      });

      watchEnvironment('production', callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('unwatchEnvironment', () => {
    it('should return false if not watching', () => {
      expect(unwatchEnvironment('staging')).toBe(false);
    });

    it('should close watcher and return true', () => {
      watchEnvironment('production', jest.fn());
      expect(unwatchEnvironment('production')).toBe(true);
      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });

  describe('listWatched', () => {
    it('should list active watchers', () => {
      watchEnvironment('production', jest.fn());
      watchEnvironment('staging', jest.fn());
      expect(listWatched()).toEqual(expect.arrayContaining(['production', 'staging']));
    });
  });
});
