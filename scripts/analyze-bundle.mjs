import fs from "node:fs";
import path from "node:path";

const statsPath = path.resolve(import.meta.dirname, "../artifacts/syncareer/dist/public/stats.html");
const html = fs.readFileSync(statsPath, "utf8");
const start = html.indexOf("const data = ");
const end = html.indexOf(";\n\n    const run");
const data = JSON.parse(html.slice(start + "const data = ".length, end));

function pkgOf(id) {
  id = id.replace(/^\0+/, "");
  // Use LAST node_modules occurrence to skip .pnpm middle segment.
  const nmIdx = id.lastIndexOf("node_modules/");
  if (nmIdx >= 0) {
    const rest = id.slice(nmIdx + "node_modules/".length);
    if (rest.startsWith("@")) {
      const parts = rest.split("/");
      return parts.slice(0, 2).join("/");
    }
    return rest.split("/")[0];
  }
  const srcMarker = "/artifacts/syncareer/src/";
  if (id.includes(srcMarker)) {
    const after = id.split(srcMarker)[1] || "";
    const parts = after.split("/");
    return "src/" + parts.slice(0, 2).join("/");
  }
  if (id.startsWith("vite/") || id.includes("vite/")) {
    return "(vite)";
  }
  return "(other)";
}

const perChunk = {};
const totalPerPkg = {};

for (const meta of Object.values(data.nodeMetas)) {
  const pkg = pkgOf(meta.id);
  for (const [chunk, partUid] of Object.entries(meta.moduleParts || {})) {
    const part = data.nodeParts[partUid];
    if (!part) continue;
    if (!perChunk[chunk]) perChunk[chunk] = {};
    perChunk[chunk][pkg] = (perChunk[chunk][pkg] || 0) + (part.renderedLength || 0);
    totalPerPkg[pkg] = (totalPerPkg[pkg] || 0) + (part.renderedLength || 0);
  }
}

const chunkTotals = Object.entries(perChunk)
  .map(([c, pkgs]) => [c, Object.values(pkgs).reduce((a, b) => a + b, 0), pkgs])
  .sort((a, b) => b[1] - a[1]);

console.log("=== Largest chunks (rendered size) ===");
chunkTotals.slice(0, 15).forEach(([c, total, pkgs]) => {
  console.log(`\n--- ${c}: ${(total / 1024).toFixed(1)} kB ---`);
  Object.entries(pkgs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([p, s]) => console.log(`   ${(s / 1024).toFixed(1)} kB  ${p}`));
});

console.log("\n=== Top packages across all chunks (rendered) ===");
Object.entries(totalPerPkg)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 35)
  .forEach(([p, s]) => console.log(`${(s / 1024).toFixed(1)} kB  ${p}`));
