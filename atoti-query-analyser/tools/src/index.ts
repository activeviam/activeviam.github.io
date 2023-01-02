import { makeFSSnapshot } from "./fsSnapshot";
import path from "path";
import { escape } from "lodash";
import fs from "fs";

const BLACKLIST_DIRS = new Set(["assets", "api"]);

function verifyExistence() {
  const sources = makeFSSnapshot("../src");
  const docs = makeFSSnapshot("../docs/modules");

  sources.walk({
    onFile(file: string) {
      if (!file.match(/\.tsx?$/)) {
        return;
      }

      if (file.endsWith(".d.ts")) {
        return;
      }

      const parsed = path.parse(file);
      parsed.ext = ".md";
      const docFile = path.format({
        ...path.parse(file),
        base: undefined,
        ext: ".md",
      });
      console.log(file, "->", docFile);
      if (!docs.isFile(docFile)) {
        throw new Error(`Not found: ${docFile}`);
      }
    },
  });
}

function makeSection(title: string) {
  return "## " + escape(title) + " ";
}

function tocEntry(title: string, link: string) {
  return `* [${escape(title)}](${link})`;
}

function makeTitle(title: string) {
  return "# " + escape(title) + " ";
}

const makeLink = (function () {
  let linkCounter = 0;

  return function () {
    const id = "__autogen_" + linkCounter + "__";
    ++linkCounter;
    const link = "#" + id;
    const anchor = `<a id="${id}"></a>`;
    return { link, anchor };
  };
})();

function splitCmd(cmd: string): string[] {
  const regex = /([^\s"]+)|("([^"\\]|\\"|\\\\)*")/gm;

  const args: string[] = [];

  let m;
  while ((m = regex.exec(cmd)) !== null) {
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    let token = m[0];
    if (token[0] === '"') {
      token = JSON.parse(token);
    }

    args.push(token);
  }

  return args;
}

function loadContents(filename: string, sectionIndent: number = 0): string[] {
  let data: string[] = fs.readFileSync(filename, "utf8").split("\n");

  return data
    .reduce((acc: string[], line) => {
      // Normalize headers
      if (line === "===") {
        acc.push("# " + acc.pop());
      } else if (line === "---") {
        acc.push("## " + acc.pop());
      } else {
        acc.push(line);
      }
      return acc;
    }, [])
    .reduce((acc: string[], line) => {
      // Preprocess
      acc.push(line);

      if (!line.startsWith("<!-- ") || !line.endsWith(" -->")) {
        return acc;
      }

      const cmd = line
        .substring("<!--".length, line.length - "-->".length)
        .trim();
      const args = splitCmd(cmd);

      if (args.length > 0) {
        switch (args[0]) {
          case "include":
            args.slice(1).forEach((arg) => {
              const nextFile = path.join(path.dirname(filename), arg);
              acc.push(...loadContents(nextFile));
            });
            break;
        }
      }

      return acc;
    }, [])
    .reduce((acc: string[], line) => {
      // Header indentation
      if (line.startsWith("#")) {
        acc.push(Array(sectionIndent + 1).join("#") + line);
      } else {
        acc.push(line);
      }
      return acc;
    }, []);
}

function buildIndex() {
  const DOCS_ROOT = "../docs";
  const docs = makeFSSnapshot(DOCS_ROOT);

  docs.walk({
    onDir(dir: string) {
      if (dir.split("/").some((token) => BLACKLIST_DIRS.has(token))) {
        return;
      }
      const realPath = DOCS_ROOT + dir;
      const children = docs.listDir(dir) || [];

      const indexContents: (string | string[])[] = [];
      const toc: string[] = [makeSection("Table of contents")];

      const findSummary = (currentDir: string) => {
        const dirChildren = (docs.listDir(currentDir) || []).filter(
          (child) => child !== "__index__.md"
        );
        if (dirChildren.length === 1) {
          return path.join(currentDir, dirChildren[0]);
        }
        if (docs.isFile(currentDir + "/__summary__.md")) {
          return currentDir + "/__summary__.md";
        }
        return undefined;
      };

      // Title
      let summaryFile: string | undefined;
      if ((summaryFile = findSummary(dir))) {
        const contents = loadContents(DOCS_ROOT + summaryFile);
        if (!contents[0].startsWith("# ")) {
          indexContents.push(makeTitle(dir));
        }
        indexContents.push(contents);
      } else {
        indexContents.push(makeTitle(dir));
      }

      if (docs.canonicalPath(dir + "/..") !== dir) {
        indexContents.push("");
        indexContents.push("[Parent directory](../__index__.md)");
        indexContents.push("");
      }
      // Table of contents
      indexContents.push("");
      indexContents.push(toc);
      indexContents.push("");

      // Entries
      children.forEach((child) => {
        const childPath = dir + "/" + child;

        if (docs.isFile(childPath)) {
          const lastDot = child.lastIndexOf(".");
          if (lastDot < 0) {
            return;
          }
          const base = child.substring(0, lastDot);
          const ext = child.substring(lastDot);
          if (ext !== ".md") {
            return;
          }
          if (base.startsWith("__") && base.endsWith("__")) {
            return;
          }
        } else {
          if (BLACKLIST_DIRS.has(child)) {
            return;
          }
        }

        const { link, anchor } = makeLink();
        toc.push(tocEntry(child, link));

        indexContents.push("");
        if (docs.isFile(childPath)) {
          const contents = loadContents(path.join(realPath, child), 1);
          if (contents[0].startsWith("## ")) {
            contents[0] += " " + anchor;
          } else {
            indexContents.push(makeSection(child) + anchor);
          }
          indexContents.push(contents);
        } else {
          if ((summaryFile = findSummary(childPath))) {
            const contents = loadContents(DOCS_ROOT + summaryFile);
            if (contents[0].startsWith("## ")) {
              contents[0] += " " + anchor;
            } else {
              indexContents.push(makeSection(child) + anchor);
            }
            indexContents.push(contents);
          } else {
            indexContents.push(makeSection(child) + anchor);
            indexContents.push("_No summary provided!_");
          }
          indexContents.push("");
          indexContents.push(`[More info](${child}/__index__.md)`);
          indexContents.push("");
        }
      });

      const data = indexContents.flat(Infinity).join("\n");
      fs.writeFileSync(path.join(realPath, "__index__.md"), data, "utf8");
    },
  });
}

function main() {
  verifyExistence();
  buildIndex();
}

main();