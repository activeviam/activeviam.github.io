import { requireNonNull } from "../utilities/util";
import * as vlq from "vlq";

interface MappingEntry {
  column: number;
  source: string;
  sourceLine: number;
  sourceColumn: number;
  name?: string;
}

interface Mapping {
  entries: MappingEntry[][];
  rootDir: string;
}

type VLQState = [number, number, number, number, number];

function mappingEntryComparator(lhs: MappingEntry, rhs: MappingEntry): number {
  return lhs.column - rhs.column;
}

/**
 * This class is responsible for fetching source maps from the remote host and
 * parsing them. The purpose is to process stack trace of bundled code and map
 * its locations into original code.
 * <br/>
 * This code is based on the following article:
 * {@link https://www.bugsnag.com/blog/source-maps}.
 * */
export class StackTraceParser {
  private static readonly instance = new StackTraceParser();

  private constructor(
    private fetchedMappings = new Map<string, Promise<Mapping>>()
  ) {}

  public static getInstance() {
    return StackTraceParser.instance;
  }

  private async getMapping(urlStr: string): Promise<Mapping> {
    if (!this.fetchedMappings.has(urlStr)) {
      this.fetchedMappings.set(urlStr, this.getMappingNonCached(urlStr));
    }
    return (await this.fetchedMappings.get(urlStr)) as Mapping;
  }

  public async parse(location: string): Promise<string> {
    try {
      const [, urlStr, lineStr, columnStr] = requireNonNull(
        /^(.*):(\d+):(\d+)$/gm.exec(location)
      );
      const mapping = await this.getMapping(urlStr);
      const column = +columnStr;
      const entry = this.findMappingEntry(mapping.entries[+lineStr], column);
      const realSourceColumn = entry.sourceColumn + column - entry.column;
      const relativeSource = entry.source.startsWith(mapping.rootDir)
        ? entry.source.substring(mapping.rootDir.length)
        : entry.source;
      return `${relativeSource}:${entry.sourceLine}:${realSourceColumn}${
        entry.name ? ", function " + entry.name : ""
      }`;
    } catch (e) {
      console.log(e);
      return location;
    }
  }

  private async getMappingNonCached(urlStr: string): Promise<Mapping> {
    const url = new URL(urlStr);
    url.pathname += ".map";

    const response = await fetch(url);
    const rawMapping = await response.json();

    if (rawMapping.version !== 3) {
      throw new Error(
        `Unknown source map version: ${rawMapping.version} (url=${url})`
      );
    }

    return this.parseRawMapping(rawMapping);
  }

  private parseLine(
    line: string,
    vlqState: VLQState,
    sources: string[],
    names: string[]
  ): MappingEntry[] {
    const segments = line.split(",");

    const entries = segments.reduce((acc: MappingEntry[], segment) => {
      if (!segment) {
        return acc;
      }

      const decoded = vlq.decode(segment);
      if (decoded.length > vlqState.length) {
        throw new Error("Bad decoded length");
      }
      for (let i = 0; i < decoded.length; ++i) {
        vlqState[i] =
          typeof decoded[i] === "number"
            ? vlqState[i] + decoded[i]
            : vlqState[i];
      }

      const entry = this.parseSegment(...vlqState, sources, names);
      acc.push(entry);
      return acc;
    }, []);

    return this.ensureSorted(entries);
  }

  private parseRawMapping({
    mappings,
    sources,
    names,
  }: {
    mappings: string;
    sources: string[];
    names: string[];
  }): Mapping {
    const vlqState: VLQState = [0, 0, 0, 0, 0];

    const entries = mappings.split(";").reduce(
      (acc: MappingEntry[][], line) => {
        acc.push(this.parseLine(line, vlqState, sources, names));
        vlqState[0] = 0;
        return acc;
      },
      [[]]
    );

    const rootDir =
      sources
        .filter((url) => url.startsWith("/"))
        .reduce((acc: string | null, filename) => {
          if (acc === null) {
            const lastSlash = filename.lastIndexOf("/");
            if (lastSlash < 0) {
              return "/";
            } else {
              return filename.substring(0, lastSlash + 1);
            }
          }

          let commonPrefixLength = 0;
          while (
            commonPrefixLength < acc.length &&
            commonPrefixLength < filename.length &&
            acc[commonPrefixLength] === filename[commonPrefixLength]
          ) {
            ++commonPrefixLength;
          }
          return acc.substring(0, commonPrefixLength);
        }, null) || "/";

    return {
      entries,
      rootDir,
    };
  }

  private parseSegment(
    rawColumn: number,
    sourceIdx: number,
    rawSourceLine: number,
    rawSourceColumn: number,
    nameIdx: number,
    sources: string[],
    names: string[]
  ): MappingEntry {
    return {
      column: rawColumn + 1,
      source: requireNonNull(sources[sourceIdx]),
      sourceColumn: rawSourceColumn + 1,
      sourceLine: rawSourceLine + 1,
      name: names[nameIdx],
    };
  }

  private ensureSorted(entries: MappingEntry[]): MappingEntry[] {
    for (let idx = 1; idx < entries.length; ++idx) {
      if (mappingEntryComparator(entries[idx - 1], entries[idx]) >= 0) {
        return entries.sort(mappingEntryComparator);
      }
    }
    return entries;
  }

  private findMappingEntry(
    mappingEntries: MappingEntry[],
    column: number
  ): MappingEntry {
    if (column <= mappingEntries[0].column) {
      return mappingEntries[0];
    }

    let leftIndex = 0;
    let rightIndex = mappingEntries.length;
    while (rightIndex - leftIndex > 1) {
      const middleIndex = Math.floor((leftIndex + rightIndex) / 2);
      if (mappingEntries[middleIndex].column <= column) {
        leftIndex = middleIndex;
      } else {
        rightIndex = middleIndex;
      }
    }

    return mappingEntries[leftIndex];
  }
}
