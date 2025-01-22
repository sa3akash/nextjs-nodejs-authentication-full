import "server-only";

import { headers } from "next/headers";
import { configEnv } from "@/lib/config";
import { getSession, updateTokens } from "@/lib/session";
import { redirect } from "next/navigation";

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

  if (!response.ok) {
    return {
      ...data,
      isError: true,
      statusCode: response.status, // Capture the HTTP status code
    } as FetchError;
  }

  return data as T; // Return the resolved data as type T
};

// Modified api function
export const api = async <T = any>(
  url: string,
  options: ApiProps,
): Promise<FetchError | T> => {
  const originalRequest = async (): Promise<T | FetchError> => {
    const originalResponse = await requestApi(url, options); // Use generic <T>

    if (originalResponse.isError) {
      if (originalResponse.statusCode === 401) {
        const session = await getSession();
        // Attempt to refresh the token if we get a 401
        const refreshResponse = await requestApi("/auth/refresh", {
          ...options,
          method: "POST",
          body: JSON.stringify({ token: session?.refreshToken }),
        });

        if (!refreshResponse?.isError) {
          await updateTokens(refreshResponse);
          // If the refresh was successful, retry the original request
          return originalRequest(); // Recursive call to retry
        }

        // Optionally, handle scenarios where the refresh failed
        return refreshResponse as FetchError;
      }

      return originalResponse; // Return the original error response
    }

    return originalResponse; // Return the successful response
  };

  return await originalRequest(); // Initiate the first call
};
