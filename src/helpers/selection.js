const removeNoOps = queries => {
  return queries.map(query => {
    const { retrievals: retrievalsToFilter } = query;

    const selectedIds = retrievalsToFilter
      .filter(retrieval => Object.entries(retrieval.timingInfo).length > 0)
      .map(retrieval => retrieval.retrId);
    return new Set(selectedIds);
  });
};

// Remove nodes without timing info
const applySelection = (queries, type) => {
  const selections = removeNoOps(queries);
  selections.forEach(s => s.add(-1)); // Always add -1 to the selection
  return selections;
};

const filterDependencies = (dependencies, selection) => {
  return Object.entries(dependencies).reduce((acc, [keyStr, values]) => {
    const key = parseInt(keyStr, 10);
    if (selection.has(key)) {
      const filteredDeps = values.filter(v => selection.has(v));
      if (filteredDeps.length > 0) {
        acc.set(key, filteredDeps);
      }
    }
    return acc;
  }, new Map());
};

export { applySelection, filterDependencies };
