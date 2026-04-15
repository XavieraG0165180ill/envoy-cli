import * as fs from 'fs';
import * as path from 'path';
import {
  loadSchedules,
  saveSchedules,
  addSchedule,
  removeSchedule,
  toggleSchedule,
  getSchedulesForEnvironment,
  ScheduledSync,
} from '../envSchedule';

jest.mock('fs');
jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => '/mock/.envoy',
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const SCHEDULE_PATH = '/mock/.envoy/schedules.json';

function mockSchedules(schedules: ScheduledSync[]): void {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(schedules) as any);
}

describe('envSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSchedules', () => {
    it('returns empty array if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(loadSchedules()).toEqual([]);
    });

    it('returns parsed schedules from file', () => {
      const schedules: ScheduledSync[] = [
        { id: 'prod-1', environment: 'prod', cronExpression: '0 * * * *', enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      mockSchedules(schedules);
      expect(loadSchedules()).toEqual(schedules);
    });

    it('returns empty array on parse error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json' as any);
      expect(loadSchedules()).toEqual([]);
    });
  });

  describe('addSchedule', () => {
    it('adds a new schedule and saves it', () => {
      mockFs.existsSync.mockReturnValue(false);
      const schedule = addSchedule('staging', '0 0 * * *');
      expect(schedule.environment).toBe('staging');
      expect(schedule.cronExpression).toBe('0 0 * * *');
      expect(schedule.enabled).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('removeSchedule', () => {
    it('removes an existing schedule by id', () => {
      const schedules: ScheduledSync[] = [
        { id: 'dev-1', environment: 'dev', cronExpression: '*/5 * * * *', enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      mockSchedules(schedules);
      expect(removeSchedule('dev-1')).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('returns false if schedule not found', () => {
      mockSchedules([]);
      expect(removeSchedule('nonexistent')).toBe(false);
    });
  });

  describe('toggleSchedule', () => {
    it('disables an enabled schedule', () => {
      const schedules: ScheduledSync[] = [
        { id: 'prod-1', environment: 'prod', cronExpression: '0 * * * *', enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      mockSchedules(schedules);
      expect(toggleSchedule('prod-1', false)).toBe(true);
    });

    it('returns false if schedule not found', () => {
      mockSchedules([]);
      expect(toggleSchedule('missing', true)).toBe(false);
    });
  });

  describe('getSchedulesForEnvironment', () => {
    it('filters schedules by environment', () => {
      const schedules: ScheduledSync[] = [
        { id: 'prod-1', environment: 'prod', cronExpression: '0 * * * *', enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dev-1', environment: 'dev', cronExpression: '*/5 * * * *', enabled: true, createdAt: '2024-01-01T00:00:00.000Z' },
      ];
      mockSchedules(schedules);
      const result = getSchedulesForEnvironment('prod');
      expect(result).toHaveLength(1);
      expect(result[0].environment).toBe('prod');
    });
  });
});
