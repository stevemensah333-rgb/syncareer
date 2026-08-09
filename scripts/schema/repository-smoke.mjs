#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "../..");
const migrationsDirectory = resolve(root, "supabase/migrations");
const migrationNames = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const migrations = migrationNames.map((name) => ({
  name,
  sql: readFileSync(resolve(migrationsDirectory, name), "utf8"),
}));
const allSql = migrations.map(({ sql }) => sql).join("\n");
const failures = [];
const warnings = [];

function uniqueMatches(text, expression, group = 1) {
  return [
    ...new Set([...text.matchAll(expression)].map((match) => match[group])),
  ].sort();
}

const duplicatePrefixes = migrationNames
  .map((name) => name.match(/^(\d{14})/)?.[1])
  .filter((prefix, index, prefixes) => prefix && prefixes.indexOf(prefix) !== index);
if (duplicatePrefixes.length > 0) {
  failures.push(`Duplicate migration timestamp prefixes: ${[...new Set(duplicatePrefixes)].join(", ")}`);
}

const createdPublicTables = uniqueMatches(
  allSql,
  /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_][a-z0-9_]*)/gi,
);
for (const table of createdPublicTables) {
  const enablesRls = new RegExp(
    `\\bALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  ).test(allSql);
  if (!enablesRls) {
    failures.push(`Tracked CREATE TABLE public.${table} has no tracked ENABLE ROW LEVEL SECURITY.`);
  }
}

const functionDefinitions = [
  ...allSql.matchAll(
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-z_][a-z0-9_]*)[\s\S]*?AS\s+\$\$[\s\S]*?\$\$\s*;/gi,
  ),
].map((match) => ({ name: match[1], sql: match[0] }));
const securityDefinerFunctions = [
  ...new Set(
    functionDefinitions
      .filter(({ sql }) => /SECURITY\s+DEFINER/i.test(sql))
      .map(({ name }) => name),
  ),
].sort();
for (const functionName of securityDefinerFunctions) {
  const definition =
    functionDefinitions.find(({ name }) => name === functionName)?.sql ?? "";
  const hasSearchPath = /SET\s+search_path\s*=/i.test(definition);
  const laterSearchPath = new RegExp(
    `ALTER\\s+FUNCTION\\s+public\\.${functionName}\\s*\\([^;]*\\)\\s+SET\\s+search_path\\s*=`,
    "i",
  ).test(allSql);
  if (!hasSearchPath && !laterSearchPath) {
    failures.push(`SECURITY DEFINER function public.${functionName} has no tracked fixed search_path.`);
  }

  const hasRevoke = new RegExp(
    `REVOKE[^;]*FUNCTION\\s+public\\.${functionName}\\s*\\([^;]*\\)[^;]*FROM[^;]*(?:PUBLIC|anon|authenticated)`,
    "i",
  ).test(allSql);
  if (!hasRevoke) {
    failures.push(`SECURITY DEFINER function public.${functionName} has no tracked EXECUTE revoke.`);
  }
}

const generatedTypes = readFileSync(
  resolve(root, "src/integrations/supabase/types.ts"),
  "utf8",
);
const generatedTablesSection = generatedTypes.match(
  /    Tables: \{([\s\S]*?)\n    \}\n    Views:/,
)?.[1];
const generatedTables = generatedTablesSection
  ? uniqueMatches(generatedTablesSection, /^      ([a-z_][a-z0-9_]*): \{/gm)
  : [];
const tablesWithoutCurrentCreate = generatedTables.filter(
  (name) => !createdPublicTables.includes(name),
);

const nestedMigrationDirectory = resolve(
  root,
  "artifacts/syncareer/supabase/migrations",
);
const nestedMigrations = readdirSync(nestedMigrationDirectory).filter((name) =>
  name.endsWith(".sql"),
);
if (nestedMigrations.length > 0) {
  warnings.push(
    `${nestedMigrations.length} migration(s) exist outside the root Lovable migration directory: ${nestedMigrations.join(", ")}`,
  );
}

warnings.push(
  `${tablesWithoutCurrentCreate.length} table(s) in the root generated types have no CREATE TABLE in the active root migration directory. The active directory is not a baseline.`,
);

console.log(`Active root migrations: ${migrationNames.length}`);
console.log(`Public tables created by active root migrations: ${createdPublicTables.join(", ")}`);
console.log(
  `SECURITY DEFINER functions statically checked: ${securityDefinerFunctions.join(", ") || "none"}`,
);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Static migration RLS/SECURITY DEFINER checks passed.");
}
