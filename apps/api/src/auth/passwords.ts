import { randomInt } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

// No 0/O, 1/l/I — easy to read aloud and type on a phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const hashPassword = (pw: string) => hash(pw);

export async function verifyPassword(hashStr: string | null, pw: string): Promise<boolean> {
  if (!hashStr) return false;
  try {
    return await verify(hashStr, pw);
  } catch {
    return false;
  }
}

/** Returns a reason the password is not acceptable, or null if it is fine. */
export function passwordProblem(pw: string, staffCode: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 128) return 'Use at most 128 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use both letters and numbers.';
  if (pw.toUpperCase().includes(staffCode.toUpperCase())) return 'Do not use your staff ID in the password.';
  return null;
}
