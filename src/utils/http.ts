interface GMResponse {
  status: number;
  statusText: string;
  responseText: string;
  response: any;
  finalUrl?: string;
}

function gmRequest(
  url: string,
  options?: { headers?: Record<string, string>; responseType?: string },
): Promise<GMResponse> {
  return new Promise((resolve, reject) => {
    const gmRequest = (window as any).GM_xmlhttpRequest;

    if (!gmRequest)
      return reject(new Error("GM_xmlhttpRequest is not available."));

    gmRequest({
      method: "GET",
      url: url,
      responseType: options?.responseType || "text",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(options?.headers || {}),
      },
      onload: (response: GMResponse) => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response);
        } else {
          reject(
            new Error(`HTTP Error ${response.status}: ${response.statusText}`),
          );
        }
      },
      onerror: (error: any) => {
        reject(error);
      },
    });
  });
}

export async function gmFetch(
  url: string | URL,
  options?: { headers?: Record<string, string>; responseType?: string },
): Promise<any> {
  const response = await gmRequest(
    url instanceof URL ? url.href : url,
    options,
  );
  return options?.responseType === "blob"
    ? response.response
    : response.responseText;
}

export async function gmFetchFinalUrl(
  url: string,
  options?: { headers?: Record<string, string> },
): Promise<string> {
  const response = await gmRequest(url, options);
  return response.finalUrl || url;
}

/**
 * rate limited request
 */
const MIN_REQUEST_INTERVAL_MS = 1100;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

export function waitForRequestSlot(): Promise<void> {
  const scheduled = requestQueue.then(async () => {
    const delay = Math.max(
      0,
      MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt),
    );
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();
  });
  requestQueue = scheduled.then(
    () => undefined,
    () => undefined,
  );
  return scheduled;
}
