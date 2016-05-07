A javascript library that adds cancellation to the [fetch api](https://fetch.spec.whatwg.org/).

Overview
========
The fetch api is a huge improvement over XMLHttpRequest for performing ajax requests.  And there's already a great [polyfill](https://github.com/github/fetch) for it, so you can be using it now.

There's just one big thing missing: XHR has an `abort` function for cancelling a request, and so far there's no equivalent feature in the fetch api.  There's an [issue](https://github.com/whatwg/fetch/issues/27) for adding the feature, but it could be a long time before any consensus is reached.

So that's where this library comes in: the goal is for this to be completely compatible with the fetch api except for the addition of a cancellation feature.

Cancellation
============
Cancellation is supported through a `CancellationToken` object that can let you know when a fetch should be cancelled.  The provided `CancellationToken` class has a constructor that's very similar to an ES6 Promise.  Once you've created the token, it can be passed in as a property on the fetch options object.  Here's an example:

```js
var cancellationToken = new CancellationToken(function(cancel) {
	setTimeout(function() { cancel(); }, 1000);
});
flightyFetch('https://api.github.com/repositories', {
	cancellationToken: cancellationToken
});
```

We've seen that creating a cancellation token is very similar to creating an ES6 promise, and the way they're used is kind of similar.  Would it make sense to forget about tokens and just use a promise instead?  That's an option too:

```js
var cancellationPromise = new Promise(function(resolve) {
	setTimeout(function() { resolve(true); }, 1000);
});
flightyFetch('https://api.github.com/repositories', {
	cancellationPromise: cancellationPromise
});
```

The idea here is that you're promising to tell the fetch function whether it is cancelled.  So you resolve with true to say "isCancellationRequested = true".  If you resolve with a falsey value or reject the promise, then that means that the fetch will not be cancelled.

Is this a misuse of the promise concept?  I don't know, maybe.  It's up to you to decide.


Design
======
The token stuff used by this library is inspired by the design of [cancellation in .NET 4](https://msdn.microsoft.com/en-us/library/dd997364%28v=vs.110%29.aspx).

The .NET 4 equivalent to the fetch API is the `HttpClient.SendAsync` method.  Like the javascript fetch function, it accepts a request object as its first parameter and returns the prmose of a response object.  But it also has an override that accepts an optional `CancellationToken` parameter:

```c#
public Task<HttpResponseMessage> SendAsync(
	HttpRequestMessage request,
	CancellationToken cancellationToken
)
```

Here's an example of using it (not worrying about disposing and not using some convenience methods for demonstration purposes):

```c#
var cts = new CancellationTokenSource();
Task.Delay(1000).ContinueWith((task) => cts.Cancel());
var response = await new HttpClient().SendAsync(
	request: new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repositories"),
	cancellationToken: cts.Token
);
```

The basic idea is that the `CancellationTokenSource` object lets you control when the cancellation happens.  Then instead of directly passing the source around, you get a `CancellationToken` through its `Token` property.  That token is what you share, and it provides ways to register for cancellation notifications.  Example:

```c#
var cts = new CancellationTokenSource();

var token = cts.Token;
token.Register(() => Console.WriteLine("Cancelled: " + token.IsCancellationRequested));

cts.Cancel();
```

So if we want similar functionality in javascript, one option would be to recreate the same kind of interface:

```typescript
interface CancellationTokenSource {
	 cancel(): void;
	 dispose(): void;
	 token(): CancellationToken;
}
interface CancellationToken {
	isCancellationRequested: boolean;
	register(onCancelled: () => void): void;
}
```

There are some strong similarities between this and the `Deferred`/`Promise` relationship from some javascript promise libraries.  You have the CancellationTokenSource or Deferred object that provides control over the operation, and the CancellationToken or Promise that gives you a view of the result and a way to be notified of completion. 

But the ES6 standard for promises doesn't have a separate Deferred class.  Instead, it has a constructor that accepts an "executor" function parameter that gets a resolve and a reject function.  So a more consistent approach might be to do the same kind of thing to get rid of the CancellationTokenSource:

```typescript
declare class CancellationToken {
	constructor(executor: (cancel: () => void, dispose?: () => void) => void);
	isCancellationRequsted: boolean; 
	register(onCancelled: () => void): void;
}
```

This version actually has a lot of similarities the ES6 promise class:

```typescript
declare class Promise<T> {
	constructor(executor: (resolve: () => void, reject?: () => void) => void);
	then<U>(onResolved?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => any): Promise<U>;
	catch<U>(onRejected?: (error: any) => U | Thenable<U>): Promise<U>;
}
```

So does it make sense to just use a promise instead of adding a new `CancellationToken` class?  Or is that an abuse of the promise concept?

The [Promises/A+ standard](https://promisesaplus.com/) has a definition for a promise:

> A promise represents the eventual result of an asynchronous operation.

Is cancelling an asynchronous operation that we're waiting to complete?  With future async/await support, would it make sense to await for the result of a cancellation promise?

```javascript
var isCancelled = await cancellationPromise;
```

That doesn't seem like a very useful thing to do, especially in the single-threaded world of javascript.  Does that mean we shouldn't be using promises for this?

The `CancellationToken` class does seem to have a very similar purpose to the `Promise` class, so it seems a little redundant to have both.  But at the same time, it doesn't feel exactly like what promises were designed for.

But in the end, the decision was not to decide: both the token and promise versions are supported.  This is just a library, not a specification, so maybe it's better to provide the choice and see if one of the two options ends up more popular.


Installation
============
This thing can be installed with npm:

```sh
npm install flightyfetch
```

It also depends on some parts of the fetch API, like the Request and Response classes.  So you will probably want to use it with a polyfill, like the [github fetch polyfill](https://github.com/github/fetch):

```sh
npm install whatwg-fetch
```

Then it can be used like this:

```javascript
var flightyFetch = require('flightyfetch').fetch;
flightyFetch('https://api.github.com/repositories', {
	cancellationPromise: new Promise(function(resolve) {
		setTimeout(function() { resolve(true); }, 1000);
	})
}).then(function(response) { 
	return response.json();
}).then(function(responseJson) {
	console.log(responseJson);
}).catch(function(e) {
	console.log(e);
});
```

You can also download [flightyFetch.js](dist/flightyFetch.js) or the [minified](dist/flightyFetch.min.js) version directly, and then use them like this:

```html
<script src="dist/flightyFetch.js"></script>
<script>
flightyFetch.fetch('https://api.github.com/repositories');
</script>
```

Usage
=====
Except for the addition of the cancellation feature, using this is exactly like using the [fetch api](https://fetch.spec.whatwg.org/).  There's already great documentation about how to use that at [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), so check that out if you want to know how to use the fetch api in general.

This library adds one additional property to the options on the fetch method: `cancellationPromise`.  

So the idea is that you can create this promise and pass it in when you initiate the fetch request.  Then if at any point you resolve that promise, the request will be aborted.

Example:

```javascript
var cancellationCallback;
flightyFetch.fetch('https://api.github.com/repositories', {
	cancellationPromise: new Promise(function(resolve) {
		cancellationCallback = resolve
	})
}).then(function(response) { 
	return response.json();
}).then(function(responseJson) {
	console.log('responseJson', responseJson);
}).catch(function(e) {
	if (e.name === 'CancellationError') {
		console.log('Request cancelled', e);
	} else {
		console.log('Request failed', e);
	}
});

setTimeout(function() { 
	cancellationCallback();
}, 1);
```

There are two ways of looking at the cancellation promise:

1. The promise is resolved with an isCancelled value: true to cancel the fetch, or false if the fetch will never be cancelled.
2. The promise is resolved (with no value) if the fetch is cancelled, or rejected if the fetch will never be cancelled

Fortunately, these two schemes are compatible.  So both are supported: the promise is cancelled if you resolve with any value other than `false`, and it is not cancelled if you reject the promise.

Also, it is safe to resolve/reject the cancellation promise at any time.  If the fetch request is already complete, then nothing will happen.

Check out the [demo](http://htmlpreview.github.io/?https://github.com/22222/flightyfetch/blob/master/demo.html) page for some more complete examples.


Building From Source
====================
This thing is written in typescript, so it does require a compilation step.  

To run the build, the only thing you have to install manually is [Node.js](https://nodejs.org) with [npm](https://www.npmjs.com/).  Then you can install the other dependencies by running these commands from the root directory of the repository:  

```sh
npm install
npm run init
```

Then you can use the npm `build` script to compile everything into the dist folder and runs some tests:

```sh
npm run build
```

You can also run the tests in several browsers with the `karma` script.  Like this:

```sh
npm run karma
```

And that's about it?