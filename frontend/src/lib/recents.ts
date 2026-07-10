const STORAGE_KEY = "wfx.recents";
const CAP = 5;

export interface RecentEntry {
  type: "ask" | "search";
  text: string;
  timestamp: number;
}

export function getRecents(): RecentEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function addRecent(entry: Omit<RecentEntry, "timestamp">): void {
  const deduped = getRecents().filter(
    (existing) => !(existing.type === entry.type && existing.text === entry.text),
  );
  const next = [{ ...entry, timestamp: Date.now() }, ...deduped].slice(0, CAP);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable (private mode / quota) — recents silently degrade to empty
  }
}
