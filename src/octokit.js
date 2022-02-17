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

module.exports = {
  deleteOrgContainerVersion,
  deleteUserContainerVersion,
  listOrgContainerVersions,
  listUserContainerVersions,
};
