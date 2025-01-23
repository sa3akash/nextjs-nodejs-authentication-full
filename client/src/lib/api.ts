import 'server-only';

import { headers } from 'next/headers';
import { configEnv } from '@/lib/config';
import { getSession } from '@/lib/session';

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
  next?: NextFetchRequestConfig
}

type FetchError = {
  message: string;
  status: "error";
  statusCode: number;
  isError: boolean;
};



//
// export const api = async (url: string, options: ApiProps) => {
//   const session = await getSession(); // Get current session
//
//   let response = await apiCall(url, options);
//
//   // Handle unauthorized (401) responses
//   if (response?.statusCode === 401) {
//     const newAccessToken = await refreshAccessToken(session?.refreshToken);
//     if (newAccessToken && newAccessToken.status !== 'error') {
//       await updateSession(newAccessToken);
//       response = await apiCall(url, {
//         ...options,
//         headers: {
//           ...options.headers,
//           authorization: `Bearer ${newAccessToken.accessToken}`,
//         },
//       });
//     }
//   }
//
//   return response;
// };
//
// const apiCall = async (url: string, options: ApiProps) => {
//   try {
//     const headersObject = await getHeaders(options.headers);
//     const response = await fetch(`${configEnv.URL}/api/v1${url}`, {
//       ...options,
//       headers: {
//         ...headersObject,
//         "content-type": "application/json",
//       },
//     });
//
//     if (response.status === 401) {
//       await deleteSession();
//     }
//
//     return await response.json();
//   } catch (error) {
//     console.error('API call failed:', error);
//     throw error; // Rethrow or handle error as needed
//   }
// };
//
// const getHeaders = async (customHeaders?: HeadersInit) => {
//   const headersList = await headers(); // Retrieves default headers
//   const headersObject = Object.fromEntries(headersList);
//   delete headersObject["content-length"];
//
//   return {
//     ...headersObject,
//     ...customHeaders,
//   };
// };
//
// const refreshAccessToken = async (refreshToken?: string) => {
//   if (!refreshToken) return { status: 'error' };
//
//   try {
//     return await apiCall('/auth/refresh', {
//       method: 'POST',
//       body: JSON.stringify({ token: refreshToken }),
//     });
//   } catch (error) {
//     console.error('Failed to refresh access token:', error);
//     return { status: 'error' };
//   }
// };
//
// const updateSession = async (data: { accessToken: string; refreshToken: string }) => {
//   try {
//     const response = await fetch(`${configEnv.CLIENT_URL}/api/auth`, {
//       method: 'POST',
//       headers: {
//         'content-type': 'application/json',
//       },
//       body: JSON.stringify(data),
//     });
//     return await response.json();
//   } catch (error) {
//     console.error('Failed to update session:', error);
//     throw error;
//   }
// };
//
// const deleteSession = async () => {
//   try {
//     return await fetch(`${configEnv.CLIENT_URL}/api/auth`, {
//       method: 'DELETE',
//       headers: {
//         'content-type': 'application/json',
//       },
//     }).then((res) => res.json());
//   } catch (error) {
//     console.error('Failed to delete session:', error);
//     throw error;
//   }
// };







// =======================================================================

export const api = async (url: string, options: ApiProps) => {
  const session = await getSession();

  let response = await apiCall(url, options);

  if (response?.statusCode === 401) {
    const newAccessToken = await apiCall("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ token: session?.refreshToken }),
    });

    if (newAccessToken.status !== "error") {
      await updateSession(newAccessToken);
      response = await apiCall(url, {
        ...options,
        headers: {
          authorization: `Bearer ${newAccessToken.accessToken}`,
        },
      });
    }
  }
  return response;
};

const apiCall = async (url: string, options: ApiProps) => {
  try {
    const headersList = await headers(); // Retrieves headers
    const headersObject = Object.fromEntries(headersList);
    delete headersObject["content-length"];

    const response = await fetch(`${configEnv.URL}/api/v1${url}`, {
      ...options,
      headers: {
        ...headersObject,
        "content-type": "application/json",
        // 'accept': 'application/json', // Uncomment if needed
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await deleteSession();
    }

    return await response.json();
  }catch (err){
    console.log(JSON.stringify(err, null, 2));
  }
};

const updateSession = async (data: {
  accessToken: string;
  refreshToken: string;
}) => {
  return fetch(`${configEnv.CLIENT_URL}/api/auth`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((res) => res.json());
};

const deleteSession = async () => {
  return fetch(`${configEnv.CLIENT_URL}/api/auth`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  }).then((res) => res.json());
};
