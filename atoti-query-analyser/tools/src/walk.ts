import fs from "fs";
import path from "path";

export interface WalkObserver {
  onFile: (file: string) => void;
  onDir: (dir: string) => void;
}

export function walk(dir: string, observer: Partial<WalkObserver>) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);

    if (stats.isDirectory()) {
      if (observer.onDir) observer.onDir(filepath);
      walk(filepath, observer);
    } else if (stats.isFile()) {
      if (observer.onFile) observer.onFile(filepath);
    }
  });
}
