import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetDb, signedIn } from "@/tests/support/db";
import { signOut } from "@/tests/support/session";
import { UPLOAD_ROOT } from "@/lib/uploads";
import { GET } from "@/app/uploads/[dir]/[file]/route";

const FILE = "access-test-0000.png";
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const get = (dir: string) => GET(new NextRequest(`http://test/uploads/${dir}/${FILE}`), { params: Promise.resolve({ dir, file: FILE }) });

describe("opening uploaded files", () => {
  beforeAll(async () => {
    for (const dir of ["PASSPORTS", "PROFILE"]) {
      await mkdir(path.join(UPLOAD_ROOT, dir), { recursive: true });
      await writeFile(path.join(UPLOAD_ROOT, dir, FILE), PNG);
    }
  });
  afterAll(async () => {
    for (const dir of ["PASSPORTS", "PROFILE"]) await rm(path.join(UPLOAD_ROOT, dir, FILE), { force: true });
  });
  beforeEach(resetDb);

  it("lets athlete-profile roles open athlete documents", async () => {
    for (const role of ["ADMIN", "COACH", "DOCTOR"] as const) {
      await signedIn(role);
      expect((await get("PASSPORTS")).status).toBe(200);
    }
  });

  it("hides athlete documents from finance staff, but not photos", async () => {
    await signedIn("FINANCE");
    expect((await get("PASSPORTS")).status).toBe(404);
    expect((await get("PROFILE")).status).toBe(200);
  });

  it("hides everything when signed out", async () => {
    signOut();
    expect((await get("PROFILE")).status).toBe(404);
  });
});
