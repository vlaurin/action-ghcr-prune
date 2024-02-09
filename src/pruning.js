const core = require('@actions/core');
const http = require('@actions/http-client');

const PAGE_SIZE = 100;

const sortByVersionCreationDesc = (first, second) => - first.created_at.localeCompare(second.created_at);

async function getMultiPlatPruningList(listVersions, pruningList, owner, token, container) {
  core.info('Crawling through pruning list for multi-platform images...');

  for (let image of pruningList)
  {
    let manifest = await getManifest(owner, container, image.metadata.container.tags[0], token);
    if (manifest.mediaType != "application/vnd.docker.distribution.manifest.list.v2+json")
    {
      //not a multi-plat image continue
      continue;
    }

    for (let subimage in manifest.manifests)
    {
      container = getContainerId(listVersions, subimage.digest)
      pruningList.push(container)
    }

  }

}

async function getManifest(owner, container, tag, token) {
  try {
    const url = `https://ghcr.io/v2/${owner}/${container}/manifests/${tag}`;

    const client = new http.HttpClient('github-action');
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const response = await client.get(url, headers);
    const responseBody = await response.readBody();

    core.info(responseBody);

    return response
  } catch (error) {
    console.error('Error:', error);
  }
}

async function getContainerId(listVersions, digest) {
  let page = 1;
  let lastPageSize = 0;

  do {
    const {data: versions} = await listVersions(PAGE_SIZE, page);
    lastPageSize = versions.length;

    const containerID = versions.find((version) => version.name == digest);

    if (containerID) {
      return containerID
    }

    page++;
  } while (lastPageSize >= PAGE_SIZE);

  core.info(`No image found with digest ${digest}`);
  return containerID;
}


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
      pruned.push(version);
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
