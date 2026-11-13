/**
 * Moving athletes between programmes goes through Transfer (the profile's Transfer button), which
 * records the move and keeps past money with the old programme. With this on, the athlete edit
 * page lists only the athlete's own programme's batches, and both other ways to move programmes
 * are refused: picking another programme's batch on the edit page, and changing the programme of
 * a batch that has athletes in Settings. Set it to false to hide Transfer and allow those again.
 */
export const TRANSFERS_ENABLED = true;
