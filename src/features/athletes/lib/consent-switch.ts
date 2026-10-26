/**
 * Consent is switched off for now. With it off, registration has no consent step and asks for
 * nothing about consent, the profile has no consent tab or "Consent missing" badge, the roster
 * has no consent filter, and photos show as uploaded. Consents already recorded stay in the
 * database untouched. Set this to true to bring all of it back as it was.
 */
export const CONSENT_ENABLED = false;
