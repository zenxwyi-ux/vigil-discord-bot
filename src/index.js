import { Client, Events, GatewayIntentBits } from 'discord.js';
import { requireConfig, config } from './config.js';
import { registerCommands } from './utils/register.js';
import { handleInteraction } from './handlers.js';
import { ensureModLogChannel } from './utils/modlog.js';
import { sendModLog } from './utils/modlog.js';
import { logger } from './utils/logger.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration, // ban/unban events
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // allows inspecting message content for audit
  ],
});

// --- lifecycle ---
client.once(Events.ClientReady, async () => {
  logger.info(`Logged in as ${client.user.tag} — serving ${client.guilds.cache.size} server(s).`);

  for (const guild of client.guilds.cache.values()) {
    const channel = await ensureModLogChannel(guild);
    guild.modLogChannel = channel;
  }

  await registerCommands(client);
  client.user.setActivity('/help · keeping order', { type: 3 }); // WATCHING
});

client.on(Events.GuildCreate, async (guild) => {
  logger.info(`Joined server ${guild.name} (${guild.id}).`);
  guild.modLogChannel = await ensureModLogChannel(guild);
});

client.on(Events.InteractionCreate, handleInteraction);

// --- auto-alert: raid seed protection -------------------------------------------------------
const JOIN_WINDOW = new Map(); // guildId -> timestamps
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  const now = Date.now();
  const window = JOIN_WINDOW.get(member.guild.id) ?? [];
  window.push(now);
  const recent = window.filter((t) => now - t < config.raid.windowMs);
  JOIN_WINDOW.set(member.guild.id, recent);

  if (recent.length >= config.raid.threshold) {
    await sendModLog(member.guild, {
      title: '🚨 Possible raid detected',
      color: 0xe74c3c,
      description: `${recent.length} accounts joined within ${config.raid.windowMs / 1000}s. Consider locking channels or checking join logs.`,
      fields: [{ name: 'Latest join', value: `${member.user.tag} (\`${member.id}\`)` }],
    });
    JOIN_WINDOW.set(member.guild.id, []); // fire once per burst
  }
});

client.on(Events.GuildMemberRemove, async (member) => {
  await sendModLog(member.guild, {
    title: '👋 Member left',
    description: `${member.user.tag} (\`${member.id}\`)`,
    fields: [{ name: 'Roles', value: member.roles?.cache?.map((r) => r.name).join(', ') || 'None' }],
  });
});

client.on(Events.GuildBanAdd, async (ban) => {
  await sendModLog(ban.guild, {
    title: '⛔ Ban applied (external)',
    description: `${ban.user.tag} was banned.`,
  });
});

client.on(Events.GuildBanRemove, async (ban) => {
  await sendModLog(ban.guild, {
    title: '🔓 Ban removed (external)',
    description: `${ban.user.tag} was unbanned.`,
  });
});

// --- message audit: catch stealth edits & deletes -------------------------------------------
const SENTINEL = new Set(); // outbound messages from the bot itself
client.on(Events.MessageUpdate, async (_old, fresh) => {
  if (!fresh.content || fresh.author?.id === client.user.id || SENTINEL.has(fresh.id)) return;
  const old = _old;
  if (!old?.content || old.content === fresh.content) return;
  if (Date.now() - fresh.createdTimestamp > 60_000) return; // only recent edits

  await sendModLog(fresh.guild, {
    title: '✏️ Message edited',
    description: [
      `**Channel:** ${fresh.channel}`,
      `**Author:** ${fresh.author.tag} (\`${fresh.author.id}\`)`,
      `\`\`\`diff\n- ${old.content.slice(0, 800)}\n+ ${fresh.content.slice(0, 800)}\`\`\``,
    ].join('\n'),
  });
});

client.on(Events.MessageDelete, async (message) => {
  if (message.author?.id === client.user.id || SENTINEL.has(message.id)) return;
  if (!message.content && !message.attachments?.size) return;

  await sendModLog(message.guild, {
    title: '🗑️ Message deleted',
    description: [
      `**Channel:** ${message.channel}`,
      `**Author:** ${message.author?.tag ?? 'Unknown'} (\`${message.author?.id ?? '?'}\`)`,
      message.content?.slice(0, 900) ? `**Content:**\n${message.content.slice(0, 900)}` : '*(attachment only)*',
    ].join('\n'),
    fields: message.attachments?.size
      ? [{ name: 'Attachments', value: message.attachments.map((a) => `[${a.name}](${a.url})`).join('\n') }]
      : [],
  });
});

client.on(Events.MessageBulkDelete, async (messages) => {
  await sendModLog(messages.first()?.guild, {
    title: '🧹 Bulk delete detected',
    description: `${messages.size} messages were removed from ${messages.first()?.channel}.`,
  });
});

// --- graceful shutdown -----------------------------------------------------------------------
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    logger.info(`${sig} received — shutting down.`);
    client.destroy();
    process.exit(0);
  });
}

// --- boot ------------------------------------------------------------------------------------
(async () => {
  try {
    requireConfig();
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }
  client.login(config.token).catch((err) => {
    logger.error(`Login failed: ${err.message}`);
    process.exit(1);
  });
})();

export { client };