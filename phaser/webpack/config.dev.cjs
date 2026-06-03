const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
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
    cache: {
        type: "filesystem",
        cacheDirectory: path.resolve(__dirname, "../.webpack-cache/dev"),
        buildDependencies: {
            config: [__filename],
            tsconfig: [path.resolve(__dirname, "../tsconfig.json")]
        }
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
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
    ]
};
