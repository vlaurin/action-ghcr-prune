const deleteAuthenticatedUserContainerVersion = (octokit) => (container) => (version) => octokit.rest.packages.deletePackageVersionForAuthenticatedUser({
  package_type: 'container',
  package_name: container,
  package_version_id: version.id,
});

const deleteOrgContainerVersion = (octokit) => (organization, container) => (version) => octokit.rest.packages.deletePackageVersionForOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  package_version_id: version.id,
});

const deleteUserContainerVersion = (octokit) => (user, container) => (version) => octokit.rest.packages.deletePackageVersionForUser({
  package_type: 'container',
  username: user,
  package_name: container,
  package_version_id: version.id,
});

const listAuthenticatedUserContainerVersions = (octokit) => (container) => (pageSize, page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByAuthenticatedUser({
  package_type: 'container',
  package_name: container,
  page,
  per_page: pageSize,
  state: 'active',
});

const listOrgContainerVersions = (octokit) => (organization, container) => (pageSize, page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
  package_type: 'container',
  org: organization,
  package_name: container,
  page,
  per_page: pageSize,
  state: 'active',
});

const listUserContainerVersions = (octokit) => (user, container) => (pageSize, page = 1) => octokit.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
  package_type: 'container',
  username: user,
  package_name: container,
  page,
  per_page: pageSize,
  state: 'active',
});

module.exports = {
  deleteAuthenticatedUserContainerVersion,
  deleteOrgContainerVersion,
  deleteUserContainerVersion,
  listAuthenticatedUserContainerVersions,
  listOrgContainerVersions,
  listUserContainerVersions,
};
