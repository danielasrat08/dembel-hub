/** Simple in-memory limiter for failed sign-ins: 5 failures per 15 minutes per key. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, number[]>();

function recent(key: string, now: number) {
  const list = (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(key, list);
  return list;
}

export function isLocked(key: string, now = Date.now()) {
  return recent(key, now).length >= MAX_FAILS;
}
export function recordFailure(key: string, now = Date.now()) {
  recent(key, now).push(now);
}
export function clearFailures(key: string) {
  fails.delete(key);
}
export function minutesUntilUnlock(key: string, now = Date.now()) {
  const list = recent(key, now);
  if (list.length < MAX_FAILS) return 0;
  return Math.ceil((WINDOW_MS - (now - list[0])) / 60000);
}
