import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  modLogChannelId: process.env.MOD_LOG_CHANNEL_ID || null,

  // Tolerances for repeated misuse of the same action
  timeouts: {
    maxTimeoutMs: 28 * 24 * 60 * 60 * 1000, // Discord hard cap
  },

  // Anti-raid: pause moderation UI when members join this fast
  raid: {
    threshold: Number(process.env.RAID_JOIN_THRESHOLD) || 10,
    windowMs: Number(process.env.RAID_WINDOW_MS) || 10_000,
  },
};

export function requireConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}.\n` +
        'Copy .env.example to .env and fill in your bot credentials.',
    );
  }
  return config;
}