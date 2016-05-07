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
 * Fetches a resource like the standard fetch function, but with support for cancellation.
 * 
 * @param input the url or request
 * @param options (optional) any options for initializing the request
 * @return a promise of the response to the fetch request
 */
export function fetch(input: string | Request, options?: FlightyFetchInit): Promise<Response> {
	function promiseCallback(resolve: (value: Response) => void, reject: (error: Error) => void): void {
		var request: Request;
		if (Request.prototype.isPrototypeOf(input) && !options) {
			request = <Request>input;
		} else {
			request = new Request(input, options);
		}

		var cancellationPromise: Promise<boolean>;
		var cancellationToken: CancellationToken;
		if (options) {
			cancellationPromise = options.cancellationPromise;
			cancellationToken = options.cancellationToken;
		}

		var xhr = new XMLHttpRequest();
		xhr.onload = function () {
			try {
				var status = xhr.status;
				if (xhr.status === 1223) {
					status = 204;
				}
				if (status < 100 || status >= 600) {
					reject(new TypeError('Network request failed'));
					return;
				}

				var responseBody: BodyInit;
				if ('response' in xhr) {
					responseBody = xhr.response
				} else {
					responseBody = xhr.responseText;
				}

				// Having an empty blob for a body can break things with some status codes in chrome.
				if (status != 200) {
					responseBody = normalizeBody(responseBody);
				}

				var responseHeaders = parseResponseHeaders(xhr);
				var responseOptions = <ResponseInit>{
					status: status,
					statusText: xhr.statusText,
					headers: responseHeaders,
					url: (<any>xhr).responseURL
				};
				var response = new Response(responseBody, responseOptions);
				resolve(response);
			} catch (e) {
				reject(e);
			}
		};
		xhr.onerror = function () {
			reject(new TypeError('Network request failed'));
		};
		xhr.ontimeout = function () {
			reject(new TypeError('Network request failed'));
		};
		xhr.onabort = function () {
			reject(new CancellationError('The request was cancelled'));
		};

		xhr.open(request.method, request.url, true);
		if (typeof request.headers.forEach === 'function') {
			// Chrome and the github/fetch polyfill have a forEach function.
			request.headers.forEach(function (value, name) {
				xhr.setRequestHeader(name, value);
			});
		} else if (typeof (<any>request.headers).entries === 'function') {
			// Firefox doesn't have forEach, but it does have an entries function.
			for (let pair of (<any>request.headers).entries()) {
				xhr.setRequestHeader(pair[0], pair[1]);
			}
		}

		if (request.credentials === 'include') {
			xhr.withCredentials = true;
		}
		if ('responseType' in xhr && typeof request.blob === 'function') {
			xhr.responseType = 'blob';
		}

		if (cancellationPromise && typeof cancellationPromise.then === 'function') {
			cancellationPromise.then(function (isCancellationRequested: boolean) {
				if (isCancellationRequested) {
					xhr.abort();
				}
			}).catch(function (e) {
				// We don't care about an error, but some browsers (Chrome) will 
				// put an error in the console if we don't have a handler for it.
			});
		}
		if (cancellationToken && typeof cancellationToken.register === 'function') {
			cancellationToken.register(() => xhr.abort());
		}

		getRequestDataAsync(request).then(function (data) {
			try {
				xhr.send(data);
			} catch (e) {
				reject(e);
			}
		}).catch(function (e) {
			reject(e);
		});
	}
	return new Promise<Response>(function (resolve, reject) {
		try {
			promiseCallback(resolve, reject);
		} catch (e) {
			reject(e);
		}
	});
}

/**
 * A token used to indicate the cancellation status of an operation.
 */
export class CancellationToken {
	private _isCancellationRequested: boolean = false;
	private _onCancelledCallbacks: (() => void)[] = [];

	/**
	 * Constructs a token that requests cancellation when the executor's cancel is called.
	 * 
	 * @param a function that will be called immediately to provide access to a cancel function and a and dispose function
	 */
	constructor(executor: (cancel: () => void, dispose?: () => void) => void) {
		var ct = this;
		function cancel() {
			if (ct._onCancelledCallbacks === null) throw new Error('The token has been disposed.');

			ct._isCancellationRequested = true;

			let onCancelledCallbacks = ct._onCancelledCallbacks;
			while (onCancelledCallbacks.length > 0) {
				let onCancelled = onCancelledCallbacks.pop();
				onCancelled();
			}
		}
		function dispose() {
			ct._onCancelledCallbacks = null;
		}
		executor(cancel, dispose);
	}

	/**
	 * Returns true if cancellation has been requested by the source of this token.
	 */
	get isCancellationRequested() {
		return this._isCancellationRequested;
	}

	/**
	 * Registers a callback to be called when cancellation is requested for this token.
	 * If the token has already been cancelled then the callback will be called immediately.
	 * 
	 * @param callback a function that will be called when and if the token is cancelled
	 */
	register(onCancelled: () => void): void {
		if (typeof (onCancelled) !== 'function') throw new Error('onCancelled must be a function');
		if (this._onCancelledCallbacks === null) throw new Error('The token has been disposed.');
		if (this._isCancellationRequested === true) {
			onCancelled();
			return;
		}
		this._onCancelledCallbacks.push(onCancelled);
	}
}

/**
 * An error thrown if a fetch is cancelled.
 */
export class CancellationError extends Error {
	/**
	 * Constructs a cancellation error with the specified message.
	 * 
	 * @param message the message for this error 
	 */
	constructor(public message: string) {
		super(message);
		this.name = 'CancellationError';
		this.message = message;
	}

	/**
	 * Returns a string that includes the error name and message. 
	 */
	toString() {
		return this.name + ': ' + this.message;
	}
}

/**
 * Parses the response headers from an XMLHttpRequest to a fetch api Headers object.
 */
function parseResponseHeaders(xhr: XMLHttpRequest): Headers {
	var result = new Headers();
	var headerStrings = (xhr.getAllResponseHeaders() || '').trim().split('\n');
	for (let headerString of headerStrings) {
		let separatorIndex = headerString.indexOf(':');
		if (separatorIndex < 0) {
			continue;
		}

		let name = headerString.substr(0, separatorIndex).trim();
		let value = headerString.substr(separatorIndex + 1).trim();
		try {
			result.append(name, value);
		} catch (e) {
			// Some headers may not be allowed in a non-polyfill implementation.
		}
	}
	return result;
}

/**
 * Returns a promise of the data from a Request object.
 */
function getRequestDataAsync(request: Request): Promise<BodyInit> {
	// The github/fetch polyfill may have the original body in a secret variable.
	// So I guess we'll use that if it's available?
	if ('_bodyInit' in request) {
		return Promise.resolve((<any>request)._bodyInit);
	}

	var result: Promise<BodyInit>;
	var contentType = parseContentType(request) || '';
	if (stringStartsWith(contentType, 'text/')) {
		result = request.text();
	} else if (typeof request.blob === 'function') {
		result = request.blob();
	} else {
		result = request.text();
	}

	// We don't want to send anything if the body is empty
	result = result.then(normalizeBody);

	return result;
}

/**
 * Parses and returns the content type from a fetch api Request object.
 */
function parseContentType(request: Request): string {
	if (!request || !request.headers) return null

	var contentType = request.headers.get('content-type')
	if (!contentType) return null

	var paramSeparatorIndex = contentType.indexOf(';')
	if (paramSeparatorIndex >= 0) {
		contentType = contentType.substr(0, paramSeparatorIndex).trim()
	}

	contentType = contentType.toLowerCase()

	return contentType;
}

/**
 * Returns the given request/response body if it is not empty, otherwise returns undefined.
 */
function normalizeBody(bodyInit: BodyInit): BodyInit {
	var modifiedBodyInit = bodyInit;
	if (modifiedBodyInit) {
		if (typeof (<Blob>bodyInit).size === 'number' && (<Blob>bodyInit).size === 0) {
			modifiedBodyInit = undefined;
		} else if (typeof (<string>bodyInit).length === 'number' && (<string>bodyInit).length === 0) {
			modifiedBodyInit = undefined;
		}
	}
	return modifiedBodyInit;
}

/**
 * Returns true if the string begins with the characters of the specified searchString.
 */
function stringStartsWith(str: string, searchString: string): boolean {
	if (typeof (<any>str).startsWith === 'function') {
		return (<any>str).startsWith(searchString);
	}
	return str.substr(0, searchString.length) === searchString;
}
