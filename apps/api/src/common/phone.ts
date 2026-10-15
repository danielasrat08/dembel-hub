/**
 * Normalises Ethiopian mobile numbers to +2519XXXXXXXX / +2517XXXXXXXX.
 * Accepts 0911223344, 911223344, 251911223344, +251 91 122 3344.
 * Returns null when the input is not a valid Ethiopian mobile number.
 */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/[^\d]/g, '');
  let local: string | null = null;
  if (/^0[79]\d{8}$/.test(d)) local = d.slice(1);
  else if (/^[79]\d{8}$/.test(d)) local = d;
  else if (/^251[79]\d{8}$/.test(d)) local = d.slice(3);
  return local ? `+251${local}` : null;
}
