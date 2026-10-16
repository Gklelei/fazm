import "server-only";
import { randomInt } from "node:crypto";

// No 0/O, 1/I/L: it's read out or typed from a phone screen
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const chunk = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** A one-time password like "Fazam-K7QM-3XPD", replaced by the person at first sign-in. */
export const tempPassword = () => `Fazam-${chunk()}-${chunk()}`;
