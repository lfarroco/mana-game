import { defineConfig } from "tsup";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist",
    clean: true,
    target: "node22",
    // Resolve @game/* → ../core/src/* at bundle time.
    // Core source is inlined; npm deps (express, uuid) stay external.
    esbuildPlugins: [
      {
        name: "game-alias",
        setup(build) {
          // Redirect @game/* imports to the core source directory.
          // Append .ts extension so esbuild picks up the file.
          build.onResolve({ filter: /^@game\// }, (args) => {
            return {
              path: path.resolve(
                __dirname,
                "..",
                "core",
                "src",
                args.path.slice(6) + ".ts",
              ),
            };
          });
        },
      },
    ],
  },
  {
    // Firebase Functions bundle: CommonJS (.cjs) so the functions framework
    // can require() it regardless of the package's ESM type. Core source is
    // inlined the same way; npm deps (express, firebase-functions) stay
    // external and are installed from server/package.json during deploy.
    entry: ["src/functions.ts"],
    format: ["cjs"],
    outDir: "dist",
    outExtension: () => ({ js: ".cjs" }),
    target: "node22",
    esbuildPlugins: [
      {
        name: "game-alias",
        setup(build) {
          build.onResolve({ filter: /^@game\// }, (args) => {
            return {
              path: path.resolve(
                __dirname,
                "..",
                "core",
                "src",
                args.path.slice(6) + ".ts",
              ),
            };
          });
        },
      },
    ],
  },
]);
