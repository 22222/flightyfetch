module.exports = {
	entry: __dirname + "/dist/tests.js",
	output: {
		path: __dirname + "/dist",
		filename: "tests.js",
		libraryTarget: "umd",
		library: "tests"
	},
	externals: {
		'chai': true,
		'sinon': true,
		'./flightyFetch': {
			root: 'flightyFetch',
			commonjs2: 'flightyfetch',
			commonjs: 'flightyfetch',
			amd: 'flightyfetch'
		}
	},
	devtool: 'source-map'
}
