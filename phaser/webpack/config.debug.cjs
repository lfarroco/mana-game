const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const webpack = require("webpack");

module.exports = {
    mode: "development",
    entry: "./src/main.ts",
    cache: {
        type: "filesystem",
        cacheDirectory: path.resolve(__dirname, "../.webpack-cache/debug"),
        buildDependencies: {
            config: [__filename],
            tsconfig: [path.resolve(__dirname, "../tsconfig.json")]
        }
    },
    output: {
        path: path.resolve(process.cwd(), "dist"),
        filename: "./bundle.debug.js"
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
        // Keep webpack path resolution aligned with TypeScript path aliases.
        plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "../tsconfig.json") })],
        alias: {
            "@Models": path.resolve(__dirname, "../src/Models"),
            "@Screens": path.resolve(__dirname, "../src/Client/Screens"),
            "@Systems": path.resolve(__dirname, "../src/Systems"),
            "@PhaserIO": path.resolve(__dirname, "../src/phaser.io.ts"),
            "@Constants": path.resolve(__dirname, "../src/Constants"),
            "@Utils": path.resolve(__dirname, "../src/Utils"),
            "@Components": path.resolve(__dirname, "../src/Client/Components"),
            "@Shaders": path.resolve(__dirname, "../src/Shaders"),
            "@i18n": path.resolve(__dirname, "../src/i18n")
        }
    },
    externals: {
        "steamworks.js": "commonjs steamworks.js"
    },
    devtool: "source-map",
    module: {
        rules: [
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
                    // Keep debug rebuilds responsive while type checks run in dedicated scripts.
                    transpileOnly: true,
                    experimentalWatchApi: true
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
        ]
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            "typeof CANVAS_RENDERER": JSON.stringify(true),
            "typeof WEBGL_RENDERER": JSON.stringify(true),
            "typeof WEBGL_DEBUG": JSON.stringify(true),
            "typeof EXPERIMENTAL": JSON.stringify(true),
            "typeof PLUGIN_3D": JSON.stringify(false),
            "typeof PLUGIN_CAMERA3D": JSON.stringify(false),
            "typeof PLUGIN_FBINSTANT": JSON.stringify(false),
            "typeof FEATURE_SOUND": JSON.stringify(true),
            "IS_DEMO_BUILD": JSON.stringify(process.env.IS_DEMO === "true"),
            "process.env.LOG_LEVEL": JSON.stringify("debug"),
            "process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version || "dev")
        }),
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
        new CopyPlugin({
            patterns: [
                { from: "public/assets", to: "assets" },
                { from: "public/favicon.png", to: "favicon.png" },
                { from: "public/style.css", to: "style.css" }
            ]
        })
    ]
};
