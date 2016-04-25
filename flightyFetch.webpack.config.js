module.exports = {
	entry: __dirname + "/dist/flightyFetch.js",
	output: {
		path: __dirname + "/dist",
		filename: "flightyFetch.js",
		libraryTarget: "umd",
		library: "flightyFetch"
	},
	devtool: 'source-map'
}
