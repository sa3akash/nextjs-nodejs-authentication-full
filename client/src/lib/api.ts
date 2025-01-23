import "server-only";

import { headers } from "next/headers";
import { configEnv } from "@/lib/config";
import { deleteSession, getSession, updateTokens } from "@/lib/session";

interface ApiProps {
  body?: BodyInit | null;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  integrity?: string;
  keepalive?: boolean;
  method?: string;
  mode?: RequestMode;
  priority?: RequestPriority;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal | null;
  window?: null;
}

type FetchError = {
  message: string;
  status: "error";
  statusCode: number;
  isError: boolean;
};

export const requestApi = async <T = any>(
  url: string,
  options: ApiProps,
): Promise<FetchError | T> => {
  const headersList = await headers();
  const headersObject = Object.fromEntries(headersList);
  delete headersObject["content-length"];

  const response = await fetch(`${configEnv.URL}/api/v1${url}`, {
    ...options,
    headers: {
      ...headersObject,
      "content-type": "application/json",
      // 'accept': 'application/json', // Uncomment if necessary
      ...options.headers,
    },
  });

  const data = await response.json();

  console.log({ data });

  if (!response.ok) {
    return {
      ...data,
      isError: true,
    } as FetchError;
  }

  return data as T;
};

// Modified api function
export const api = async <T = any>(
  url: string,
  options: ApiProps,
  retryCount = 0, // Track the number of retries
  maxRetries = 1, // Set a max retry limit
): Promise<FetchError | T> => {
  const originalRequest = async (): Promise<T | FetchError> => {
    const originalResponse = await requestApi(url, options); // Use generic <T>

    if (originalResponse.isError) {
      if (originalResponse.statusCode === 401 && retryCount < maxRetries) {
        const session = await getSession();
        // Attempt to refresh the token if we get a 401
        const refreshResponse = await requestApi("/auth/refresh", {
          ...options,
          method: "POST",
          body: JSON.stringify({ token: session?.refreshToken }),
        });

        if (!refreshResponse?.isError) {
          await updateTokens(refreshResponse);
          // Increment retry count and retry the original request
          return api<T>(url, options, retryCount + 1, maxRetries); // Pass increased retry count
        } else {
          // Handle scenarios where the refresh fails
          if (refreshResponse.statusCode === 401) {
            await deleteSession(); // Log out if the refresh token is invalid
          }
          return refreshResponse as FetchError; // Return refresh failure
        }
      }
      return originalResponse; // Return the original error response
    }

    return originalResponse; // Return the successful response
  };

  return await originalRequest(); // Initiate the first call
};
