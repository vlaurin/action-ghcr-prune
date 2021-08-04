const {getPruningList} = require('./pruning');

describe('getPruningList', () => {

  const version = (id, name, created_at, updated_at) => ({
    id,
    name,
    created_at,
    updated_at: updated_at || created_at,
    metadata: {
      package_type: 'container',
    },
  });

  it('should return all versions to prune', async () => {
    const listVersions = () => Promise.resolve({
      data: [
        version(245301, '1.0.4', '2019-11-05T22:49:04Z'),
        version(209672, '1.0.3', '2019-10-29T15:42:11Z'),
      ],
    });
    const pruningFilter = () => true;

    const pruningList = await getPruningList(listVersions, pruningFilter)();

    expect(pruningList).toEqual([
      version(245301, '1.0.4', '2019-11-05T22:49:04Z'),
      version(209672, '1.0.3', '2019-10-29T15:42:11Z'),
    ]);
  });

  it('should filter out versions to keep', async () => {
    const listVersions = () => Promise.resolve({
      data: [
        version(245301, '1.0.4', '2019-11-05T22:49:04Z'),
        version(209672, '1.0.3', '2019-10-29T15:42:11Z'),
      ],
    });
    const pruningFilter = ({name}) => name === '1.0.3';

    const pruningList = await getPruningList(listVersions, pruningFilter)();

    expect(pruningList).toEqual([
      version(209672, '1.0.3', '2019-10-29T15:42:11Z'),
    ]);
  });

  it('should crawl through pages of versions', async () => {
    const listVersions = (pageSize, page) => Promise.resolve({
      data: Array((pageSize / 2) * (3 - page)).fill(0).map((_, i) => version(((page - 1) * 100) + i, `1.0.${i}`, '2019-11-05T22:49:04Z')),
    });
    const pruningFilter = ({id}) => id % 2 === 0;

    const pruningList = await getPruningList(listVersions, pruningFilter)();

    expect(pruningList.length).toEqual(75);
    expect(pruningList[71]).toEqual(version(142, '1.0.42', '2019-11-05T22:49:04Z'));
  });
});
