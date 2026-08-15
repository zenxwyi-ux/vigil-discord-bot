import { ChannelType, PermissionFlagsBits, Colors } from 'discord.js';
import { config } from '../config.js';
import { logger } from './logger.js';

const MOD_LOG_NAMES = ['mod-log', 'modlog', 'moderation-log', 'audit-log'];

export async function ensureModLogChannel(guild) {
  const pinned = config.modLogChannelId;
  if (pinned) {
    const channel = guild.channels.cache.get(pinned);
    if (channel?.isTextBased()) return channel;
  }

  const existing = guild.channels.cache.find(
    (ch) => ch.isTextBased() && MOD_LOG_NAMES.includes(ch.name.toLowerCase()),
  );
  if (existing) return existing;

  const me = guild.members.me;
  if (me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    try {
      return await guild.channels.create({
        name: 'mod-log',
        type: ChannelType.GuildText,
        topic: 'Automated moderation audit log',
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        ],
      });
    } catch (err) {
      logger.warn(`Could not auto-create mod-log in ${guild.id}: ${err.message}`);
    }
  }

  const system = guild.systemChannel;
  if (system?.isTextBased()) {
    logger.warn(`No mod-log channel in ${guild.name} — falling back to system channel.`);
    return system;
  }
  logger.warn(`No mod-log channel and no fallback available in ${guild.name}.`);
  return null;
}

export async function sendModLog(guild, { title, description, color = Colors.Blurple, fields = [], author }) {
  const channel = await ensureModLogChannel(guild);
  if (!channel) return;
  await channel
    .send({
      embeds: [
        {
          title,
          description,
          color,
          author,
          fields: fields.slice(0, 25),
          timestamp: new Date().toISOString(),
        },
      ],
    })
    .catch((err) => logger.warn(`mod-log send failed in ${guild.id}: ${err.message}`));
}