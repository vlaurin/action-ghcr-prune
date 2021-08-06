# action-ghcr-prune
GitHub Action to prune/delete container versions from GitHub Container Registry (ghcr.io).

**Please note:** Currently, this action only works for containers owned by a GitHub organisation.

## Word of caution

As this action is destructive, it's recommended to test any changes to the configuration of the action with a dry-run to ensure the expected versions are matched for pruning. For more details about dry-runs, see the [dry-run input](#dry-run).

This is especially true when the [`tag-regex` input](#tag-regex) is used as the regular expression can easily match all versions of a container and result in complete deletion of all available versions.

## Quick start

```yml
steps:
  - name: Prune
    uses: vlaurin/action-ghcr-prune@main
    with:
      token: ${{ secrets.YOUR_TOKEN }}
      organization: your-org
      container: your-container
      dry-run: true # Dry-run first, then change to `false`
      older-than: 7 # days
      keep-last: 2
      untagged: true
```

## Permissions

This action uses the Github Rest API [deletePackageVersionForOrg()](https://octokit.github.io/rest.js/v18#packages-delete-package-version-for-org) resource which states:
> To use this endpoint, you must have admin permissions in the organization and authenticate using an access token with the `packages:read` and `packages:delete` scopes. In addition:
> [...]
> If `package_type` is container, you must also have admin permissions to the container you want to delete.

As a result, for this action to work, the token must be associated to a user who has admin permissions for both the organization and the package. If this is not the case, then dry-runs will work as expected but actual runs will fail with a `Package not found` error when attempting to delete versions.

## Inputs

### token

**Required** Secret access token with scopes `packages:read` and `packages:delete` and write permissions on the targeted container. See [Creating a personal access token
](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for more details about GitHub access tokens.

### organization

**Required** Name of the organisation owning the container package.

### container

**Required** Name of the container package for which versions should be pruned.

### dry-run

**Optional** Boolean controlling whether to execute the action as a dry-run. When `true` the action will print out details of the version that will be pruned without actually deleting them. Defaults to `false`.

As this action is destructive, it's recommended to test any changes to the configuration of the action with a dry-run to ensure the expected versions are matched for pruning.

### older-than

**Optional** Minimum age in days of a version before it is pruned. Defaults to `0` which matches all versions of a container.

### keep-last

**Optional** Count of most recent, matching containers to exclude from pruning. Defaults to `0` which means that all matching containers are pruned.

### untagged

**Optional** Boolean controlling whether untagged versions should be pruned (`true`) or not (`false`). Defaults to `false`.

### tag-regex

**Optional** Regular expression which will be evaluated against all tags of a version. Any version with at least one tag matching the expression will be pruned. Disabled by defaults.

:warning: **Please note:** Extra care should be taken when using `tag-regex`, please make sure you've read the [Word of caution](#word-of-caution)

## Outputs

### count

The count of container versions which were successfully pruned by the action.

## Contribute

### Build

This action is compiled into a single JS file using [@vercel/ncc](https://github.com/vercel/ncc). This produces a `dist/` folder which must be checked in with the code.

Compilation can be done using:

```bash
npm run build
```

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
