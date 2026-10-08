import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CATALOGUE_IMAGE_ASSETS } from "../src/catalogue/image-assets.ts";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const photographyDirectory = fileURLToPath(new URL("../public/catalogue/photography/", import.meta.url));
const editorialPath = "/catalogue/photography/maison-vale-editorial-hero.webp";
const expectedUrls = [...CATALOGUE_IMAGE_ASSETS.map((asset) => asset.url), editorialPath];

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

verify(new Set(expectedUrls).size === 25, "The deployment manifest must reference exactly 25 unique image assets.");

const actualFiles = (await readdir(photographyDirectory))
  .filter((name) => name.endsWith(".webp"))
  .sort();
const expectedFiles = expectedUrls.map((url) => url.split("/").at(-1)).sort();
verify(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), "The deployed photography directory and reviewed asset manifest do not match.");

for (const url of expectedUrls) {
  const path = `${projectRoot}public${url.replaceAll("/", "\\")}`;
  const details = await stat(path);
  verify(details.isFile() && details.size > 20_000, `The reviewed asset ${url} is missing or unexpectedly small.`);
  const header = await readFile(path).then((buffer) => buffer.subarray(0, 12));
  verify(header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP", `The reviewed asset ${url} is not a valid WebP file.`);
}

console.log("Deployment asset verification passed: 24 catalogue photographs and 1 editorial image are present, unique, and valid WebP files.");
