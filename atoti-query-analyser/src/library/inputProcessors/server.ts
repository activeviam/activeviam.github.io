/** Cache of the connections to servers. */
const serverCache = new Map();

/**
 * Clears the cache of servers.
 *
 * This is mostly interesting for unit-tests, if any.
 */
export function clearCache() {
  serverCache.clear();
}

function cleanseUrl(url: string) {
  const match = /^(.+?)\/*$/.exec(url);
  if (match === null) {
    throw new Error(`Bad URL: ${url}`);
  }
  return match[1];
}

const supportedApis = ["5", "6", "8"];

const findServiceUrl = (apis: any) => {
  const pivotApi = apis["activeviam/pivot"] ?? apis.pivot;
  if (pivotApi !== undefined) {
    for (const version of pivotApi.versions) {
      if (supportedApis.includes(version.id)) {
        return version.restPath;
      }
    }
  }
  throw new Error("Not supporting this server version.");
};

/**
 * Resolves the version of the API of the target server.
 * @param {String} url url of the target server
 * @returns {Promise<String>} promise with the URL to the pivot service
 */
function resolveQueryEndpoint(userUrl: string) {
  const url = cleanseUrl(userUrl);
  const cached = serverCache.get(url);
  if (cached) {
    return cached;
  }

  const resolution = new Promise((resolve, reject) => {
    fetch(`${url}/versions/rest`).then(
      async (response) => {
        const versions = await response.json();
        const serviceUrl = findServiceUrl(versions.apis);
        const fullUrl =
          `${url}/${serviceUrl}/cube/query/mdx/queryplan`.replaceAll(
            /\/{2,}/g,
            "/"
          );
        resolve(fullUrl);
      },
      (err) => {
        console.error(`Cannot find version of ${url}`, err);
        serverCache.delete(url);
        reject(new Error("Unavailable"));
      }
    );
  });
  serverCache.set(url, resolution);
  return resolution;
}

export interface ServerInput {
  url: string;
  credentials: string;
  query: string;
}

/**
 * Queries the server for the query plan of a given request.
 * @param payload payload to send to the server
 * @returns the exported query plan for the provided query
 */
export async function queryServer({ url, credentials, query }: ServerInput) {
  const queryUrl = await resolveQueryEndpoint(url);
  const body = {
    mdx: query,
  };
  const response = await fetch(queryUrl, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: credentials,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  // Old services wrap in {success, data}; new services don't
  return payload.data ?? payload;
}
