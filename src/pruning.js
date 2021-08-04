const PAGE_SIZE = 100;

const getPruningList = (listVersions, pruningFilter) => async () => {
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

  return pruningList;
};

module.exports = {
  getPruningList,
};
