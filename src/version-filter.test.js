const {versionFilter} = require('./version-filter');

const YEARS_AGO = '2019-11-05T22:49:04Z';
const TODAY = new Date().toISOString();

describe('versionFilter', () => {
  const Version = (created_at, tags) => ({
    created_at,
    metadata: {
      container: {
        tags,
      },
    },
  });

  it('should NOT prune version when no pruning criteria defined', () => {
    const version = Version(YEARS_AGO, []);

    const prune = versionFilter({})(version);

    expect(prune).toBe(false);
  });

  it('should NOT prune version when not matching pruning criteria', () => {
    const version = Version(YEARS_AGO, ['tag1']);

    const prune = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: undefined,
      pruneUntagged: false,
    })(version);

    expect(prune).toBe(false);
  });

  it('should prune untagged version when targeting untagged', () => {
    const version = Version(YEARS_AGO, []);

    const prune = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: undefined,
      pruneUntagged: true,
    })(version);

    expect(prune).toBe(true);
  });

  it('should NOT prune tagged version when targeting untagged', () => {
    const version = Version(YEARS_AGO, ['tag1']);

    const prune = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: undefined,
      pruneUntagged: true,
    })(version);

    expect(prune).toBe(false);
  });

  it('should NOT prune untagged version with age below limit', () => {
    const version = Version(TODAY, []);

    const prune = versionFilter({
      keepYoungerThan: 3,
      pruneTagsRegexes: undefined,
      pruneUntagged: true,
    })(version);

    expect(prune).toBe(false);
  });

  it('should prune tagged version with at least 1 tag matching regex', () => {
    const version = Version(YEARS_AGO, ['tag-145', 'latest']);

    const prune = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: ['^tag-[0-9]{3}$'],
      pruneUntagged: false,
    })(version);

    expect(prune).toBe(true);
  });

  it('should prune all tagged versions with at least 1 tag matching any of the regexes', () => {
    const versions = [
      Version(YEARS_AGO, ['pr-123', 'pr-demo']),
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
      Version(YEARS_AGO, ['pr-789', 'pr-beta']),
    ]

    const pruningFilter = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: [
        '^pr-123$',
        'alpha$',
      ],
      pruneUntagged: false,
    });

    expect(versions.filter(pruningFilter)).toEqual([
      Version(YEARS_AGO, ['pr-123', 'pr-demo']),
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
    ]);
  });

  it('should NOT prune tagged version with no tag matching regex', () => {
    const version = Version(YEARS_AGO, ['tag-145x', 'latest']);

    const prune = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: ['^tag-[0-9]{3}$'],
      pruneUntagged: false,
    })(version);

    expect(prune).toBe(false);
  });

  it('should NOT prune tagged version with age below limit', () => {
    const version = Version(TODAY, ['tag-145', 'latest']);

    const prune = versionFilter({
      keepYoungerThan: 3,
      pruneTagsRegexes: ['^tag-[0-9]{3}$'],
      pruneUntagged: false,
    })(version);

    expect(prune).toBe(false);
  });

  it('should prune all versions matching any criteria', () => {
    const versions = [
      Version(YEARS_AGO, []),
      Version(YEARS_AGO, ['latest']),
    ]

    const pruningFilter = versionFilter({
      keepYoungerThan: 3,
      pruneTagsRegexes: ['latest'],
      pruneUntagged: true,
    });

    expect(versions.filter(pruningFilter)).toEqual(versions);
  });

  it('should NOT prune any version with a tag to keep', () => {
    const versions = [
      Version(YEARS_AGO, ['pr-123', 'pr-demo']),
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
      Version(YEARS_AGO, ['pr-789', 'pr-beta']),
    ]

    const pruningFilter = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: ['^pr-'],
      pruneUntagged: false,
      keepTags: [
        'pr-demo',
        'pr-beta',
      ],
    });

    expect(versions.filter(pruningFilter)).toEqual([
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
    ]);
  });

  it('should NOT prune any version with a tag matching a regex to keep', () => {
    const versions = [
      Version(YEARS_AGO, ['pr-123', 'pr-demo']),
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
      Version(YEARS_AGO, ['pr-789', 'pr-beta']),
    ]

    const pruningFilter = versionFilter({
      keepYoungerThan: 0,
      pruneTagsRegexes: ['^pr-'],
      pruneUntagged: false,
      keepTagsRegexes: [
        '^pr-d\\w+',
        '^pr-b\\w+',
      ],
    });

    expect(versions.filter(pruningFilter)).toEqual([
      Version(YEARS_AGO, ['pr-456', 'pr-alpha']),
    ]);
  });
});
