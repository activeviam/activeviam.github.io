const DB_NAME = "atoti-query-analyser";
const DB_VERSION = 1;
const STORE_NAME = "recentQueryPlans";
const MAX_ENTRIES = 5;

export interface RecentQueryPlanEntry {
  id?: number;
  label: string;
  compressedData: Blob;
  sizeInBytes: number;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function compressData(
  data: unknown
): Promise<{ blob: Blob; originalSize: number }> {
  const json = JSON.stringify(data);
  const originalSize = new Blob([json]).size;
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const blob = await new Response(stream).blob();
  return { blob, originalSize };
}

async function decompressData(blob: Blob): Promise<unknown> {
  const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

export function extractLabel(rawJson: unknown): string {
  if (!Array.isArray(rawJson) || rawJson.length === 0) {
    return "Query plan";
  }
  const first = rawJson[0];
  const planInfo = first?.planInfo;
  if (!planInfo) {
    return "Query plan";
  }
  const pivotId = planInfo.pivotId || "";
  const mdxPass = planInfo.mdxPass || "";
  let label = [pivotId, mdxPass].filter(Boolean).join(" - ") || "Query plan";
  if (rawJson.length > 1) {
    label += ` (+${rawJson.length - 1} more)`;
  }
  return label;
}

export async function getRecentQueryPlans(): Promise<RecentQueryPlanEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("savedAt");
    const request = index.getAll();
    request.onsuccess = () => {
      const entries = request.result as RecentQueryPlanEntry[];
      entries.reverse(); // newest first
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function loadRecentQueryPlanData(
  entry: RecentQueryPlanEntry
): Promise<unknown> {
  return decompressData(entry.compressedData);
}

export async function saveRecentQueryPlan(
  label: string,
  data: unknown
): Promise<number> {
  const { blob, originalSize } = await compressData(data);
  const db = await openDb();
  const id = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const entry: RecentQueryPlanEntry = {
      label,
      compressedData: blob,
      sizeInBytes: originalSize,
      savedAt: Date.now(),
    };
    const addRequest = store.add(entry);
    addRequest.onsuccess = () => resolve(addRequest.result as number);
    addRequest.onerror = () => reject(addRequest.error);

    // Evict oldest entries if over limit
    const index = store.index("savedAt");
    const countRequest = index.count();
    countRequest.onsuccess = () => {
      const count = countRequest.result;
      if (count > MAX_ENTRIES) {
        const cursorRequest = index.openCursor(); // ascending by savedAt
        let toDelete = count - MAX_ENTRIES;
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete--;
            cursor.continue();
          }
        };
      }
    };

    tx.oncomplete = () => db.close();
  });
  return id;
}

export async function deleteRecentQueryPlan(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
