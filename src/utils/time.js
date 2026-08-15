/**
 * Parse a human duration string ("10s", "5m", "2h", "3d") into milliseconds.
 * Returns null when the string is not a valid duration.
 */
export function parseDuration(input) {
  if (typeof input !== 'string') return null;
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d|w)$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const table = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return Math.round(value * table[unit]);
}

export function formatDuration(ms) {
  if (ms == null || ms <= 0) return '0s';
  const units = [
    ['d', 86_400_000],
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1_000],
  ];
  const parts = [];
  for (const [name, size] of units) {
    if (ms >= size) {
      const n = Math.floor(ms / size);
      parts.push(`${n}${name}`);
      ms -= n * size;
    }
  }
  return parts.slice(0, 2).join(' ') || '0s';
}