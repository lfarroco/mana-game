const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    devtool: "eval-source-map",
    entry: "./src/main.ts",
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "bundle.min.js"
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
        // Use tsconfig paths plugin to make webpack resolution match TypeScript's
        plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "../tsconfig.json") })],
        alias: {
            "@Models": path.resolve(__dirname, "../src/Models"),
            "@Scenes": path.resolve(__dirname, "../src/Scenes"),
            "@Systems": path.resolve(__dirname, "../src/Systems"),
            "@UI": path.resolve(__dirname, "../src/UI"),
            "@PhaserIO": path.resolve(__dirname, "../src/phaser.io.ts"),
            "@Constants": path.resolve(__dirname, "../src/Constants"),
            "@Utils": path.resolve(__dirname, "../src/Utils"),
            "@Components": path.resolve(__dirname, "../src/Components"),
            "@Shaders": path.resolve(__dirname, "../src/Shaders")
        }
    },
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
                    // Ensure ts-loader uses the phaser project's tsconfig so
                    // path mappings (eg. @Constants/*) are resolved correctly
                    configFile: path.resolve(__dirname, "../tsconfig.json")
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
    plugins: [
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: [path.join(__dirname, "dist/**/*")]
        }),
        new webpack.DefinePlugin({
            "typeof CANVAS_RENDERER": JSON.stringify(true),
            "typeof WEBGL_RENDERER": JSON.stringify(true),
            "typeof WEBGL_DEBUG": JSON.stringify(true),
            "typeof EXPERIMENTAL": JSON.stringify(true),
            "typeof PLUGIN_3D": JSON.stringify(false),
            "typeof PLUGIN_CAMERA3D": JSON.stringify(false),
            "typeof PLUGIN_FBINSTANT": JSON.stringify(false),
            "typeof FEATURE_SOUND": JSON.stringify(true)
        }),
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
    ]
};
