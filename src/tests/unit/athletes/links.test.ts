import { expect, it } from "vitest";
import { athleteEditPath, athleteFileName, athletePath, athletePdfPath, athleteSlug } from "@/features/athletes/lib/athlete-links";

it("puts per-programme IDs in links with dashes for slashes", () => {
  expect(athleteSlug("ATH/FFA/M/501")).toBe("ATH-FFA-M-501");
  expect(athletePath("ATH/FFA/G/001")).toBe("/players/user-profile/ATH-FFA-G-001");
  expect(athleteEditPath("ATH/FFA/G/001")).toBe("/players/edit/ATH-FFA-G-001");
  expect(athletePdfPath("ATH/FFA/M/7", "statement")).toBe("/api/athlete/ATH-FFA-M-7/statement");
  expect(athleteFileName("statement", "ATH/FFA/M/501")).toBe("statement-ATH-FFA-M-501.pdf");
});

it("leaves today's IDs as they are", () => {
  expect(athletePath("ATH-FFA-501")).toBe("/players/user-profile/ATH-FFA-501");
});
