import flightyFetchAsync from './flightyFetch'
import { assert as assert } from 'chai'
import * as sinon from 'sinon'

var support = {
	blob: typeof new Request('test').blob === 'function',
	formData: typeof new Request('test').formData === 'function' && typeof FormData === 'function'
};

describe('with real xhr', function () {
	it('should reject on not found error', function () {
		return flightyFetchAsync('/notfound').catch(e => {
			assert.instanceOf(e, Error);
		});
	});
});

describe('with mocked xhr', function () {
	interface FixedSinonFakeXMLHttpRequest extends sinon.SinonFakeXMLHttpRequest {
		onSend: (xhr: FixedSinonFakeXMLHttpRequest) => void;
		requestBody: any;
	}

	var xhr: sinon.SinonFakeXMLHttpRequest;
	var lastCreatedRequest: FixedSinonFakeXMLHttpRequest;
	function respondOnSend(status: number, headers?: any, body?: any): void {
		lastCreatedRequest.onSend = function (request) {
			request.respond(status, headers, body);
		};
	}

	beforeEach(function () {
		xhr = <FixedSinonFakeXMLHttpRequest>sinon.useFakeXMLHttpRequest();
		lastCreatedRequest = null;
		xhr.onCreate = function (request: sinon.SinonFakeXMLHttpRequest) {
			lastCreatedRequest = <FixedSinonFakeXMLHttpRequest>request;

			// Fix: in sinon 1.17.3, calling abort on a fake request will trigger onload before onabort.
			// So we need to work around that until we get the changes in sinon#861.
			var originalAbort = (<any>lastCreatedRequest).abort;
			(<any>lastCreatedRequest).abort = function () {
				this.dispatchEvent(new (<any>sinon).Event("abort", false, false, this));
				originalAbort.apply(this, arguments);
			};
		};
	});
	afterEach(function () {
		xhr.restore();
	});

	describe('sucessful requests', function () {
		it('should fetch plain text file', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt').then(response => {
				assert.equal(response.status, 200);
				assert.equal(response.statusText, 'OK');
				assert.equal(response.headers.get('Content-Length'), '12');
				assert.equal(response.headers.get('Content-Type'), 'text/plain');
				assert.equal(response.headers.get('Cache-Control'), 'public,max-age=3600,public');
				assert.equal(response.url, '');
				return response.text();
			}).then(responseText => {
				assert.equal(responseText, 'Hello world!');
			});

			respondOnSend(
				200,
				{
					'Cache-Control': 'public,max-age=3600,public',
					'Content-Length': '12',
					'Content-Type': 'text/plain'
				},
				'Hello world!'
			);

			return fetchPromise;
		});

		it('should fetch json file', function () {
			var expectedJson = {
				"total_count": 10124,
				"incomplete_results": false,
				"items": [
					{
						"id": 25136308,
						"name": "fetch",
						"full_name": "github/fetch"
					},
					{
						"id": 5777189,
						"name": "fetch",
						"full_name": "whatwg/fetch"
					}
				]
			};

			var fetchPromise = flightyFetchAsync('https://api.github.com/search/repositories?q=fetch', {
				headers: {
					'Host': 'api.github.com',
					'Connection': 'keep-alive',
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Origin': 'http://www.example.com',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36',
					'Referer': 'http://www.example.com/examples.html',
					'Accept-Encoding': 'gzip, deflate, sdch',
					'Accept-Language': 'en-US,en;q=0.8'
				}
			}).then(response => response.json()).then(responseJson => {
				assert.deepEqual(responseJson, expectedJson);
			});

			respondOnSend(
				200,
				{
					'Server': 'GitHub.com',
					'Date': 'Sun, 24 Apr 2016 14:25:42 GMT',
					'Content-Type': 'application/json; charset=utf-8',
					'Transfer-Encoding': 'chunked',
					'Status': '200 OK',
					'X-RateLimit-Limit': '10',
					'X-RateLimit-Remaining': '9',
					'X-RateLimit-Reset': '1461508002',
					'Cache-Control': 'no-cache',
					'X-GitHub-Media-Type': 'github.v3',
					'Link': '<https://api.github.com/search/repositories?q=fetch&page=2>; rel="next", <https://api.github.com/search/repositories?q=fetch&page=34>; rel="last"',
					'Access-Control-Expose-Headers': 'ETag, Link, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval',
					'Access-Control-Allow-Origin': '*',
					'Content-Security-Policy': "default-src 'none'",
					'Strict-Transport-Security': 'max-age=31536000; includeSubdomains; preload',
					'X-Content-Type-Options': 'nosniff',
					'X-Frame-Options': 'deny',
					'X-XSS-Protection': '1; mode=block',
					'Vary': 'Accept-Encoding',
					'Content-Encoding': 'gzip'
				},
				JSON.stringify(expectedJson)
			);

			return fetchPromise;
		});

		it('should post plain text file', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				method: 'post',
				body: 'Hello world!',
				headers: {
					'Content-Length': '12',
					'Content-Type': 'text/plain'
				}
			}).then(response => response.text()).then(responseText => {
				assert.equal(lastCreatedRequest.requestBody, 'Hello world!');
				assert.equal(responseText, '');
			});

			assert.equal(lastCreatedRequest.method, 'POST');
			respondOnSend(200, null, null);

			return fetchPromise;
		});

		var allowedStatusCodes = [204, 400, 401, 403, 404, 500, 599];
		for (let allowedStatusCode of allowedStatusCodes) {
			it('should resolve if status code is ' + allowedStatusCode, function () {
				var fetchPromise = flightyFetchAsync('/helloworld.txt').then(response => {
					assert.equal(response.status, allowedStatusCode);
				});
				respondOnSend(allowedStatusCode, null, null);
				return fetchPromise;
			});
		}

		it('might resolve or reject is status code is 100', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt').then(response => {
				// The polyfill and Firefox implementations should allow a status of 100
				assert.equal(response.status, 100);
			}).catch(e => {
				// Chrome won't let you create a Response with a status code less than 200.
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).name, 'RangeError');
			});
			respondOnSend(100);
			return fetchPromise;
		});

		it('should resolve and normalize if status code is 1223', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt').then(response => {
				assert.equal(response.status, 204);
			});
			respondOnSend(1223);
			return fetchPromise;
		});
	});

	describe('failed requests', function () {
		it('should reject if status code less than 100', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt').catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'Network request failed');
				assert.equal((<Error>e).name, 'TypeError');
			});
			respondOnSend(99, null, null);
			return fetchPromise;
		});
		it('should reject if status code greater than 599', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt').catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'Network request failed');
				assert.equal((<Error>e).name, 'TypeError');
			});
			respondOnSend(599, null, null);
			return fetchPromise;
		});
	});

	if (support.formData) {
		describe('form data requests', function () {
			it('should post form data', function () {
				var expectedFormData = new FormData();
				expectedFormData.append('id', '2');
				expectedFormData.append('message', 'Hello world!');

				var fetchPromise = flightyFetchAsync('/submit', {
					method: 'post',
					headers: {
						'Content-Type': 'multipart/form-data'
					},
					body: expectedFormData
				}).then(response => response.text()).then(responseText => {
					//assert.instanceOf(lastCreatedRequest.requestBody, FormData);
					//assert.deepEqual(lastCreatedRequest.requestBody, expectedFormData);
				});

				assert.equal(lastCreatedRequest.method, 'POST');
				respondOnSend(200, null, '');

				return fetchPromise;
			});
		});

	}

	if (support.blob) {
		describe('blob requests', function () {
			it('should post blob file', function () {
				var expectedBlob = new Blob(['Hello world!'], { type: 'application/x-text' });
				var fetchPromise = flightyFetchAsync('/helloworld.dat', {
					method: 'post',
					body: expectedBlob
				}).then(response => response.blob()).then(responseBlob => {
					assert.instanceOf(lastCreatedRequest.requestBody, Blob);
					assert.deepEqual(lastCreatedRequest.requestBody, expectedBlob);
					assert.instanceOf(responseBlob, Blob);
					assert.deepEqual(responseBlob, new Blob());
				});

				assert.equal(lastCreatedRequest.method, 'POST');
				respondOnSend(200, null, null);

				return fetchPromise;
			});
		});
	}


	describe('cancelled requests', function () {
		it('should reject if cancelled before starting', function () {
			return flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: Promise.resolve(true)
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
		});

		it('should reject if cancelled immediately after starting', function () {
			var cancelCallback: () => void;
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: new Promise<boolean>(function (resolve) {
					cancelCallback = () => resolve(true);
				})
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
			cancelCallback();
			return fetchPromise;
		});

		it('should reject if cancelled immediately after sending', function () {
			var cancelCallback: () => void;
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: new Promise<boolean>(function (resolve) {
					cancelCallback = () => resolve(true);
				})
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
			lastCreatedRequest.onSend = request => {
				cancelCallback();
			};
			return fetchPromise;
		});

		it('should reject if cancelled after starting with delay', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: new Promise<boolean>(function (resolve) {
					setTimeout(() => resolve(true), 500);
				})
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
			return fetchPromise;
		});

		it('should reject if cancelled after sending with delay', function () {
			var cancelCallback: () => void;
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: new Promise<boolean>(function (resolve) {
					cancelCallback = () => resolve(true);
				})
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
			lastCreatedRequest.onSend = request => {
				setTimeout(cancelCallback, 500);
			};
			return fetchPromise;
		});

		it('should resolve if cancelled after response', function () {
			var cancelCallback: () => void;
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: new Promise<boolean>(function (resolve) {
					cancelCallback = () => resolve(true);
				})
			}).then(response => response.text()).then(responseText => {
				assert.equal(responseText, 'Hello world!');
			});
			lastCreatedRequest.onSend = function (request) {
				request.respond(200, null, 'Hello world!');
				cancelCallback();
			};
			return fetchPromise;
		});

		it('should resolve if cancellationPromise resolves to false', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: Promise.resolve(false)
			}).then(response => response.text()).then(responseText => {
				assert.equal(responseText, 'Hello world!');
			});
			respondOnSend(200, null, 'Hello world!');
			return fetchPromise;
		});

		it('should resolve if cancellationPromise rejects', function () {
			var fetchPromise = flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: Promise.reject(true)
			}).then(response => response.text()).then(responseText => {
				assert.equal(responseText, 'Hello world!');
			});
			respondOnSend(200, null, 'Hello world!');
			return fetchPromise;
		});

		it('should reject if cancellation promise resolves with undefined', function () {
			return flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: Promise.resolve()
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
		});

		it('should reject if cancellation promise resolves with zero', function () {
			return flightyFetchAsync('/helloworld.txt', {
				cancellationPromise: Promise.resolve(<any>0)
			}).catch(e => {
				assert.instanceOf(e, Error);
				assert.equal((<Error>e).message, 'The request was cancelled');
				assert.equal((<Error>e).name, 'CancellationError');
			});
		});
	});
});
