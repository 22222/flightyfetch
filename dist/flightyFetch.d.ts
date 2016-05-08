/**
 * The options for starting a fetch request.
 */
export interface FlightyFetchInit extends RequestInit {
    /**
     * A promise that will resolve to true if the fetch request should be cancelled.
     */
    cancellationPromise?: Promise<boolean>;
    /**
     * A token that indicates whether the fetch request should be cancelled.
     */
    cancellationToken?: CancellationToken;
}
/**
 * Fetches a resource like the standard fetch function, but with added support for cancellation.
 *
 * @param input the url or request
 * @param options (optional) any options for initializing the request
 * @return a promise of the response to the fetch request
 */
export declare function fetch(input: string | Request, options?: FlightyFetchInit): Promise<Response>;
/**
 * A token used to indicate the cancellation status of an operation.
 */
export declare class CancellationToken {
    private _isCancellationRequested;
    private _onCancelledCallbacks;
    /**
     * Constructs a token that requests cancellation when the executor's cancel is called.
     *
     * @param a function that will be called immediately to provide access to a cancel function and a and dispose function
     */
    constructor(executor: (cancel: () => void, dispose?: () => void) => void);
    /**
     * Returns true if cancellation has been requested by the source of this token.
     */
    isCancellationRequested: boolean;
    /**
     * Registers a callback to be called when cancellation is requested for this token.
     * If the token has already been cancelled then the callback will be called immediately.
     *
     * @param callback a function that will be called when and if the token is cancelled
     */
    register(onCancelled: () => void): void;
}
/**
 * An error thrown if a fetch is cancelled.
 */
export declare class CancellationError extends Error {
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
