const {getPruningList, prune} = require('./pruning');

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

  it('should keep last `x` versions sorted by created date', async () => {
    const listVersions = () => Promise.resolve({
      data: [
        version(100001, '1.0.1', '2020-01-29T15:42:11Z', '2021-05-29T15:42:11Z'),
        version(100003, '1.0.3', '2020-10-29T15:42:11Z', '2021-04-29T15:42:11Z'),
        version(100002, '1.0.2', '2020-03-29T15:42:11Z', '2021-03-29T15:42:11Z'),
        version(100004, '1.0.4', '2020-11-05T22:49:04Z', '2020-11-05T22:49:04Z'),
        version(100000, '1.0.0', '2019-10-29T15:42:11Z', '2019-10-29T15:42:11Z'),
      ],
    });
    const pruningFilter = () => true;

    const pruningList = await getPruningList(listVersions, pruningFilter)(3);

    expect(pruningList).toEqual([
      version(100001, '1.0.1', '2020-01-29T15:42:11Z', '2021-05-29T15:42:11Z'),
      version(100000, '1.0.0', '2019-10-29T15:42:11Z', '2019-10-29T15:42:11Z'),
    ]);
  });
});

describe('prune', () => {

  const version = (id) => ({ id, name: `v-${id}` });

  it('should prune all versions in pruning list', async () => {
    const pruneVersion = jest.fn();

    const pruningList = [
      version(100001),
      version(100000),
    ];

    const pruned = await prune(pruneVersion)(pruningList);

    expect(pruned).toEqual(pruningList);
    expect(pruneVersion).toHaveBeenCalledTimes(2);
    expect(pruneVersion).nthCalledWith(1, pruningList[0]);
    expect(pruneVersion).nthCalledWith(2, pruningList[1]);
  });

  it('should return 0 when all pruning failed', async () => {
    const pruneVersion = jest.fn()
                             .mockRejectedValue(Error('Pruning error'));

    const pruningList = [
      version(100001),
      version(100000),
    ];

    const pruned = await prune(pruneVersion)(pruningList);

    expect(pruned).toEqual([]);
  });

  it('should interrupt pruning when encountering error', async () => {
    const pruneVersion = jest.fn()
                             .mockResolvedValueOnce()
                             .mockRejectedValueOnce(Error('Pruning error'))
                             .mockResolvedValueOnce();

    const pruningList = [
      version(100000),
      version(100001),
      version(100002),
    ];

    const pruned = await prune(pruneVersion)(pruningList);

    expect(pruned).toEqual([pruningList[0]]);
    expect(pruneVersion).toHaveBeenCalledTimes(2);
    expect(pruneVersion).nthCalledWith(1, pruningList[0]);
    expect(pruneVersion).nthCalledWith(2, pruningList[1]);
  });
});
