const MS_IN_DAY = 1000 * 60 * 60 * 24;

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

module.exports = {
  versionFilter,
};
