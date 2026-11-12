import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearCache, queryServer } from "library/inputProcessors/server";

const input = {
  url: "http://localhost:9090//",
  username: "admin",
  password: "secret",
  mdxQuery: "SELECT FROM [Cube]",
};

function versionsResponse(apis: unknown) {
  return { json: async () => ({ apis }) } as Response;
}

describe("queryServer", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the query plan endpoint, then posts the MDX query", async () => {
    fetchMock
      .mockResolvedValueOnce(
        versionsResponse({
          "activeviam/pivot": {
            versions: [
              { id: "4", restPath: "/old" },
              { id: "9", restPath: "/activeviam/pivot/rest/v9" },
            ],
          },
        }),
      )
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [{ planInfo: {} }] }),
      } as Response);

    await expect(queryServer(input)).resolves.toEqual([{ planInfo: {} }]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:9090/versions/rest",
    );
    const [queryUrl, options] = fetchMock.mock.calls[1];
    expect(queryUrl).toBe(
      "http://localhost:9090/activeviam/pivot/rest/v9/cube/query/mdx/queryplan",
    );
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe(`Basic ${btoa("admin:secret")}`);
    expect(JSON.parse(options.body)).toEqual({ mdx: "SELECT FROM [Cube]" });
  });

  it("caches the endpoint of each server and accepts unwrapped payloads", async () => {
    fetchMock.mockResolvedValueOnce(
      versionsResponse({
        pivot: { versions: [{ id: "6", restPath: "pivot/rest/v6" }] },
      }),
    );
    fetchMock.mockResolvedValue({ json: async () => [1] } as Response);

    await expect(queryServer(input)).resolves.toEqual([1]);
    await expect(queryServer(input)).resolves.toEqual([1]);
    // One call to resolve the version, then one call per query.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports unreachable servers", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(queryServer(input)).rejects.toThrow("Unavailable");
    consoleError.mockRestore();
  });
});
