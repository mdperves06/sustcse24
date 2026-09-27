import "server-only";
import bcrypt from "bcryptjs";

// Configurable so tests can run fast; production should keep the default of 12.
const BCRYPT_COST = Math.max(4, Number(process.env.BCRYPT_ROUNDS ?? 12));

/** Computed once; used to keep login timing constant when the account doesn't exist. */
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash("timing-equaliser-not-a-real-password", BCRYPT_COST);
  return dummyHash;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, await getDummyHash());
    return false;
  }
  return bcrypt.compare(plain, hash);
}

/** The initial password for every imported account is the student's roll. */
export function isDefaultPassword(plain: string, roll: string): boolean {
  return plain === roll;
}
