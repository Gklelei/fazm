// import { db } from "@/lib/prisma";
// import fs from "node:fs";
// import path from "node:path";
// import papa from "papaparse";

// export interface AthleteProfile {
//   id: string;
//   first_name: string;
//   last_name: string;
//   middle_name: string | "";
//   dob: string;
//   gender: "Male" | "Female" | "Other";
//   status: "active" | "inactive";
//   avatar: string | "NULL";
//   phone: string;
//   email: string;
//   address_line1: string;
//   address_line2: string;
//   city: string;
//   state: string;
//   zip_code: string;
//   country_code: string;
//   corr_address_line1: string;
//   corr_address_line2: string;
//   corr_city: string;
//   corr_state: string;
//   corr_zip_code: string;
//   corr_country_code: string;
//   enrollment_no: string;
//   join_date: string;
//   jersey_number: string;
//   school_name: string;
//   school_grade: string;
//   height_cm: string;
//   weight_kg: string;
//   dominant_foot: "left" | "right" | "both";
//   dominant_hand: "left" | "right" | "both";
//   positions: string; // Represented as a stringified array '[]' in your data
//   bio: string | "NULL";
//   nationality: string;
//   blood_type: string;
//   allergies: string;
//   medical_notes: string;
//   emergency_contact_name: string;
//   emergency_contact_phone: string;
//   id_doc_type: string;
//   id_doc_number: string | "NULL";
//   id_doc_front: string | "NULL";
//   id_doc_back: string | "NULL";
//   passport_page: string | "NULL";
//   waiver_signed: "0" | "1";
//   photo_consent: "0" | "1";
//   declaration_full_name: string;
//   declaration_date_signed: string;
//   created_by: string | "NULL";
//   updated_by: string | "NULL";
//   createdAt: string;
//   updatedAt: string;
// }

// async function SeedAthleteDetails() {
//   try {
//     console.log("📂 Reading CSV file...");

//     const csvFilePath = path.join(__dirname, "./data.csv");
//     const csvData = fs.readFileSync(csvFilePath, "utf8");

//     const results = papa.parse(csvData, {
//       header: true,
//       skipEmptyLines: true,
//       transformHeader: (header) => header.trim(),
//       transform: (value) => value.trim(),
//     });

//     console.log(`📊 Found ${results.data.length} records`);

//     for (const row of results.data as AthleteProfile[]) {
//       try {
//         await db.athlete.upsert({
//           where: { email: row.email },
//           update: {},
//           create: {
//             athleteId: row.id,
//             dateOfBirth: row.dob,
//             email: row.email,
//             firstName: row.first_name,
//             lastName: row.last_name,
//             middleName: row.middle_name || "",
//             phoneNumber: `${row.country_code}${row.phone}`,
//             position: row.positions,
//             profilePIcture: row.avatar === "NULL" ? "" : row.avatar,
//             medical: {
//               create: {
//                 bloogGroup: row.blood_type || "Unknown",
//                 allergies: row.allergies ? [row.allergies] : [],
//                 medicalConditions: row.medical_notes ? [row.medical_notes] : [],
//               },
//             },
//             emergencyContacts: {
//               create: [
//                 {
//                   phoneNumber: row.emergency_contact_phone,
//                   name: row.emergency_contact_name,
//                   relationship: "parent",
//                 },
//               ],
//             },

//             address: {
//               create: {
//                 addressLine1: row.address_line1,
//                 addressLine2: row.address_line2,
//                 country: row.country_code === "KE" ? "Kenya" : row.country_code,
//                 subCounty: row.city,
//                 county: row.state,
//               },
//             },
//           },
//         });
//         console.log(`✅ Seeded: ${row.first_name} ${row.last_name}`);
//       } catch (error) {
//         console.error(`❌ Error seeding row ${row.id}:`, error);
//       }
//     }
//   } catch (error) {
//     return;
//   } finally {
//     await db.$disconnect();
//   }
// }

// SeedAthleteDetails();
