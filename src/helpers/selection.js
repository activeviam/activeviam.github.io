import _ from "lodash";
import * as iterators from "./iterators";

// dependencies is a dict {son: parents}
// the function returns {parent: sons}
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

const filterByMeasures = ({ retrievals, dependencies, measures }) => {
  const predicate = r => _.intersection(measures, r.measures).length > 0;
  const matching = retrievals.reduce(
    (acc, r) => (predicate(r) ? acc.set(r.retrId) : acc),
    new Set()
  );
  const selected = new Set(matching);
  const visited = new Set(matching);
  // Include all dependencies of the retrievals
  const stack = iterators.reduce(
    matching.values(),
    (acc, id) => {
      const deps = dependencies[id];
      if (deps) {
        acc.push(...deps);
      }
      return acc;
    },
    []
  );
  while (stack.length > 0) {
    const rId = stack.shift();
    if (!visited.has(rId)) {
      visited.add(rId);
      const deps = dependencies[rId];
      if (deps) {
        stack.push(...deps);
      }
    }
  }

  return selected;
};

export {
  applySelection,
  filterDependencies,
  filterByMeasures,
  invertDependencies
};
