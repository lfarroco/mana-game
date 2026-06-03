const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const {
    sharedResolve,
    sharedExternals,
    sharedCopyPatterns,
    createSharedModuleRules,
    createSharedDefineValues
} = require("./config.base.cjs");
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
    resolve: sharedResolve,
    externals: sharedExternals,
    devtool: "source-map",
    module: {
        rules: createSharedModuleRules({ transpileOnly: true })
    },
    optimization: {
        minimize: false
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin(
            createSharedDefineValues({
                webglDebug: true,
                experimental: true,
                logLevel: "debug"
            })
        ),
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
        new CopyPlugin({
            patterns: sharedCopyPatterns
        })
    ]
};
