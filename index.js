/**
 * Host half of the account-usage bundle. The feature is browser-local: the
 * Client module owns the composer ring and reads the balance through the
 * existing account Remote, so this half only keeps the bundle's Loader row
 * alive.
 */
export function apply() {}
