import { walk, WalkObserver } from "./walk";

type FileType = "file" | "dir";

class FSNode {
  private readonly type: FileType;

  private readonly children: Map<string, FSNode>;

  private constructor(type: FileType) {
    this.type = type;
    this.children = new Map();
  }

  private _linkTo(name: string, node: FSNode): void {
    this.children.set(name, node);
  }

  mkdir(name: string): FSNode {
    if (this.type !== "dir") {
      throw new Error("Not a directory");
    }
    if (this.children.has(name)) {
      const child = this.children.get(name) as FSNode;
      if (child.type !== "dir") {
        throw new Error("File exists: " + JSON.stringify(name));
      }
      return child;
    } else {
      if (name.indexOf("/") >= 0 || name === "." || name === "..") {
        throw new Error("Bad name: " + JSON.stringify(name));
      }
      const child = new FSNode("dir");
      child._linkTo(".", child);
      child._linkTo("..", this);
      this._linkTo(name, child);
      return child;
    }
  }

  touch(name: string): FSNode {
    if (this.type !== "dir") {
      throw new Error("Not a directory");
    }
    if (name.indexOf("/") >= 0 || name === "." || name === "..") {
      throw new Error("Bad name: " + JSON.stringify(name));
    }
    if (this.children.has(name)) {
      const child = this.children.get(name) as FSNode;
      if (child.type !== "file") {
        throw new Error("Directory exists: " + JSON.stringify(name));
      }
      return child;
    } else {
      const child = new FSNode("file");
      this._linkTo(name, child);
      return child;
    }
  }

  static rootDir(): FSNode {
    const root = new FSNode("dir");
    root._linkTo(".", root);
    root._linkTo("..", root);
    return root;
  }

  getType(): FileType {
    return this.type;
  }

  getChildren(): { name: string; child: FSNode }[] {
    return Array.from(this.children.entries())
      .map(([name, child]) => ({
        name,
        child,
      }))
      .filter((entry) => entry.name !== "." && entry.name !== "..")
      .sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
  }

  getChild(name: string): FSNode | undefined {
    if (this.type !== "dir") {
      throw new Error("Not a directory");
    }
    return this.children.get(name);
  }
}

function tokenize(path: string): string[] {
  return path.split("/").filter((token) => token.length > 0);
}

function asPath(tokens: string[]): string {
  return "/" + tokens.join("/");
}

export class FSSnapshot {
  private readonly root: FSNode;

  constructor() {
    this.root = FSNode.rootDir();
  }

  addDir(path: string): void {
    const tokens = tokenize(path);

    let currentDir = this.root;
    tokens.forEach((dir) => {
      currentDir = currentDir.mkdir(dir);
    });
  }

  addFile(path: string): void {
    const tokens = tokenize(path);
    const directory = asPath(tokens.slice(0, -1));
    const file = tokens[tokens.length - 1];

    const dir = this._find(directory);
    if (dir === undefined) {
      throw new Error("Directory doesn't exist: " + JSON.stringify(directory));
    }

    dir.touch(file);
  }

  private _find(path: string): FSNode | undefined {
    const tokens = tokenize(path);

    let current = this.root;
    for (let token of tokens) {
      const next = current.getChild(token);
      if (next === undefined) {
        return undefined;
      }
      current = next;
    }

    return current;
  }

  exists(path: string): boolean {
    const node = this._find(path);
    return node !== undefined;
  }

  isFile(path: string): boolean {
    const node = this._find(path);
    return node !== undefined && node.getType() === "file";
  }

  isDir(path: string): boolean {
    const node = this._find(path);
    return node !== undefined && node.getType() === "dir";
  }

  listDir(path: string): string[] | undefined {
    const node = this._find(path);
    if (node === undefined || node.getType() !== "dir") {
      return undefined;
    }

    return node.getChildren().map(({ name }) => name);
  }

  walk(observer: Partial<WalkObserver>): void {
    const path: string[] = [];

    const makePath = () => asPath(path);

    const doWalk = (node: FSNode) => {
      switch (node.getType()) {
        case "file":
          if (observer.onFile) observer.onFile(makePath());
          break;
        case "dir":
          if (observer.onDir) observer.onDir(makePath());
          node.getChildren().forEach(({ name, child }) => {
            path.push(name);
            doWalk(child);
            path.pop();
          });
          break;
      }
    };

    doWalk(this.root);
  }

  canonicalPath(path: string): string {
    const tokens = tokenize(path);
    const stack: string[] = [];
    tokens.forEach((token) => {
      if (token === ".") {
        return;
      }
      if (token === "..") {
        stack.pop();
      } else {
        stack.push(token);
      }
    });
    return asPath(stack);
  }
}

export function makeFSSnapshot(rootDir: string): FSSnapshot {
  const snapshot = new FSSnapshot();
  walk(rootDir, {
    onDir(dir: string): void {
      snapshot.addDir(dir.substring(rootDir.length));
    },

    onFile(file: string): void {
      snapshot.addFile(file.substring(rootDir.length));
    },
  });
  return snapshot;
}
