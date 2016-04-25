module.exports = function (config) {
	config.set({
		frameworks: ['mocha'],
		browsers : ['Chrome', 'Firefox', 'IE' ],
		files: [
			'node_modules/mocha/mocha.js',
			'node_modules/chai/chai.js',
			'node_modules/sinon/pkg/sinon.js',
			'node_modules/es6-promise/dist/es6-promise.js',
			'node_modules/whatwg-fetch/fetch.js',
			'dist/flightyFetch.min.js',
			'dist/tests.js'
		]
	});
};
