const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const {
    sharedResolve,
    sharedExternals,
    createSharedModuleRules,
    createSharedDefineValues
} = require("./config.base.cjs");

module.exports = {
    mode: "development",
    devtool: "eval-source-map",
    entry: "./src/main.ts",
    // In-memory cache: the dev server rebuilds from source on every start, so an
    // edit can never be served from a stale on-disk snapshot. (The filesystem
    // cache previously survived across runs and served outdated modules when
    // the watcher missed a change — the source on screen was not the source
    // running in the browser.)
    cache: {
        type: "memory"
    },
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "bundle.min.js"
    },
    resolve: sharedResolve,
    // Exclude steamworks.js from browser bundle (only needed in Electron)
    externals: sharedExternals,
    module: {
        rules: createSharedModuleRules({ transpileOnly: true })
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist/**/*")]
        }),
        new webpack.DefinePlugin(
            createSharedDefineValues({
                webglDebug: true,
                experimental: true
            })
        ),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.resolve(__dirname, "../tsconfig.json"),
                diagnosticOptions: {
                    semantic: true,
                    syntactic: true
                },
                mode: "write-references"
            }
        }),
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
    ]
};
