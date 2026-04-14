import { createTagCommand } from '../tag';
import * as envTag from '../../../env/envTag';

jest.mock('../../../env/envTag');

const mockAddTag = envTag.addTag as jest.Mock;
const mockRemoveTag = envTag.removeTag as jest.Mock;
const mockGetTag = envTag.getTag as jest.Mock;
const mockLoadTags = envTag.loadTags as jest.Mock;
const mockListTagsForEnvironment = envTag.listTagsForEnvironment as jest.Mock;

let consoleSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let exitSpy: jest.SpyInstance;

beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  errorSpy = jest.spyOn(console, 'error').mockImplementation();
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  jest.clearAllMocks();
});

afterEach(() => {
  consoleSpy.mockRestore();
  errorSpy.mockRestore();
  exitSpy.mockRestore();
});

describe('tag add', () => {
  it('adds a tag for an environment', async () => {
    const cmd = createTagCommand();
    await cmd.parseAsync(['add', 'v1.0', 'production'], { from: 'user' });
    expect(mockAddTag).toHaveBeenCalledWith('v1.0', 'production');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('v1.0'));
  });
});

describe('tag remove', () => {
  it('removes an existing tag', async () => {
    mockRemoveTag.mockReturnValue(true);
    const cmd = createTagCommand();
    await cmd.parseAsync(['remove', 'v1.0'], { from: 'user' });
    expect(mockRemoveTag).toHaveBeenCalledWith('v1.0');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('removed'));
  });

  it('exits with error if tag not found', async () => {
    mockRemoveTag.mockReturnValue(false);
    const cmd = createTagCommand();
    await expect(cmd.parseAsync(['remove', 'missing'], { from: 'user' })).rejects.toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });
});

describe('tag show', () => {
  it('shows tag details', async () => {
    mockGetTag.mockReturnValue({ tag: 'v1.0', environment: 'production', createdAt: '2024-01-01T00:00:00.000Z' });
    const cmd = createTagCommand();
    await cmd.parseAsync(['show', 'v1.0'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  it('exits if tag not found', async () => {
    mockGetTag.mockReturnValue(undefined);
    const cmd = createTagCommand();
    await expect(cmd.parseAsync(['show', 'missing'], { from: 'user' })).rejects.toThrow('exit');
  });
});

describe('tag list', () => {
  it('lists all tags when no environment given', async () => {
    mockLoadTags.mockReturnValue({ 'v1.0': { tag: 'v1.0', environment: 'production', createdAt: '2024-01-01T00:00:00.000Z' } });
    const cmd = createTagCommand();
    await cmd.parseAsync(['list'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('v1.0'));
  });

  it('filters tags by environment', async () => {
    mockListTagsForEnvironment.mockReturnValue([{ tag: 'v1.0', environment: 'production', createdAt: '2024-01-01T00:00:00.000Z' }]);
    const cmd = createTagCommand();
    await cmd.parseAsync(['list', 'production'], { from: 'user' });
    expect(mockListTagsForEnvironment).toHaveBeenCalledWith('production');
  });

  it('prints message when no tags found', async () => {
    mockListTagsForEnvironment.mockReturnValue([]);
    const cmd = createTagCommand();
    await cmd.parseAsync(['list', 'staging'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith('No tags found.');
  });
});
