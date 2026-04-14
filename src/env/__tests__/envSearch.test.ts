import { searchInEnvironment, searchAcrossEnvironments } from '../envSearch';
import * as envStore from '../envStore';
import * as keyManager from '../../crypto/keyManager';
import * as encryption from '../../crypto/encryption';

jest.mock('../envStore');
jest.mock('../../crypto/keyManager');
jest.mock('../../crypto/encryption');

const mockEnvContent = `API_KEY=secret123
DB_HOST=localhost
DB_PORT=5432
DEBUG=true
`;

beforeEach(() => {
  jest.clearAllMocks();
  (keyManager.loadMasterKey as jest.Mock).mockResolvedValue(Buffer.from('key'));
  (envStore.loadEncryptedEnv as jest.Mock).mockResolvedValue('encrypted');
  (encryption.decrypt as jest.Mock).mockResolvedValue(mockEnvContent);
});

describe('searchInEnvironment', () => {
  it('finds entries by key pattern', async () => {
    const results = await searchInEnvironment('production', { keyPattern: 'DB_' });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.key)).toEqual(['DB_HOST', 'DB_PORT']);
  });

  it('finds entries by value pattern', async () => {
    const results = await searchInEnvironment('production', { valuePattern: 'local' });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('DB_HOST');
  });

  it('supports case-insensitive search by default', async () => {
    const results = await searchInEnvironment('production', { keyPattern: 'api_key' });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('API_KEY');
  });

  it('supports exact match on value', async () => {
    const results = await searchInEnvironment('production', {
      valuePattern: 'true',
      exactMatch: true,
    });
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('DEBUG');
  });

  it('returns all entries when no pattern provided', async () => {
    const results = await searchInEnvironment('production', {});
    expect(results).toHaveLength(4);
  });

  it('includes line numbers in results', async () => {
    const results = await searchInEnvironment('production', { keyPattern: 'API_KEY' });
    expect(results[0].line).toBe(1);
  });
});

describe('searchAcrossEnvironments', () => {
  it('aggregates results from multiple environments', async () => {
    const results = await searchAcrossEnvironments(['dev', 'prod'], { keyPattern: 'API_KEY' });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.environment)).toEqual(['dev', 'prod']);
  });

  it('skips environments that fail to load', async () => {
    (envStore.loadEncryptedEnv as jest.Mock)
      .mockResolvedValueOnce('encrypted')
      .mockRejectedValueOnce(new Error('not found'));
    const results = await searchAcrossEnvironments(['dev', 'missing'], { keyPattern: 'DB_' });
    expect(results).toHaveLength(2);
  });
});
