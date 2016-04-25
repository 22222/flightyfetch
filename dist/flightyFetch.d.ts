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
export default function flightyFetchAsync(input: string | Request, options?: FlightyFetchInit): Promise<Response>;
