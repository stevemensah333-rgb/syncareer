#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFileSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const lovableGeneratedPath = resolve(
  repositoryRoot,
  "src/integrations/supabase/types.ts",
);
const applicationPath = resolve(
  repositoryRoot,
  "artifacts/syncareer/src/integrations/supabase/types.ts",
);

function displayPath(path) {
  return relative(repositoryRoot, path);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function assertLooksGenerated(content, path) {
  if (!content.includes("export type Database = {") || !content.includes("__InternalSupabase")) {
    throw new Error(`${displayPath(path)} does not look like generated Supabase types`);
  }
}

function parseSchemaObjects(content) {
  const sections = new Map();
  const lines = content.split(/\r?\n/);
  let section;

  for (let index = 0; index < lines.length; index += 1) {
    const sectionMatch = lines[index].match(
      /^    (Tables|Views|Functions|Enums|CompositeTypes): \{/,
    );
    if (sectionMatch) {
      section = sectionMatch[1];
      sections.set(section, new Map());
      continue;
    }

    if (!section) continue;
    if (/^    \}/.test(lines[index])) {
      section = undefined;
      continue;
    }

    const objectMatch = lines[index].match(
      /^      ([A-Za-z_][A-Za-z0-9_]*): (.*)$/,
    );
    if (!objectMatch) continue;

    const start = index;
    let braceBalance =
      (lines[index].match(/\{/g)?.length ?? 0) -
      (lines[index].match(/\}/g)?.length ?? 0);

    while (braceBalance > 0 && index + 1 < lines.length) {
      index += 1;
      braceBalance +=
        (lines[index].match(/\{/g)?.length ?? 0) -
        (lines[index].match(/\}/g)?.length ?? 0);
    }

    sections
      .get(section)
      .set(
        objectMatch[1],
        lines
          .slice(start, index + 1)
          .map((line) => line.trim())
          .join("\n"),
      );
  }

  return sections;
}

function describeDrift(source, application) {
  const sourceSections = parseSchemaObjects(source);
  const applicationSections = parseSchemaObjects(application);
  const lines = [];

  for (const section of [
    "Tables",
    "Views",
    "Functions",
    "Enums",
    "CompositeTypes",
  ]) {
    const sourceObjects = sourceSections.get(section) ?? new Map();
    const applicationObjects = applicationSections.get(section) ?? new Map();
    const sourceOnly = [...sourceObjects.keys()]
      .filter((name) => !applicationObjects.has(name))
      .sort();
    const applicationOnly = [...applicationObjects.keys()]
      .filter((name) => !sourceObjects.has(name))
      .sort();
    const changed = [...sourceObjects.keys()]
      .filter(
        (name) =>
          applicationObjects.has(name) &&
          sourceObjects.get(name) !== applicationObjects.get(name),
      )
      .sort();

    if (sourceOnly.length > 0) {
      lines.push(`  ${section} only in Lovable-generated source: ${sourceOnly.join(", ")}`);
    }
    if (applicationOnly.length > 0) {
      lines.push(`  ${section} only in application copy: ${applicationOnly.join(", ")}`);
    }
    if (changed.length > 0) {
      lines.push(`  ${section} with different definitions: ${changed.join(", ")}`);
    }
  }

  return lines;
}

function readTypes() {
  const source = readFileSync(lovableGeneratedPath);
  const application = readFileSync(applicationPath);
  assertLooksGenerated(source.toString("utf8"), lovableGeneratedPath);
  assertLooksGenerated(application.toString("utf8"), applicationPath);
  return { source, application };
}

function check() {
  const { source, application } = readTypes();
  const sourceHash = sha256(source);
  const applicationHash = sha256(application);

  console.log(`${displayPath(lovableGeneratedPath)}  ${sourceHash}`);
  console.log(`${displayPath(applicationPath)}  ${applicationHash}`);

  if (source.equals(application)) {
    console.log("Generated Supabase type copies are byte-for-byte synchronized.");
    return;
  }

  console.error("Generated Supabase type copies are NOT synchronized.");
  for (const line of describeDrift(
    source.toString("utf8"),
    application.toString("utf8"),
  )) {
    console.error(line);
  }
  console.error(
    "Regenerate through Lovable first; then run `pnpm schema:types:sync --confirm-lovable-regenerated`.",
  );
  process.exitCode = 1;
}

function sync() {
  if (!process.argv.includes("--confirm-lovable-regenerated")) {
    throw new Error(
      "Refusing to copy without --confirm-lovable-regenerated. This command synchronizes a Lovable-generated artifact; it does not generate types.",
    );
  }

  const source = readFileSync(lovableGeneratedPath);
  assertLooksGenerated(source.toString("utf8"), lovableGeneratedPath);
  copyFileSync(lovableGeneratedPath, applicationPath);
  console.log(
    `Copied ${displayPath(lovableGeneratedPath)} to ${displayPath(applicationPath)} (${sha256(source)}).`,
  );
  console.log("Run typecheck, tests, and the production build before committing.");
}

const command = process.argv[2] ?? "check";

try {
  if (command === "check") {
    check();
  } else if (command === "sync") {
    sync();
  } else {
    throw new Error(`Unknown command: ${command}. Use check or sync.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
