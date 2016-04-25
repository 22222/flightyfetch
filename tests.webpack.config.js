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
		'sinon': true
	},
	devtool: 'source-map',
	resolve: {
		extensions: ['', '.ts', '.js']
	}
}
