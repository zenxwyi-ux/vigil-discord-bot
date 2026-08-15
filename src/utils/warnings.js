import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = process.env.VIGIL_WARNINGS_FILE || join(DATA_DIR, 'warnings.json');

let cache = null;

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

async function save() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(cache, null, 2));
}

export async function addWarning(guildId, userId, { moderatorId, reason, at = new Date().toISOString() }) {
  await load();
  cache[guildId] ??= {};
  cache[guildId][userId] ??= [];
  cache[guildId][userId].push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, moderatorId, reason, at });
  await save();
  return cache[guildId][userId];
}

export async function getWarnings(guildId, userId) {
  await load();
  return (cache[guildId]?.[userId] ?? []).map((w) => ({ ...w }));
}

export async function listGuild(guildId) {
  await load();
  return cache[guildId] ?? {};
}

export async function removeWarning(guildId, userId, warningId) {
  await load();
  const list = cache[guildId]?.[userId];
  if (!list) return null;
  const idx = list.findIndex((w) => w.id === warningId);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  await save();
  return removed;
}

export async function clearWarnings(guildId, userId) {
  await load();
  const count = cache[guildId]?.[userId]?.length ?? 0;
  if (cache[guildId]) delete cache[guildId][userId];
  await save();
  return count;
}