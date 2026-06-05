const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const sharedResolve = {
	extensions: [".ts", ".js", ".json"],
	// Keep webpack path resolution aligned with TypeScript path aliases.
	plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "../tsconfig.json") })],
	alias: {
		"@Models": path.resolve(__dirname, "../src/Models"),
		"@Screens": path.resolve(__dirname, "../src/Client/Screens"),
		"@Systems": path.resolve(__dirname, "../src/Systems"),
		"@IO": path.resolve(__dirname, "../src/phaser.io.ts"),
		"@Constants": path.resolve(__dirname, "../src/Constants"),
		"@Utils": path.resolve(__dirname, "../src/Utils"),
		"@Components": path.resolve(__dirname, "../src/Client/Components"),
		"@Shaders": path.resolve(__dirname, "../src/Shaders"),
		"@i18n": path.resolve(__dirname, "../src/i18n")
	}
};

const sharedExternals = {
	"steamworks.js": "commonjs steamworks.js"
};

const sharedCopyPatterns = [
	{ from: "public/assets", to: "assets" },
	{ from: "public/favicon.png", to: "favicon.png" },
	{ from: "public/style.css", to: "style.css" }
];

const createSharedModuleRules = ({ transpileOnly = false } = {}) => [
	{
		test: /\.js$/,
		exclude: /node_modules/,
		use: {
			loader: "babel-loader"
		}
	},
	{
		test: /\.tsx?$/,
		exclude: /node_modules/,
		loader: "ts-loader",
		options: {
			configFile: path.resolve(__dirname, "../tsconfig.json"),
			...(transpileOnly
				? {
					transpileOnly: true,
					experimentalWatchApi: true
				}
				: {})
		}
	},
	{
		test: [/\.vert$/, /\.frag$/],
		use: "raw-loader"
	},
	{
		test: /\.(gif|png|jpe?g|svg|xml|glsl)$/i,
		use: "file-loader"
	}
];

const createSharedDefineValues = ({ webglDebug, experimental, logLevel } = {}) => ({
	"typeof CANVAS_RENDERER": JSON.stringify(true),
	"typeof WEBGL_RENDERER": JSON.stringify(true),
	"typeof WEBGL_DEBUG": JSON.stringify(webglDebug),
	"typeof EXPERIMENTAL": JSON.stringify(experimental),
	"typeof PLUGIN_3D": JSON.stringify(false),
	"typeof PLUGIN_CAMERA3D": JSON.stringify(false),
	"typeof PLUGIN_FBINSTANT": JSON.stringify(false),
	"typeof FEATURE_SOUND": JSON.stringify(true),
	"IS_DEMO_BUILD": JSON.stringify(process.env.IS_DEMO === "true"),
	...(logLevel ? { "process.env.LOG_LEVEL": JSON.stringify(logLevel) } : {}),
	"process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version || "dev"),
	"__DEV__": JSON.stringify(process.env.NODE_ENV !== "production")
});

module.exports = {
	sharedResolve,
	sharedExternals,
	sharedCopyPatterns,
	createSharedModuleRules,
	createSharedDefineValues
};