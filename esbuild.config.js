const version = process.versions.node;

module.exports = (serverless) => ({
	external: [
		"@aws-sdk/*"
	],
	format: 'cjs',
	keepNames: true,
	minify: true,
	platform: 'node',
	plugins: [],
	sourcemap: true,
	target: `node${version}`,
	treeShaking: true,
	keepOutputDirectory: true
});
