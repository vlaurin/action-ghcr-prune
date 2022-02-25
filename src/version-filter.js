const MS_IN_DAY = 1000 * 60 * 60 * 24;

const daysBetween = (startDate, endDate = new Date()) => Math.floor((endDate.getTime() - startDate.getTime()) / MS_IN_DAY);

const versionFilter = (options) => (version) => {
  const {
    olderThan,
    untagged,
    tagRegex,
    keepTags,
  } = options;
  const createdAt = new Date(version.created_at);
  const age = daysBetween(createdAt);

  if (olderThan > age) {
    return false;
  }

  const tags = version.metadata.container.tags;

  if (untagged && (!tags || !tags.length)) {
    return true;
  }

  if (keepTags && tags && keepTags.some((keepTag) => tags.includes(keepTag))) {
    return false;
  }

  if (tagRegex && tags && tags.some((tag) => tag.match(tagRegex))) {
    return true;
  }

  return false;
};

module.exports = {
  versionFilter,
};
