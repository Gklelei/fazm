import { Prisma, PrismaClient } from "@/generated/prisma/client";
import fs from "node:fs";
import path from "node:path";
import papa from "papaparse";

interface AthleteCSVRow {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  status: string;
  avatar: string | "NULL";
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country_code: string;
  blood_type: string;
  allergies: string;
  medical_notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dominant_foot: "left" | "right" | "both";
  dominant_hand: "left" | "right" | "both";
  height_cm: string;
  weight_kg: string;
  positions: string;
}

const BATCH_SIZE = 50;

const getAthleteID = (id: string) => {
  if (!id) return "ATH-FFA-000";
  const idNumerical = id.replace(/\D/g, "");
  const num = parseInt(idNumerical, 10);
  const constrainedNum = Math.min(Math.max(num, 1), 500);
  return `ATH-FFA-${constrainedNum.toString().padStart(3, "0")}`;
};

const parseDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

const clean = (val: string) => (val === "NULL" || !val ? "" : val.trim());

export async function seedAthletes(prisma: PrismaClient) {
  console.log("📂 Reading CSV file...");

  const rows = await new Promise<AthleteCSVRow[]>((resolve, reject) => {
    const csvFilePath = path.join(__dirname, "data.csv");

    if (!fs.existsSync(csvFilePath)) {
      reject(new Error(`CSV file not found at: ${csvFilePath}`));
      return;
    }

    const fileContent = fs.readFileSync(csvFilePath, "utf8");

    papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => resolve(results.data as AthleteCSVRow[]),
      error: (err: Error) => reject(err),
    });
  });

  console.log(`📊 Found ${rows.length} records. Preparing batches...`);

  const athletePromises = rows
    .map((row) => {
      const internalId = getAthleteID(row.id);
      const emailClean = row.email?.toLowerCase().trim();

      if (!emailClean) return null;

      return prisma.athlete.upsert({
        where: { id: internalId },
        update: {
          firstName: row.first_name,
          lastName: row.last_name,
          phoneNumber: row.phone,
          status: "PENDING",
        },
        create: {
          athleteId: internalId,
          email: undefined,
          firstName: row.first_name,
          lastName: row.last_name,
          middleName: clean(row.middle_name),
          dateOfBirth: String(parseDate(row.dob)),
          foot: row.dominant_foot,
          hand: row.dominant_hand,
          height: row.height_cm,
          weight: row.weight_kg,
          phoneNumber: row.phone,
          status: "PENDING",
          isArchived: false,
          profilePIcture: clean(row.avatar),
          batchesId: "cmle0egdq0003yjy1t5dah3q2",

          address: {
            create: {
              addressLine1: row.address_line1,
              addressLine2: clean(row.address_line2),
              country: row.country_code === "KE" ? "KENYA" : row.country_code,
              town: "",
              estate: "",
            },
          },

          medical: {
            create: {
              bloogGroup: clean(row.blood_type) || "Unknown",
              allergies: [],
              medicalConditions: [],
            },
          },

          emergencyContacts: {
            create: [
              {
                name: row.emergency_contact_name,
                phoneNumber: row.emergency_contact_phone,
                relationship: "Guardian",
              },
            ],
          },
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
