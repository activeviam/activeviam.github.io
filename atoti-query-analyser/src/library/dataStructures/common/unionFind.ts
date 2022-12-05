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
