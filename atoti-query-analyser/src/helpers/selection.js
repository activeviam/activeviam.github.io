import _ from "lodash";
import * as iterators from "./iterators";

const invertDependencies = dep => {
  const invDep = new Map();
  if (dep.size === 0) {
    return invDep;
  }

  const temp = [...dep.get(-1)];
  const done = [];
  while (temp.length !== 0) {
    const son = temp.shift();
    done.push(son);
    if (dep.has(son)) {
      dep.get(son).forEach(parent => {
        if (!done.includes(parent) && !temp.includes(parent)) temp.push(parent);
        try {
          invDep.get(parent).push(son);
        } catch {
          invDep.set(parent, [son]);
        }
      });
    } else {
      try {
        invDep.get(-1).push(son);
      } catch {
        invDep.set(-1, [son]);
      }
    }
  }
  return invDep;
};

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

const filterByMeasures = ({
  retrievals,
  dependencies,
  measures,
  selection
}) => {
  const predicate = r =>
    selection.has(r.retrId) && _.intersection(measures, r.measures).length > 0;
  const matching = retrievals.reduce(
    (acc, r) => (predicate(r) ? acc.add(r.retrId) : acc),
    new Set()
  );

  const visited = new Set(matching);
  const mDeps = filterDependencies(dependencies, selection);
  // Include all dependencies of the retrievals
  const downStack = iterators.reduce(
    matching.values(),
    (acc, id) => {
      const deps = mDeps.get(id);
      if (deps) {
        acc.push(...deps);
      }
      return acc;
    },
    []
  );
  while (downStack.length > 0) {
    const rId = downStack.shift();
    if (!visited.has(rId)) {
      visited.add(rId);
      const deps = mDeps.get(rId);
      if (deps) {
        downStack.push(...deps);
      }
    }
  }

  const mInvDeps = invertDependencies(mDeps);
  // Include all parents of the retrievals
  const upStack = iterators.reduce(
    matching.values(),
    (acc, id) => {
      const deps = mInvDeps.get(id);
      if (deps) {
        acc.push(...deps);
      }
      return acc;
    },
    []
  );
  while (upStack.length > 0) {
    const rId = upStack.shift();
    if (!visited.has(rId)) {
      visited.add(rId);
      const deps = mInvDeps.get(rId);
      if (deps) {
        downStack.push(...deps);
      }
    }
  }

  // Always include the root -1 in the selection
  visited.add(-1);
  return visited;
};

export {
  applySelection,
  filterDependencies,
  filterByMeasures,
  invertDependencies
};
