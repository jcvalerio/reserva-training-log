import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No client component may reach the database module.
 *
 * `src/db/index.ts` constructs a Neon client from `@/env` at module scope, so
 * anything importing a VALUE from a module that reaches it puts a database
 * connection in the browser's import graph. That is not hypothetical: the
 * session runner reached it through `progression-view → workout-repository`,
 * for one narrowing helper, and again through `session-finish → improvement`.
 * The build survived on Next's tree-shaking, which is a property of the
 * bundler rather than of this codebase.
 *
 * The usual guard is Next's `server-only` package. This is the same rule
 * without a dependency, and it fails in the suite everyone already runs.
 *
 * TYPE imports are erased, so they are not edges — which is what makes the
 * rule liveable: a client component may still name `SetLog`.
 */
const SRC = path.join(process.cwd(), "src");
const DB_MODULE = path.join(SRC, "db", "index.ts");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function resolveImport(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;

  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

/** Imports that survive compilation: `import type` and `type` specifiers do not. */
function valueImports(file: string): string[] {
  const source = fs.readFileSync(file, "utf8");
  const specs: string[] = [];

  for (const match of source.matchAll(/import\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']/g)) {
    const [, typeKeyword, clause, spec] = match;
    if (typeKeyword) continue;

    const named = clause!.match(/\{([\s\S]*)\}/);
    const hasDefaultOrNamespace = !clause!.trim().startsWith("{");
    if (named && !hasDefaultOrNamespace) {
      const everySpecifierIsAType = named[1]!
        .split(",")
        .map((specifier) => specifier.trim())
        .filter(Boolean)
        .every((specifier) => specifier.startsWith("type "));
      if (everySpecifierIsAType) continue;
    }
    specs.push(spec!);
  }

  for (const match of source.matchAll(/^import\s+["']([^"']+)["'];/gm)) specs.push(match[1]!);
  return specs;
}

/** The chain from `entry` to the database module, or null if there is none. */
function pathToDb(entry: string): string[] | null {
  const seen = new Set([entry]);
  const cameFrom = new Map<string, string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.shift()!;
    for (const spec of valueImports(file)) {
      const resolved = resolveImport(spec, file);
      if (!resolved || seen.has(resolved)) continue;
      seen.add(resolved);
      cameFrom.set(resolved, file);
      if (resolved === DB_MODULE) {
        const chain: string[] = [];
        let step: string | undefined = resolved;
        while (step) {
          chain.unshift(path.relative(SRC, step));
          step = cameFrom.get(step);
        }
        return chain;
      }
      queue.push(resolved);
    }
  }
  return null;
}

describe("the client/server import boundary", () => {
  const clientComponents = walk(SRC).filter((file) => /^["']use client["']/.test(fs.readFileSync(file, "utf8")));

  it("finds the client components to check", () => {
    // A guard on the guard: a regex that matched nothing would pass silently.
    expect(clientComponents.length).toBeGreaterThan(5);
  });

  it.each(clientComponents.map((file) => path.relative(SRC, file)))("%s does not reach @/db", (relative) => {
    const chain = pathToDb(path.join(SRC, relative));
    expect(chain?.join(" → ") ?? null).toBeNull();
  });
});
