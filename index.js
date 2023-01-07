const core = require('@actions/core');
const github = require('@actions/github');
const {
  deleteAuthenticatedUserContainerVersion,
  deleteOrgContainerVersion,
  deleteUserContainerVersion,
  listAuthenticatedUserContainerVersions,
  listOrgContainerVersions,
  listUserContainerVersions,
} = require('./src/octokit');
const {getPruningList, prune} = require('./src/pruning');
const {versionFilter} = require('./src/version-filter');

const asBoolean = (v) => 'true' == String(v);

const versionSummary = (version) => JSON.stringify({
  id: version.id,
  name: version.name,
  created_at: version.created_at,
  tags: version.metadata.container.tags,
});

const dryRunDelete = (version) => new Promise((resolve) => {
  core.info(`Dry-run pruning of: ${versionSummary(version)}`);
  resolve();
});

const writeSummary = async (container, dryRun, pruningVersions, prunedVersions) => {
  const allPruned = pruningVersions.length === prunedVersions.length;

  let summary = core.summary.addHeading(`Pruning versions for container: ${container}`, 2);

  if (dryRun) {
    summary = summary.addRaw(':warning: This is a dry run, no container versions were actually deleted.');
  } else {
    summary = summary.addRaw(`${allPruned ? ':white_check_mark:' : ':x:'} ${prunedVersions.length} out of ${pruningVersions.length} identified versions were pruned successfully.`);
  }

  await summary.addHeading('Pruned versions', 3)
               .addRaw(`The following ${prunedVersions.length} versions were successfully pruned:`)
               .addTable([
                  [{data: 'ID', header: true}, {data: 'Name', header: true}, {data: 'Created at', header: true}, {data: 'Tags', header: true}],
                  ...prunedVersions.map((version) => ([
                    String(version.id),
                    version.name,
                    version.created_at.replace('T', ' '),
                    version.metadata.container.tags.join(', '),
                  ])),
                ])
                .write();
};

const run = async () => {
  try {
    const token = core.getInput('token');
    const organization = core.getInput('organization');
    const user = core.getInput('user');

    if (organization && user) {
      core.setFailed('Inputs `organization` and `user` are mutually exclusive and must not both be provided in the same run.');
      return;
    }

    const container = core.getInput('container');

    const dryRun = asBoolean(core.getInput('dry-run'));

    const keepLast = Number(core.getInput('keep-last'));

    // For backward compatibility of deprecated input `tag-regex`
    const legacyTagRegex = core.getInput('tag-regex') ? [core.getInput('tag-regex')] : null;

    const filterOptions = {
      keepTags: core.getMultilineInput('keep-tags'),
      keepTagsRegexes: core.getMultilineInput('keep-tags-regexes'),
      keepYoungerThan: Number(core.getInput('keep-younger-than')) || Number(core.getInput('older-than')),
      pruneTagsRegexes: core.getInput('prune-tags-regexes') ? core.getMultilineInput('prune-tags-regexes') : legacyTagRegex,
      pruneUntagged: asBoolean(core.getInput('prune-untagged')) || asBoolean(core.getInput('untagged')),
    };

    const octokit = github.getOctokit(token);

    let listVersions;
    let pruneVersion;
    if (user) {
      listVersions = listUserContainerVersions(octokit)(user, container);
      pruneVersion = dryRun ? dryRunDelete : deleteUserContainerVersion(octokit)(user, container);
    } else if (organization) {
      listVersions = listOrgContainerVersions(octokit)(organization, container);
      pruneVersion = dryRun ? dryRunDelete : deleteOrgContainerVersion(octokit)(organization, container);
    } else {
      listVersions = listAuthenticatedUserContainerVersions(octokit)(container);
      pruneVersion = dryRun ? dryRunDelete : deleteAuthenticatedUserContainerVersion(octokit)(container);
    }
    const filterVersion = versionFilter(filterOptions);

    const pruningList = await getPruningList(listVersions, filterVersion)(keepLast);

    core.info(`Found a total of ${pruningList.length} versions to prune`);

    const prunedList = await prune(pruneVersion)(pruningList);

    await writeSummary(container, dryRun, pruningList, prunedList);

    if (prunedList.length !== pruningList.length) {
      core.setFailed(`Failed to prune some versions: ${prunedList.length} out of ${pruningList.length} versions were pruned`);
    }

    core.setOutput('count', prunedList.length);
    core.setOutput('prunedVersionIds', prunedList.map((version) => version.id));
    core.setOutput('dryRun', dryRun);
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
