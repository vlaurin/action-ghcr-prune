const core = require('@actions/core');
const github = require('@actions/github');

const MS_IN_DAY = 1000 * 60 * 60 * 24;
const PAGE_SIZE = 100;

const asBoolean = (v) => 'true' == String(v);

const daysBetween = (startDate, endDate = new Date()) => Math.floor((endDate.getTime() - startDate.getTime()) / MS_IN_DAY);

const versionFilter = ({olderThan, untagged, tagRegex}) => (version) => {
  const createdAt = new Date(version.created_at);
  const age = daysBetween(createdAt);

  if (olderThan > age) {
    return false;
  }

  const tags = version.metadata.container.tags;

  if (untagged && (!tags || !tags.length)) {
    return true;
  }

  if (tagRegex && tags && tags.some((tag) => tag.match(tagRegex))) {
    return true;
  }

  return false;
};

const versionSummary = (version) => ({
  id: version.id,
  name: version.name,
  created_at: version.created_at,
  tags: version.metadata.container.tags,
});

const listOrgContainerVersions = (octokit) => (organization, container) => (page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  page,
  per_page: PAGE_SIZE,
  state: 'active',
});

const getPruningList = (listVersions, pruningFilter) => async () => {
  let pruningList = [];
  let page = 1;
  let lastPageSize = 0;

  console.log('Crawling through all versions to build pruning list...');

  do {
    const {data: versions} = await listVersions(page);
    lastPageSize = versions.length;

    const pagePruningList = versions.filter(pruningFilter);
    pruningList = [...pruningList, ...pagePruningList];

    console.log(`Found ${pagePruningList.length} versions to prune out of ${lastPageSize} on page ${page}`);

    page++;
  } while (lastPageSize >= PAGE_SIZE);

  return pruningList;
};

const deleteOrgContainerVersion = (octokit) => (organization, container) => (version) => octokit.rest.packages.deletePackageVersionForOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  package_version_id: version.id,
});

const dryRunDelete = (version) => new Promise((resolve) => {
  console.log(`Dry-run pruning of: `, versionSummary(version));
  resolve();
});

const prune = (pruneVersion) => async (pruningList) => {
  console.log(`Pruning ${pruningList.length} versions...`);
  let pruned = 0;
  try {
    for (const version of pruningList) {
      console.log(`Pruning version #${version.id} named '${version.name}'...`);
      await pruneVersion(version);
      pruned++;
    }
  } catch (error) {
    console.error(`Failed to prune because of: `, error);
    core.setFailed(error.message);
  }

  console.log(`Pruned ${pruned} versions`);

  return pruned;
};

const run = async () => {
  try {
    const token = core.getInput('token');
    const organization = core.getInput('organization');
    const container = core.getInput('container');

    const dryRun = asBoolean(core.getInput('dry-run'));

    const olderThan = Number(core.getInput('older-than'));
    const untagged = asBoolean(core.getInput('untagged'));
    const tagRegex = core.getInput('tag-regex');

    const octokit = github.getOctokit(token);

    const listVersions = listOrgContainerVersions(octokit)(organization, container);
    const filterVersion = versionFilter({olderThan, untagged, tagRegex});
    const pruneVersion = dryRun ? dryRunDelete : deleteOrgContainerVersion(octokit)(organization, container);

    const pruningList = await getPruningList(listVersions, filterVersion)();

    console.log(`Found a total of ${pruningList.length} versions to prune`);

    const prunedCount = await prune(pruneVersion)(pruningList);

    core.setOutput("count", prunedCount);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
