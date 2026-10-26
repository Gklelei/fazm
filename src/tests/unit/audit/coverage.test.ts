import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Every server action, and every API route that changes data, must write an
// activity log entry: directly with createAuditLog() or through a helper in
// the same file that does. Read-only exports are listed here with the reason.
const READ_ONLY: Record<string, string> = {
  "src/features/coupons/actions/redeem.ts#checkCouponForAthlete": "says whether a coupon fits an athlete, changing nothing",
  "src/features/coupons/actions/redeem.ts#checkCouponForInvoice": "says how much a coupon takes off an invoice, changing nothing",
  "src/features/settings/actions/batches.ts#previewBatchSessions": "shows what Plan sessions would create; changes nothing",
  "src/app/(server)/api/auth/[...all]/route.ts#POST": "better-auth; sign-in, sign-out and password changes are logged by its hooks in src/lib/auth.ts",
};

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

/** Exported functions of a file that never reach createAuditLog. */
function unlogged(file: string, only?: Set<string>) {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const bodies = new Map<string, ts.Node>();
  const exported = new Set<string>();
  for (const st of src.statements) {
    const isExport = !!ts.getModifiers(st as ts.HasModifiers)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isFunctionDeclaration(st) && st.body) {
      const name = st.name?.text ?? "default";
      bodies.set(name, st.body);
      if (isExport) exported.add(name);
    }
    // export default someAction;
    if (ts.isExportAssignment(st) && ts.isIdentifier(st.expression)) exported.add(st.expression.text);
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
          bodies.set(d.name.text, d.initializer);
          if (isExport) exported.add(d.name.text);
        }
      }
    }
  }
  // Names each body calls
  const calls = new Map<string, Set<string>>();
  for (const [name, body] of bodies) {
    const seen = new Set<string>();
    const walk = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) seen.add(n.expression.text);
      ts.forEachChild(n, walk);
    };
    walk(body);
    calls.set(name, seen);
  }
  const logs = (name: string, path = new Set<string>()): boolean => {
    if (path.has(name)) return false;
    path.add(name);
    const c = calls.get(name) ?? new Set();
    return c.has("createAuditLog") || [...c].some((n) => bodies.has(n) && logs(n, path));
  };
  return [...exported].filter((n) => (!only || only.has(n)) && !logs(n) && !READ_ONLY[`${file}#${n}`]);
}

describe("activity log coverage", () => {
  const all = files("src");
  const actions = all.filter((f) => /^\s*["']use server["']/.test(readFileSync(f, "utf8")));
  const routes = all.filter((f) => /route\.tsx?$/.test(f) && f.startsWith("src/app"));

  it.each(actions)("every action in %s is logged", (file) => {
    expect(unlogged(file)).toEqual([]);
  });

  it.each(routes)("every data-changing handler in %s is logged", (file) => {
    expect(unlogged(file, new Set(["POST", "PUT", "PATCH", "DELETE"]))).toEqual([]);
  });

  it("knows the read-only exceptions still exist", () => {
    for (const key of Object.keys(READ_ONLY)) {
      const [file, name] = key.split("#");
      expect(readFileSync(file, "utf8")).toContain(name);
    }
  });
});
