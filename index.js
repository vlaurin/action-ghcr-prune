const core = require('@actions/core');
const github = require('@actions/github');
const {getPruningList} = require('./src/pruning');

const MS_IN_DAY = 1000 * 60 * 60 * 24;

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

const listOrgContainerVersions = (octokit) => (organization, container) => (pageSize, page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  page,
  per_page: pageSize,
  state: 'active',
});

const listUserContainerVersions = (octokit) => (container) => (pageSize, page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByAuthenticatedUser({
  package_type: 'container',
  package_name: container,
  page,
  per_page: pageSize,
  state: 'active',
});

const deleteOrgContainerVersion = (octokit) => (organization, container) => (version) => octokit.rest.packages.deletePackageVersionForOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  package_version_id: version.id,
});

const deleteUserContainerVersion = (octokit) => (container) => (version) => octokit.rest.packages.deletePackageVersionForAuthenticatedUser({
  package_type: 'container',
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
    const keepLast = Number(core.getInput('keep-last'));
    const untagged = asBoolean(core.getInput('untagged'));
    const tagRegex = core.getInput('tag-regex');

    const octokit = github.getOctokit(token);

    let listVersions
    let pruneVersion
    if (organization.length !== 0) {
      listVersions = listOrgContainerVersions(octokit)(organization, container);
      pruneVersion = dryRun ? dryRunDelete : deleteOrgContainerVersion(octokit)(organization, container);
    } else {
      listVersions = listUserContainerVersions(octokit)(container);
      pruneVersion = dryRun ? dryRunDelete : deleteUserContainerVersion(octokit)(container);
    }
    const filterVersion = versionFilter({olderThan, untagged, tagRegex});

    const pruningList = await getPruningList(listVersions, filterVersion)(keepLast);

    console.log(`Found a total of ${pruningList.length} versions to prune`);

    const prunedCount = await prune(pruneVersion)(pruningList);

    core.setOutput("count", prunedCount);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
