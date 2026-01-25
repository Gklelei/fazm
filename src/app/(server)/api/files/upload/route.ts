import * as fs from "fs/promises";
import { NextRequest } from "next/server";
import * as path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const file = formData.get("file") as File;
}
