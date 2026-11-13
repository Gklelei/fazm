/**
 * Moving athletes between programmes goes through Transfer. Until Transfer ships, staff still
 * sort athletes the old ways, so this stays false: the athlete edit page may pick a batch in any
 * programme, and a batch with athletes may change programme in Settings. Set it to true together
 * with Transfer: the edit page then lists only the athlete's own programme's batches, and both
 * cross-programme moves are refused.
 */
export const TRANSFERS_ENABLED = false;
