const core = require('@actions/core');
const github = require('@actions/github');
const {
  deleteOrgContainerVersion,
  deleteUserContainerVersion,
  listOrgContainerVersions,
  listUserContainerVersions,
} = require('./src/octokit');
const {getPruningList, prune} = require('./src/pruning');
const {versionFilter} = require('./src/version-filter');

const asBoolean = (v) => 'true' == String(v);

const versionSummary = (version) => ({
  id: version.id,
  name: version.name,
  created_at: version.created_at,
  tags: version.metadata.container.tags,
});

const dryRunDelete = (version) => new Promise((resolve) => {
  console.log(`Dry-run pruning of: `, versionSummary(version));
  resolve();
});

const run = async () => {
  try {
    const token = core.getInput('token');
    const organization = core.getInput('organization');
    const container = core.getInput('container');

    const dryRun = asBoolean(core.getInput('dry-run'));

    const keepLast = Number(core.getInput('keep-last'));
    const filterOptions = {
      olderThan: Number(core.getInput('older-than')),
      untagged: asBoolean(core.getInput('untagged')),
      tagRegex: core.getInput('tag-regex'),
      keepTags: core.getMultilineInput('keep-tags'),
      keepTagsRegexes: core.getMultilineInput('keep-tags-regexes'),
    };

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
    const filterVersion = versionFilter(filterOptions);

    const pruningList = await getPruningList(listVersions, filterVersion)(keepLast);

    console.log(`Found a total of ${pruningList.length} versions to prune`);

    const prunedList = await prune(pruneVersion)(pruningList);

    if (prunedList.length !== pruningList.length) {
      core.setFailed(`Failed to prune some versions: ${prunedList.length} out of ${pruningList.length} versions were pruned`);
    }

    core.setOutput('count', prunedList.length);
    core.setOutput('prunedVersionIds', prunedList);
    core.setOutput('dryRun', dryRun);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
