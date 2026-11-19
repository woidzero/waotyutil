import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "dist");
const packageJson = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
);

if (typeof packageJson.loaderVersion !== "string" || packageJson.loaderVersion.length === 0)
    throw new Error("package.json must define a non-empty loader version.");

const loaderSource = await readFile(resolve(root, packageJson.entryPoints.loader), "utf8");
const userscriptHeader = `// ==UserScript==
// @name         ${packageJson.name}
// @namespace    woid.im
// @version      ${packageJson.loaderVersion}
// @description  ${packageJson.description}
// @author       ${packageJson.author}
// @match        https://*.albumoftheyear.org/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @homepageURL  ${packageJson.homepage}
// @updateURL    ${packageJson.updateUrl}
// @downloadURL  ${packageJson.downloadUrl}
// @icon         https://by.woid.im/waotyutil/favicon.ico
// @connect      *
// ==/UserScript==

`;

await mkdir(outputDirectory, { recursive: true });

const outputPath = resolve(outputDirectory, "waotyutil.user.js");
const temporaryOutput = `${outputPath}.${process.pid}.tmp`;

try {
    await writeFile(temporaryOutput, userscriptHeader + loaderSource);
    await rename(temporaryOutput, outputPath);
    console.log("✅ Loader updated.");
} finally {
    await rm(temporaryOutput, { force: true });
}
