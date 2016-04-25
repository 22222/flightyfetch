/**
 * The options for starting a fetch request.
 */
export interface FlightyFetchInit extends RequestInit {
    /**
     * A promise that will resolve to true if the fetch request should be cancelled.
     */
    cancellationPromise?: Promise<boolean>;
}
/**
 * Fetches a resource like the standard fetch function, but with support for cancellation.
 *
 * @param input the url or request
 * @param options (optional) any options for initializing the request
 * @return a promise of the response to the fetch request
 */
export declare function fetch(input: string | Request, options?: FlightyFetchInit): Promise<Response>;
/**
 * An error thrown if a fetch is cancelled.
 */
export declare class CancellationError extends Error {
    message: string;
    /**
     * Constructs a cancellation error with the specified message.
     *
     * @param message the message for this error
     */
    constructor(message: string);
    /**
     * Returns a string that includes the error name and message.
     */
    toString(): string;
}
