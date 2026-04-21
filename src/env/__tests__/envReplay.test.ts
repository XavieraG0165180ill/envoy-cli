import { buildReplaySession, getStepAt, replayToTimestamp } from '../envReplay';
import * as envHistory from '../envHistory';
import * as envAudit from '../envAudit';

jest.mock('../envHistory');
jest.mock('../envAudit');

const mockHistory = [
  { environment: 'production', timestamp: '2024-01-01T10:00:00Z', keys: ['API_KEY'], snapshot: { API_KEY: 'abc' } },
  { environment: 'production', timestamp: '2024-01-02T10:00:00Z', keys: ['DB_URL'], snapshot: { API_KEY: 'abc', DB_URL: 'postgres://localhost' } },
  { environment: 'staging', timestamp: '2024-01-01T09:00:00Z', keys: ['API_KEY'], snapshot: { API_KEY: 'xyz' } },
];

const mockAudit = [
  { environment: 'production', timestamp: '2024-01-01T10:00:00Z', action: 'push', user: 'alice' },
  { environment: 'production', timestamp: '2024-01-02T10:00:00Z', action: 'push', user: 'bob' },
];

beforeEach(() => {
  (envHistory.loadHistory as jest.Mock).mockReturnValue(mockHistory);
  (envAudit.loadAuditLog as jest.Mock).mockReturnValue(mockAudit);
});

describe('buildReplaySession', () => {
  it('builds a session with only matching environment steps', () => {
    const session = buildReplaySession('production');
    expect(session.environment).toBe('production');
    expect(session.steps).toHaveLength(2);
  });

  it('filters steps by from date', () => {
    const session = buildReplaySession('production', '2024-01-02T00:00:00Z');
    expect(session.steps).toHaveLength(1);
    expect(session.steps[0].timestamp).toBe('2024-01-02T10:00:00Z');
  });

  it('filters steps by to date', () => {
    const session = buildReplaySession('production', undefined, '2024-01-01T23:59:59Z');
    expect(session.steps).toHaveLength(1);
    expect(session.steps[0].timestamp).toBe('2024-01-01T10:00:00Z');
  });

  it('maps audit action onto steps', () => {
    const session = buildReplaySession('production');
    expect(session.steps[0].action).toBe('push');
    expect(session.steps[1].action).toBe('push');
  });

  it('defaults action to unknown when no audit entry found', () => {
    (envAudit.loadAuditLog as jest.Mock).mockReturnValue([]);
    const session = buildReplaySession('production');
    expect(session.steps[0].action).toBe('unknown');
  });
});

describe('getStepAt', () => {
  it('returns the step at the given index', () => {
    const session = buildReplaySession('production');
    const step = getStepAt(session, 0);
    expect(step?.keys).toContain('API_KEY');
  });

  it('returns undefined for out-of-bounds index', () => {
    const session = buildReplaySession('production');
    expect(getStepAt(session, 99)).toBeUndefined();
  });
});

describe('replayToTimestamp', () => {
  it('returns the latest step at or before the given timestamp', () => {
    const session = buildReplaySession('production');
    const step = replayToTimestamp(session, '2024-01-01T23:59:59Z');
    expect(step?.timestamp).toBe('2024-01-01T10:00:00Z');
  });

  it('returns undefined when no steps are before the timestamp', () => {
    const session = buildReplaySession('production');
    const step = replayToTimestamp(session, '2023-12-31T00:00:00Z');
    expect(step).toBeUndefined();
  });
});
