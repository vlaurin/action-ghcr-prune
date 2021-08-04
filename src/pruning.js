const PAGE_SIZE = 100;

const sortByVersionCreationDesc = (first, second) => - first.created_at.localeCompare(second.created_at);

const getPruningList = (listVersions, pruningFilter) => async (keepLast = 0) => {
  let pruningList = [];
  let page = 1;
  let lastPageSize = 0;

  console.log('Crawling through all versions to build pruning list...');

  do {
    const {data: versions} = await listVersions(PAGE_SIZE, page);
    lastPageSize = versions.length;

    const pagePruningList = versions.filter(pruningFilter);
    pruningList = [...pruningList, ...pagePruningList];

    console.log(`Found ${pagePruningList.length} versions to prune out of ${lastPageSize} on page ${page}`);

    page++;
  } while (lastPageSize >= PAGE_SIZE);

  if (keepLast > 0) {
    console.log(`Keeping the last ${keepLast} versions, sorted by creation date`);
    return pruningList.sort(sortByVersionCreationDesc)
                      .slice(keepLast);
  }

  return pruningList;
};

module.exports = {
  getPruningList,
};
