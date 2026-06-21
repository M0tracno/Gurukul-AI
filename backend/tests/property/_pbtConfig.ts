/**
 * Shared property-based testing configuration for the
 * secure-admin-user-management feature property tests.
 *
 * Allows tuning the number of fast-check iterations via the PBT_NUM_RUNS
 * environment variable so the suite can run faster locally and in CI.
 */
export const NUM_RUNS = Number(process.env.PBT_NUM_RUNS) || 25;
