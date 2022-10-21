const core = require('@actions/core');

const PAGE_SIZE = 100;

const sortByVersionCreationDesc = (first, second) => - first.created_at.localeCompare(second.created_at);

const getPruningList = (listVersions, pruningFilter) => async (keepLast = 0) => {
  let pruningList = [];
  let page = 1;
  let lastPageSize = 0;

  core.info('Crawling through all versions to build pruning list...');

  do {
    const {data: versions} = await listVersions(PAGE_SIZE, page);
    lastPageSize = versions.length;

    const pagePruningList = versions.filter(pruningFilter);
    pruningList = [...pruningList, ...pagePruningList];

    core.info(`Found ${pagePruningList.length} versions to prune out of ${lastPageSize} on page ${page}`);

    page++;
  } while (lastPageSize >= PAGE_SIZE);

  if (keepLast > 0) {
    core.info(`Keeping the last ${keepLast} versions, sorted by creation date`);
    return pruningList.sort(sortByVersionCreationDesc)
                      .slice(keepLast);
  }

  return pruningList;
};

const prune = (pruneVersion) => async (pruningList) => {
  const pruned = [];
  try {
    core.startGroup(`Pruning ${pruningList.length} versions...`);

    for (const version of pruningList) {
      core.info(`Pruning version #${version.id} named '${version.name}'...`);
      await pruneVersion(version);
      pruned.push(version.id);
    }

    core.endGroup();
  } catch (error) {
    core.endGroup();
    core.error(`Failed to prune because of: ${error}`);
  }

  core.notice(`Pruned ${pruned.length} versions`);

  return pruned;
};

module.exports = {
  getPruningList,
  prune,
};
