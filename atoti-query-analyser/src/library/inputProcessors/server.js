/** Cache of the connections to servers. */
const serverCache = new Map();

/**
 * Clears the cache of servers.
 *
 * This is mostly interesting for unit-tests, if any.
 */
const clearCache = () => {
  serverCache.clear();
};

const cleanseUrl = url => {
  const match = /^(.+?)\/*$/.exec(url);
  return match[1];
};

/**
 * Resolves the version of the API of the target server.
 * @param {String} url url of the target server
 * @returns {Promise<String>} promise with the URL to the pivot service
 */
const resolveQueryEndpoint = userUrl => {
  const url = cleanseUrl(userUrl);
  const cached = serverCache.get(url);
  if (cached) {
    return cached;
  }

  const resolution = new Promise((resolve, reject) => {
    fetch(`${url}/versions/rest`).then(
      async response => {
        const versions = await response.json();
        const pivotService = versions.apis.pivot.versions[0].restPath;
        resolve(`${url}${pivotService}`);
      },
      err => {
        console.error(`Cannot find version of ${url}`, err);
        serverCache.delete(url);
        reject(new Error("Unavailable"));
      }
    );
  });
  serverCache.set(url, resolution);
  return resolution;
};

/**
 * Queries the server for the query plan of a given request.
 * @param payload payload to send to the server
 * @returns the exported query plan for the provided query
 */
const queryServer = async ({ url, credentials, query }) => {
  const baseUrl = await resolveQueryEndpoint(url);
  const queryUrl = `${baseUrl}/cube/query/mdx/queryplan`;
  const body = {
    mdx: query
  };
  const response = await fetch(queryUrl, {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: credentials
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return payload.data;
};

export default queryServer;
export { clearCache };
