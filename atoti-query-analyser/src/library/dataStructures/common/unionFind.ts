/**
 * The UnionFind data structure is a system of disjoint sets. At the initial moment of time, each possible value of
 * type `T` forms its own one-element set.
 *
 * UnionFind supports two types of operations:
 *
 * * `union(x, y)` merges sets containing `x` and `y`;
 * * `find(x)` finds a _representative_ of the set containing `x`.
 *
 * The following invariant holds for the `find` operation. Let `x` and `y` lie in the same set `S`. If between the
 * queries `find(x)` and `find(y)` the set `S` has not been merged with any other set, then `find(x) === find(y)`. In
 * particular, if all `union` operations precede all `find` operations, then for any `x` and `y` the
 * condition `find(x) === find(y)` is equivalent to `x` and `y` are in the same set.
 * */
export class UnionFind<T> {
  constructor(
    private readonly parentMap: Map<T, T> = new Map(),
    private readonly treeDepth: Map<T, number> = new Map()
  ) {}

  find(key: T): T {
    if (!this.parentMap.has(key)) {
      return key;
    }

    const parent = this.parentMap.get(key) as T;
    if (!this.parentMap.has(parent)) {
      return parent;
    }

    const root = this.find(parent);
    this.parentMap.set(key, root);
    return root;
  }

  union(left: T, right: T): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);

    if (leftRoot === rightRoot) {
      return;
    }

    const leftDepth = this.treeDepth.get(leftRoot) || 1;
    const rightDepth = this.treeDepth.get(rightRoot) || 1;
    if (leftDepth < rightDepth) {
      this.parentMap.set(leftRoot, rightRoot);
      this.treeDepth.set(leftRoot, Math.max(leftDepth, rightDepth + 1));
    } else {
      this.parentMap.set(rightRoot, leftRoot);
      this.treeDepth.set(rightRoot, Math.max(rightDepth, leftDepth + 1));
    }
  }
}
