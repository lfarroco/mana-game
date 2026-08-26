const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const {
    sharedResolve,
    sharedExternals,
    sharedCopyPatterns,
    createSharedModuleRules,
    createSharedDefineValues
} = require("./config.base.cjs");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

module.exports = {
    mode: "production",
    entry: "./src/main.ts",
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "./bundle.min.js"
    },
    resolve: sharedResolve,
    // Exclude steamworks.js from browser bundle (only needed in Electron)
    externals: sharedExternals,
    devtool: false,
    performance: {
        maxEntrypointSize: 2500000,
        maxAssetSize: 1200000
    },
    module: {
        rules: createSharedModuleRules()
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    output: {
                        comments: false
                    }
                }
            })
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new webpack.DefinePlugin(
            createSharedDefineValues({
                webglDebug: false,
                experimental: false,
                isProd: true
            })
        ),
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
        new CopyPlugin({
            patterns: sharedCopyPatterns,
        }),
    ]
};
