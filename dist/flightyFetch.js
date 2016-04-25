(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["flightyFetch"] = factory();
	else
		root["flightyFetch"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	/**
	 * Fetches a resource like the standard fetch function, but with support for cancellation.
	 *
	 * @param input the url or request
	 * @param options (optional) any options for initializing the request
	 * @return a promise of the response to the fetch request
	 */
	function fetch(input, options) {
	    function promiseCallback(resolve, reject) {
	        var request;
	        if (Request.prototype.isPrototypeOf(input) && !options) {
	            request = input;
	        }
	        else {
	            request = new Request(input, options);
	        }
	        var cancellationPromise;
	        if (options) {
	            cancellationPromise = options.cancellationPromise;
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
	                var responseBody;
	                if ('response' in xhr) {
	                    responseBody = xhr.response;
	                }
	                else {
	                    responseBody = xhr.responseText;
	                }
	                // Having an empty blob for a body can break things with some status codes in chrome.
	                if (status != 200) {
	                    responseBody = normalizeBody(responseBody);
	                }
	                var responseHeaders = parseResponseHeaders(xhr);
	                var responseOptions = {
	                    status: status,
	                    statusText: xhr.statusText,
	                    headers: responseHeaders,
	                    url: xhr.responseURL
	                };
	                var response = new Response(responseBody, responseOptions);
	                resolve(response);
	            }
	            catch (e) {
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
	        }
	        else if (typeof request.headers.entries === 'function') {
	            // Firefox doesn't have forEach, but it does have an entries function.
	            for (var _i = 0, _a = request.headers.entries(); _i < _a.length; _i++) {
	                var pair = _a[_i];
	                xhr.setRequestHeader(pair[0], pair[1]);
	            }
	        }
	        if (request.credentials === 'include') {
	            xhr.withCredentials = true;
	        }
	        if ('responseType' in xhr && typeof request.blob === 'function') {
	            xhr.responseType = 'blob';
	        }
	        // Here's the only reason this library exists
	        if (cancellationPromise && typeof cancellationPromise.then === 'function') {
	            cancellationPromise.then(function (isCancelled) {
	                if (isCancelled !== false) {
	                    xhr.abort();
	                }
	            }).catch(function (e) {
	                // We don't care about an error, but some browsers (Chrome)  will 
	                // put an error in the console if we don't have a handler for it.
	            });
	        }
	        getRequestDataAsync(request).then(function (data) {
	            try {
	                xhr.send(data);
	            }
	            catch (e) {
	                reject(e);
	            }
	        }).catch(function (e) {
	            reject(e);
	        });
	    }
	    return new Promise(function (resolve, reject) {
	        try {
	            promiseCallback(resolve, reject);
	        }
	        catch (e) {
	            reject(e);
	        }
	    });
	}
	exports.fetch = fetch;
	/**
	 * An error thrown if a fetch is cancelled.
	 */
	var CancellationError = (function (_super) {
	    __extends(CancellationError, _super);
	    /**
	     * Constructs a cancellation error with the specified message.
	     *
	     * @param message the message for this error
	     */
	    function CancellationError(message) {
	        _super.call(this, message);
	        this.message = message;
	        this.name = 'CancellationError';
	        this.message = message;
	    }
	    /**
	     * Returns a string that includes the error name and message.
	     */
	    CancellationError.prototype.toString = function () {
	        return this.name + ': ' + this.message;
	    };
	    return CancellationError;
	}(Error));
	exports.CancellationError = CancellationError;
	/**
	 * Parses the response headers from an XMLHttpRequest to a fetch api Headers object.
	 */
	function parseResponseHeaders(xhr) {
	    var result = new Headers();
	    var headerStrings = (xhr.getAllResponseHeaders() || '').trim().split('\n');
	    for (var _i = 0, headerStrings_1 = headerStrings; _i < headerStrings_1.length; _i++) {
	        var headerString = headerStrings_1[_i];
	        var separatorIndex = headerString.indexOf(':');
	        if (separatorIndex < 0) {
	            continue;
	        }
	        var name_1 = headerString.substr(0, separatorIndex).trim();
	        var value = headerString.substr(separatorIndex + 1).trim();
	        try {
	            result.append(name_1, value);
	        }
	        catch (e) {
	        }
	    }
	    return result;
	}
	/**
	 * Returns a promise of the data from a Request object.
	 */
	function getRequestDataAsync(request) {
	    // The github/fetch polyfill may have the original body in a secret variable.
	    // So I guess we'll use that if it's available?
	    if ('_bodyInit' in request) {
	        return Promise.resolve(request._bodyInit);
	    }
	    var result;
	    var contentType = parseContentType(request) || '';
	    if (stringStartsWith(contentType, 'text/')) {
	        result = request.text();
	    }
	    else if (typeof request.blob === 'function') {
	        result = request.blob();
	    }
	    else {
	        result = request.text();
	    }
	    // We don't want to send anything if the body is empty
	    result = result.then(normalizeBody);
	    return result;
	}
	/**
	 * Parses and returns the content type from a fetch api Request object.
	 */
	function parseContentType(request) {
	    if (!request || !request.headers)
	        return null;
	    var contentType = request.headers.get('content-type');
	    if (!contentType)
	        return null;
	    var paramSeparatorIndex = contentType.indexOf(';');
	    if (paramSeparatorIndex >= 0) {
	        contentType = contentType.substr(0, paramSeparatorIndex).trim();
	    }
	    contentType = contentType.toLowerCase();
	    return contentType;
	}
	/**
	 * Returns the given request/response body if it is not empty, otherwise returns undefined.
	 */
	function normalizeBody(bodyInit) {
	    var modifiedBodyInit = bodyInit;
	    if (modifiedBodyInit) {
	        if (typeof bodyInit.size === 'number' && bodyInit.size === 0) {
	            modifiedBodyInit = undefined;
	        }
	        else if (typeof bodyInit.length === 'number' && bodyInit.length === 0) {
	            modifiedBodyInit = undefined;
	        }
	    }
	    return modifiedBodyInit;
	}
	/**
	 * Returns true if the string begins with the characters of the specified searchString.
	 */
	function stringStartsWith(str, searchString) {
	    if (typeof str.startsWith === 'function') {
	        return str.startsWith(searchString);
	    }
	    return str.substr(0, searchString.length) === searchString;
	}
	//# sourceMappingURL=flightyFetch.js.map

/***/ }
/******/ ])
});
;
//# sourceMappingURL=flightyFetch.js.map