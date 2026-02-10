import { Prisma, PrismaClient } from "@/generated/prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import papa from "papaparse";

interface AthleteSeedType {
  no: string;
  name: string;
  contacts: string;
  contact_name: string;
  dob: string;
  age: string;
  reg_date: string;
}

const BATCH_SIZE = 50;

const DEFAULT_DOB_ISO = "1970-01-01T00:00:00.000Z";

const toIsoDateOrNull = (dateStr?: string | null): string | null => {
  const raw = (dateStr ?? "").trim();
  if (!raw) return null;

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) return native.toISOString();

  // Handle common numeric formats (Excel/CSV exports) like 11/04/2018 or 11-04-2018.
  const dmyMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (dmyMatch) {
    const a = Number(dmyMatch[1]);
    const b = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += year < 30 ? 2000 : 1900;

    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      month = a;
      day = b;
    }

    const utc = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(utc.getTime())) return utc.toISOString();
  }

  const ymdMatch = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const utc = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(utc.getTime())) return utc.toISOString();
  }

  return null;
};

export async function AthleteSeed(prisma: PrismaClient) {
  console.log("Reading csv file");

  const rows = await new Promise<AthleteSeedType[]>((resolve, reject) => {
    const csvFilePath = path.join(__dirname, "data2.csv");

    if (!fs.existsSync(csvFilePath)) {
      reject(new Error(`CSV file not found at: ${csvFilePath}`));
      return;
    }

    const fileContent = fs.readFileSync(csvFilePath, "utf8");

    papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results.data as AthleteSeedType[]),
      error: (err: Error) => reject(err),
    });
  });

  console.log(`📊 Found ${rows.length} records. Preparing batches...`);

  const athletePromises = rows
    .map((row) => {
      const paddedNo = row.no.toString().padStart(3, "0");
      const dobIso = toIsoDateOrNull(row.dob);

      const internalId = `ATH-FFA-${paddedNo}`;
      const nameParts = row.name ? row.name.trim().split(/\s+/) : ["Unknown"];
      const firstName = nameParts[0];
      const lastName =
        nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const middleName =
        nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      return prisma.athlete.upsert({
        where: {
          athleteId: internalId,
        },
        create: {
          athleteId: internalId,
          dateOfBirth: dobIso ?? DEFAULT_DOB_ISO,
          firstName,
          lastName,
          middleName,
          email: undefined,
          foot: "",
          hand: "",
          height: "",
          weight: "",
          batchesId: "cmldhgcc20003ulj6hpwqmzd7",
          emergencyContacts: {
            create: {
              name: row.contact_name,
              phoneNumber: row.contacts,
              relationship: "guardian",
            },
          },
        },
        update: {
          ...(dobIso ? { dateOfBirth: dobIso } : {}),
          firstName,
          lastName,
          middleName,
        },
      });
    })
    .filter(Boolean) as Prisma.Prisma__AthleteClient<unknown, unknown>[];

  async function insertInBatches<T>(
    items: T[],
    batchSize: number,
    insertFunction: (batch: T[]) => Promise<void>,
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await insertFunction(batch);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  await insertInBatches(athletePromises, BATCH_SIZE, async (batch) => {
    const results = await Promise.all(batch);
    console.log(`✅ Seeded batch of ${results.length} athletes`);
  });
}
