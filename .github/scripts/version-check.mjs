#!/usr/bin/env node
// Release-train consistency check:
//   package.json.version === CHANGELOG.md newest section === README badges
// Exits 1 with a fix list on any mismatch.
import { readFileSync, existsSync } from "node:fs";

const fail = [];
// Inside a monorepo package (e.g. plugins/packages/<name>) the host repo has
// no .github/scripts — skip the check in that layout.
if (!existsSync(".github/scripts/version-check.mjs")) {
  console.log("version-check: skipped (single-package layout)");
  process.exit(0);
}
const read = (f) => {
  try {
    return readFileSync(f, "utf8");
  } catch {
    fail.push(`missing file: ${f}`);
    return "";
  }
};

const pkg = JSON.parse(read("package.json"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) fail.push(`package.json version "${version}" is not x.y.z`);

const cl = read("CHANGELOG.md");
const m = cl.match(/^## \[(.+?)\]/m);
const clVersion = m && m[1];
if (!clVersion) fail.push("CHANGELOG.md has no `## [x.y.z]` section");
else if (clVersion !== version) fail.push(`CHANGELOG newest section is [${clVersion}], package.json is ${version}`);

for (const f of ["README.md", "README.zh-CN.md", "README.ja.md"]) {
  if (!existsSync(f)) fail.push(`missing file: ${f}`);
}

// The bottom-of-README metadata tables (Version / 版本 / バージョン rows) carry
// the release train too; a badge-only bump leaves them stale (the 0.0.3 miss).
const tableRow = /^\|\s*\*\*(?:Version\*\*|版本\*\*|バージョン\*\*)\s*\|\s*([0-9a-zA-Z.-]+)\s*\|/m;
for (const f of ["README.md", "README.zh-CN.md", "README.ja.md"]) {
  const s = existsSync(f) ? read(f) : "";
  const row = s.match(tableRow);
  if (!row) fail.push(`${f} has no Version/版本/バージョン metadata-table row`);
  else if (row[1] !== version) fail.push(`${f} metadata table says ${row[1]}, package.json is ${version}`);
}

// publish guards
const pkgFiles = pkg.files ?? [];
for (const f of ["README.md", "README.zh-CN.md", "README.ja.md", "LICENSE", "index.mjs"]) {
  if (!pkgFiles.includes(f)) fail.push(`package.json files[] is missing ${f}`);
}

if (fail.length) {
  console.error("Version consistency check failed:");
  for (const f of fail) console.error(` - ${f}`);
  console.error("\nFix: bump package.json and CHANGELOG.md together.");
  process.exit(1);
}
console.log(`version ${version}: package.json = CHANGELOG ✓`);
