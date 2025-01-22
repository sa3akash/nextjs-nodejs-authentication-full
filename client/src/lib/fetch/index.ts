import {
  FetchError,
  RequestOptions,
  TypeSearchParams,
} from "@/lib/fetch/fetch-types";

/**
 * A class for performing HTTP requests using the Fetch API.
 */
export class FetchClient {
  private baseUrl: string;
  public headers?: Record<string, string>;
  public params?: TypeSearchParams;
  public options?: RequestOptions;

  /**
   * Constructor for the FetchClient class.
   *
   * @param {Object} init - Initial parameters for the client.
   * @param {string} init.baseUrl - The base URL for requests.
   * @param {Record<string, string>} [init.headers] - Headers for the requests.
   * @param {TypeSearchParams} [init.params] - Query parameters for requests.
   * @param {RequestOptions} [init.options] - Additional request options.
   */
  public constructor(init: {
    baseUrl: string;
    headers?: Record<string, string>;
    params?: TypeSearchParams;
    options?: RequestOptions;
  }) {
    this.baseUrl = init.baseUrl;
    this.headers = init.headers;
    this.params = init.params;
    this.options = init.options;
  }

  /**
   * Creates a query string for the URL.
   *
   * @param {TypeSearchParams} params - Query parameters.
   * @returns {string} - Query string starting with "?".
   */
  private createSearchParams(params: TypeSearchParams) {
    const searchParams = new URLSearchParams();

    for (const key in { ...this.params, ...params }) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];

        if (Array.isArray(value)) {
          value.forEach((currentValue) => {
            if (currentValue) {
              searchParams.append(key, currentValue.toString());
            }
          });
        } else if (value) {
          searchParams.set(key, value.toString());
        }
      }
    }

    return `?${searchParams.toString()}`;
  }

  /**
   * Performs an HTTP request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {RequestInit['method']} method - HTTP method (GET, POST, PUT, etc.).
   * @param {RequestOptions} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   * @throws {FetchError} - Throws a FetchError if the response is not successful.
   */
  private async request<T>(
    endpoint: string,
    method: RequestInit["method"],
    options: RequestOptions = {},
  ) {
    let url = `${this.baseUrl}/${endpoint}`;

    if (options.params) {
      url += this.createSearchParams(options.params);
    }

    const config: RequestInit = {
      ...options,
      ...(!!this.options && { ...this.options }),
      method,
      headers: {
        ...(!!options?.headers && options.headers),
        ...this.headers,
      },
    };

    const response: Response = await fetch(url, config);

    if (!response.ok) {
      const error = (await response.json()) as { message: string } | undefined;
      throw new FetchError(
        response.status,
        error?.message || response.statusText,
      );
    }

    if (response.headers.get("Content-Type")?.includes("application/json")) {
      return (await response.json()) as unknown as T;
    } else {
      return (await response.text()) as unknown as T;
    }
  }

  /**
   * Performs a GET request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {Omit<RequestOptions, 'body'>} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   */
  public get<T>(endpoint: string, options: Omit<RequestOptions, "body"> = {}) {
    return this.request<T>(endpoint, "GET", options);
  }

  /**
   * Performs a POST request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {Record<string, any>} [body] - The request body.
   * @param {RequestOptions} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   */
  public post<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {},
  ) {
    return this.request<T>(endpoint, "POST", {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...(!!body && { body: JSON.stringify(body) }),
    });
  }

  /**
   * Performs a PUT request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {Record<string, any>} [body] - The request body.
   * @param {RequestOptions} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   */
  public put<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {},
  ) {
    return this.request<T>(endpoint, "PUT", {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...(!!body && { body: JSON.stringify(body) }),
    });
  }

  /**
   * Performs a DELETE request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {Omit<RequestOptions, 'body'>} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   */
  public delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, "body"> = {},
  ) {
    return this.request<T>(endpoint, "DELETE", options);
  }

  /**
   * Performs a PATCH request.
   *
   * @template T
   * @param {string} endpoint - The API endpoint for the request.
   * @param {Record<string, any>} [body] - The request body.
   * @param {RequestOptions} [options={}] - Additional request options.
   * @returns {Promise<T>} - The response from the server, cast to type T.
   */
  public patch<T>(
    endpoint: string,
    body?: Record<string, any>,
    options: RequestOptions = {},
  ) {
    return this.request<T>(endpoint, "PATCH", {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...(!!body && { body: JSON.stringify(body) }),
    });
  }
}
