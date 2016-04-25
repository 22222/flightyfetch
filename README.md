This library has one purpose: to add a cancellation feature to the [fetch api](https://fetch.spec.whatwg.org/).

The fetch api is a huge improvement over XMLHttpRequest for performing ajax requests.  And there's already a great [polyfill](https://github.com/github/fetch) for it, so you can be using it now.

But XHR has an `abort` function for cancelling a request, and so far there's no equivalent feature in the fetch api.   There's an [issue](https://github.com/whatwg/fetch/issues/27) for adding the feature, but it may be a long time before any consensus is reached.

But you don't want to wait to use the fetch api just because you need to be able to cancel a request, right?  That's where this library comes in: its goal is to be completely compatible with the fetch api except for the addition of a cancellation feature.

Install
=======
This thing can be installed with npm:

```sh
npm install flightyfetch
```

Here's an example of using it:

```javascript
var flightyFetch = require('flightyfetch');
flightyFetch('https://api.github.com/search/repositories?q=fetch', {
	cancellationPromise: new Promise(function(resolve) {
		setTimeout(function() { resolve(true); }, 10000);
	})
}).then(function(response) { 
	return response.json();
}).then(function(responseJson) {
	console.log(responseJson);
}).catch(function(e) {
	console.log(e);
});
```

You can also download [flightyFetch.js](dist/flightyFetch.js) or the [minified](dist/flightyFetch.min.js) version directly.  Then it can be included in an HTML document like this:

```html
<script src="dist/flightyFetch.js"></script>
<script>
flightyFetch('https://api.github.com/search/repositories?q=fetch');
</script>
```

Use
===
Except for the addition of the cancellation feature, using this is exactly like using the [fetch api](https://fetch.spec.whatwg.org/).  There's already great documentation about how to use that at [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), so check that out if you want to know how to use the fetch api in general.

This library adds one additional property to the options on the fetch method: `cancellationPromise`.  

So the idea is that you can create this promise and pass it in when you initiate the fetch request.  Then if at any point you resolve that promise, the request will be aborted.

There was already an example in the [Install](#install) section, but here's another:

```javascript
var cancellationCallback;
flightyFetch('https://api.github.com/search/repositories?q=fetch', {
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


Polyfill
========
This library is not a fetch polyfill.  In fact, it depends on some parts of the fetch API to exist.  So you will probably want to use it with a polyfill, like the [github fetch polyfill](https://github.com/github/fetch).

Hopefully at some point the real fetch API will have a cancellation feature, at which point this library will be obsolete.  But it may end up looking very different from this library, so this will stick around for as long as anyone might need to use it.


Build From Source
=================
This thing is written in typescript, so it does require a compilation step.  

To run the build, the only thing you have to install manually is [Node.js](https://nodejs.org) with [npm](https://www.npmjs.com/).  Then you can install the other dependencies by running this once:  

```sh
npm install
```

The build can be run through npm with the `build` script, which compiles everything and runs the tests with phantomjs.  You can also run the tests in several browsers with the `karma` script.  Like this:

```sh
npm run build
npm run karma
```
