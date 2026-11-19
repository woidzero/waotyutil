import {
    mkdir,
    readFile,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { context, transform } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "dist");
const watching = process.argv.includes("--watch");

const packageJson = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
);

if (typeof packageJson.version !== "string" || packageJson.version.length === 0)
    throw new Error("package.json must define a non-empty version.");
if (typeof packageJson.loaderVersion !== "string" || packageJson.loaderVersion.length === 0)
    throw new Error("package.json must define a non-empty loader version.");


await mkdir(outputDirectory, { recursive: true });

const buildContext = await context({
    entryPoints: [resolve(root, packageJson.entryPoints.main)],
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2022",
    write: false,
    define: {
        VERSION: JSON.stringify(packageJson.version),
        LOADER_VERSION: JSON.stringify(packageJson.loaderVersion),
    },
    outfile: resolve(outputDirectory, "main.js"),
    plugins: [
        {
            name: "inline-css",
            setup(build) {
                build.onResolve({ filter: /\.css$/ }, async (args) => {
                    if (args.pluginData?.resolved) {
                        return;
                    }

                    const result = await build.resolve(args.path, {
                        resolveDir: args.resolveDir,
                        kind: args.kind,
                        pluginData: { resolved: true },
                    });

                    if (result.errors.length > 0) {
                        return { errors: result.errors };
                    }

                    return {
                        path: result.path,
                        namespace: "inline-css",
                        pluginData: { resolved: true },
                    };
                });

                build.onLoad(
                    { filter: /\.css$/, namespace: "inline-css" },
                    async (args) => {
                        const css = await readFile(args.path, "utf8");
                        const { code } = await transform(css, {
                            loader: "css",
                            minify: true,
                        });

                        return {
                            contents: `const style = document.createElement('style'); style.textContent = ${JSON.stringify(code)}; document.head.append(style);`,
                            loader: "js",
                            watchFiles: [args.path],
                        };
                    },
                );
            },
        },
        {
            name: "preserve-last-build",
            setup(build) {
                build.onEnd(async (result) => {
                    if (result.errors.length > 0) {
                        console.log("Build failed, previous version is saved.");
                        return;
                    }

                    const output = result.outputFiles?.[0];
                    if (!output) {
                        throw new Error(
                            "✅ Build completed without producing an output file.",
                        );
                    }

                    const temporaryOutput = `${output.path}.${process.pid}.tmp`;
                    try {
                        await writeFile(temporaryOutput, output.contents);
                        await rename(temporaryOutput, output.path);
                        console.log("✅ Build updated.");
                    } catch (err) {
                        console.error("❌ Error building:", err);
                    } finally {
                        await rm(temporaryOutput, { force: true });
                    }
                });
            },
        },
    ],
});

if (watching) {
    await buildContext.watch();
    console.log("⌚ Watching source and styles for changes...");
} else {
    await buildContext.rebuild();
    await buildContext.dispose();
}
