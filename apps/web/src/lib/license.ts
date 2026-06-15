/**
 * Generate a license key in format: RCTN-XXXX-XXXX-XXXX
 * Uses uppercase alphanumeric characters without lookalikes.
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  const segment = () => {
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  };
  return `RCTN-${segment()}-${segment()}-${segment()}`;
}
