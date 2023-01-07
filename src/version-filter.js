const MS_IN_DAY = 1000 * 60 * 60 * 24;

const daysBetween = (startDate, endDate = new Date()) => Math.floor((endDate.getTime() - startDate.getTime()) / MS_IN_DAY);

const anyRegexMatch = (regexes) => (tags) =>
  regexes.some((regex) => tags.some((tag) => tag.match(regex)));

const versionFilter = (options) => (version) => {
  const {
    keepTags,
    keepTagsRegexes,
    keepYoungerThan,
    pruneTagsRegexes,
    pruneUntagged,
  } = options;
  const createdAt = new Date(version.created_at);
  const age = daysBetween(createdAt);

  if (keepYoungerThan > age) {
    return false;
  }

  const tags = version.metadata.container.tags;

  if (pruneUntagged && (!tags || !tags.length)) {
    return true;
  }

  if (keepTags && tags && keepTags.some((keepTag) => tags.includes(keepTag))) {
    return false;
  }

  if (keepTagsRegexes && tags && anyRegexMatch(keepTagsRegexes)(tags)) {
    return false;
  }

  if (pruneTagsRegexes && tags && anyRegexMatch(pruneTagsRegexes)(tags)) {
    return true;
  }

  return false;
};

module.exports = {
  versionFilter,
};
