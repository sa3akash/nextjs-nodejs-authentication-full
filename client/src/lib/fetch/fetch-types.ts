/**
 * A class for handling errors that occur during HTTP requests.
 *
 * @extends Error
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {string} message - The error message.
 */
export class FetchError extends Error {
  public constructor(
    public statusCode: number,
    public message: string,
  ) {
    super(message); // Call the parent class constructor

    // Set the prototype for proper instanceof behavior
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Type for search parameters that can be passed in a request.
 *
 * Keys can be strings, and values can be:
 * - strings
 * - numbers
 * - boolean values
 * - undefined
 * - arrays containing strings, numbers, boolean values, or undefined
 */
export type TypeSearchParams = {
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | Array<string | number | boolean | undefined>;
};

/**
 * Interface for request options, extending the standard RequestInit.
 *
 * @extends RequestInit
 * @property {Record<string, string>} [headers] - Headers to be added to the request.
 * @property {TypeSearchParams} [params] - Search parameters to be appended to the URL.
 */
export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: TypeSearchParams;
}

/**
 * Type for request configuration, which may include parameters and additional options.
 *
 * @template Params - The type of parameters that can be passed in the request.
 * @property {RequestOptions} [config] - Additional options for the request.
 * @property {Params} [params] - Parameters to be included in the request, if defined.
 */
export type TypeFetchRequestConfig<Params = undefined> =
  Params extends undefined
    ? { config?: RequestOptions }
    : { params: Params; config?: RequestOptions };
