import { ChannelType, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { canModerateTarget } from './utils/permissions.js';
import { sendModLog } from './utils/modlog.js';
import { logger } from './utils/logger.js';
import { addWarning, clearWarnings, getWarnings, removeWarning } from './utils/warnings.js';
import { parseDuration, formatDuration } from './utils/time.js';
import { simpleEmbed, actionEmbed } from './utils/embeds.js';

async function getUser(client, raw) {
  const id = String(raw).replace(/[<@!>&]/g, '');
  if (!/^\d{17,20}$/.test(id)) return null;
  try {
    return await client.users.fetch(id);
  } catch {
    return null;
  }
}

async function memberInGuild(guild, userId) {
  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

const handlers = {
  ping: async (interaction) => {
    const sent = Date.now();
    const reply = await interaction.reply({ content: 'Pong.', fetchReply: true });
    const latency = reply.createdTimestamp - sent;
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Pong!')
          .setColor(Colors.Blurple)
          .setDescription(
            [
              `**Gateway heartbeat:** ${interaction.client.ws.ping}ms`,
              `**Round-trip latency:** ${latency}ms`,
              `**Uptime:** ${Math.floor(interaction.client.uptime / 1000)}s`,
            ].join('\n'),
          ),
      ],
    });
  },

  help: async (interaction) => {
    const lines = [
      '**Moderation**',
      '`/kick` — kick a member',
      '`/ban` — ban a member (optionally delete messages)',
      '`/unban` — remove a ban by user ID',
      '`/timeout` — mute a member, `30m` `2h` `3d` (max 28d)',
      '`/untimeout` — lift an active timeout',
      '`/warn` — record a warning',
      '`/warnings` — list warnings for a member',
      '`/warnings-clear` — wipe a member\'s warnings',
      '',
      '**Channel control**',
      '`/purge` — bulk-delete messages (optionally per user)',
      '`/slowmode` — set channel slowmode',
      '`/lock` / `/unlock` — stop/restore chat in a channel',
      '',
      '**Info**',
      '`/userinfo` `\u200b/serverinfo` `\u200b/ping` `\u200b/help`',
    ];
    return interaction.reply(
      simpleEmbed({
        title: '🛡️ Moderation commands',
        description: lines.join('\n'),
        footer: 'Right-click a user or message for quick actions',
      }),
    );
  },

  kick: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const err = canModerateTarget({ guild: interaction.guild, member: interaction.member, target, permission: PermissionFlagsBits.KickMembers, client: interaction.client });
    if (err) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: err, color: Colors.Red }));

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await target.kick(reason);

    const logFields = [
      { name: 'Target', value: `${target.user.tag} (\`${target.id}\`)`, inline: false },
      { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason, inline: true },
    ];
    await sendModLog(interaction.guild, { title: '🔨 Member kicked', color: Colors.Orange, fields: logFields });
    return interaction.editReply(
      actionEmbed({ title: `Kicked ${target.user.tag}`, description: `**Reason:** ${reason}`, color: Colors.Orange }),
    );
  },

  ban: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const user = interaction.options.getUser('member');
    const raw = interaction.options.getString('member');

    const resolvedUser =
      user ??
      (raw ? await getUser(interaction.client, raw).catch(() => null) : null);

    if (!resolvedUser) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'User not resolvable.', color: Colors.Red }));

    const memberForCheck = target ?? (await memberInGuild(interaction.guild, resolvedUser.id));
    const err = canModerateTarget({
      guild: interaction.guild,
      member: interaction.member,
      target: memberForCheck,
      permission: PermissionFlagsBits.BanMembers,
      client: interaction.client,
    });
    if (err) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: err, color: Colors.Red }));

    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
    await interaction.guild.bans.create(resolvedUser.id, { reason, deleteMessageSeconds: deleteDays * 86400 });

    const logFields = [
      { name: 'Target', value: `${resolvedUser.username ?? resolvedUser.tag} (\`${resolvedUser.id}\`)`, inline: false },
      { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
      { name: 'Messages deleted', value: `${deleteDays} day(s)`, inline: true },
      { name: 'Reason', value: reason, inline: false },
    ];
    await sendModLog(interaction.guild, { title: '⛔ Member banned', color: Colors.Red, fields: logFields });
    return interaction.editReply(
      actionEmbed({ title: `Banned ${resolvedUser.username ?? resolvedUser.tag}`, description: `**Reason:** ${reason}`, color: Colors.Red }),
    );
  },

  unban: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'You need the **Ban Members** permission.', color: Colors.Red }));
    }
    const id = String(interaction.options.getString('user_id')).replace(/[<@!>&]/g, '');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const ban = await interaction.guild.bans.fetch().catch(() => null);
    if (!ban?.has(id)) return interaction.editReply(simpleEmbed({ title: '⛔ Not banned', description: 'That user is not on the ban list.', color: Colors.Red }));

    await interaction.guild.bans.remove(id, reason);
    await sendModLog(interaction.guild, {
      title: '🔓 Ban lifted',
      color: Colors.Green,
      fields: [
        { name: 'User', value: `\`${id}\``, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(actionEmbed({ title: `Unbanned \`${id}\``, description: `**Reason:** ${reason}` }));
  },

  timeout: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const err = canModerateTarget({ guild: interaction.guild, member: interaction.member, target, permission: PermissionFlagsBits.ModerateMembers, client: interaction.client });
    if (err) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: err, color: Colors.Red }));

    const ms = parseDuration(interaction.options.getString('duration'));
    if (!ms) return interaction.editReply(simpleEmbed({ title: '⛔ Invalid duration', description: 'Use formats like `30m`, `2h`, `3d` (max **28 days**).', color: Colors.Red }));

    const MAX = 28 * 24 * 60 * 60 * 1000;
    if (ms > MAX) return interaction.editReply(simpleEmbed({ title: '⛔ Too long', description: 'Discord timeouts cap at **28 days**. For anything longer, use `/ban`.', color: Colors.Red }));

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await target.timeout(ms, reason);

    const ends = new Date(Date.now() + ms);
    await sendModLog(interaction.guild, {
      title: '🌙 Member timed out',
      color: Colors.Gold,
      fields: [
        { name: 'Target', value: `${target.user.tag}`, inline: false },
        { name: 'Duration', value: formatDuration(ms), inline: true },
        { name: 'Expires', value: `<t:${Math.floor(ends.getTime() / 1000)}:R>`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(
      actionEmbed({
        title: `Timed out ${target.user.tag}`,
        description: `**Duration:** ${formatDuration(ms)}\n**Expires:** <t:${Math.floor(ends.getTime() / 1000)}:F>\n**Reason:** ${reason}`,
        color: Colors.Gold,
      }),
    );
  },

  untimeout: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const err = canModerateTarget({ guild: interaction.guild, member: interaction.member, target, permission: PermissionFlagsBits.ModerateMembers, client: interaction.client });
    if (err) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: err, color: Colors.Red }));

    if (!target.communicationDisabledUntil) {
      return interaction.editReply(simpleEmbed({ title: 'ℹ️ Not timed out', description: 'This member has no active timeout.', color: Colors.Grey }));
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';
    await target.timeout(null, reason);
    await sendModLog(interaction.guild, {
      title: '☀️ Timeout lifted',
      color: Colors.Green,
      fields: [
        { name: 'Target', value: `${target.user.tag}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(actionEmbed({ title: `Removed timeout from ${target.user.tag}`, description: `**Reason:** ${reason}` }));
  },

  warn: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getMember('member');
    const err = canModerateTarget({ guild: interaction.guild, member: interaction.member, target, permission: PermissionFlagsBits.ModerateMembers, client: interaction.client });
    if (err) return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: err, color: Colors.Red }));

    const reason = interaction.options.getString('reason', true);
    const warnings = await addWarning(interaction.guild.id, target.id, { moderatorId: interaction.user.id, reason });
    const count = warnings.length;

    await sendModLog(interaction.guild, {
      title: '⚠️ Member warned',
      color: Colors.Yellow,
      fields: [
        { name: 'Target', value: `${target.user.tag} (\`${target.id}\`)`, inline: false },
        { name: 'Warning', value: `#${count}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(
      actionEmbed({
        title: `Warned ${target.user.tag}`,
        description: `**Warning #${count}**\n**Reason:** ${reason}`,
        color: Colors.Yellow,
      }),
    );
  },

  warnings: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'You need the **Moderate Members** permission.', color: Colors.Red }));
    }
    const target = interaction.options.getMember('member', true);
    const warnings = await getWarnings(interaction.guild.id, target.id);

    if (!warnings.length) {
      return interaction.editReply(simpleEmbed({ title: '✅ Clean record', description: `${target.user.tag} has **no warnings**.`, color: Colors.Green }));
    }

    const lines = warnings
      .map((w, i) => `**#${i + 1}** — ${w.reason}\n   <t:${Math.floor(new Date(w.at).getTime() / 1000)}:R> by <@${w.moderatorId}>`)
      .join('\n');

    return interaction.editReply(
      simpleEmbed({
        title: `⚠️ ${target.user.tag} — ${warnings.length} warning(s)`,
        description: lines,
        footer: 'Use /warnings-clear to wipe the record',
      }),
    );
  },

  'warnings-clear': async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'You need the **Moderate Members** permission.', color: Colors.Red }));
    }
    const target = interaction.options.getMember('member', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const removed = await clearWarnings(interaction.guild.id, target.id);

    await sendModLog(interaction.guild, {
      title: '🧹 Warnings cleared',
      color: Colors.Green,
      fields: [
        { name: 'Target', value: `${target.user.tag}`, inline: true },
        { name: 'Removed', value: `${removed} warning(s)`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(actionEmbed({ title: `Cleared ${removed} warning(s) for ${target.user.tag}`, description: `**Reason:** ${reason}` }));
  },

  purge: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const count = interaction.options.getInteger('count', true);
    const target = interaction.options.getUser('target');
    const channel = interaction.channel;

    if (!channel.isTextBased() || channel.type === ChannelType.GuildForum) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'This channel type cannot be purged.', color: Colors.Red }));
    }

    try {
      let deleted;
      if (target) {
        const fetched = await channel.messages.fetch({ limit: Math.min(count * 3, 100) });
        const toDelete = fetched.filter((m) => m.author.id === target.id).first(count);
        deleted = channel.bulkDelete(toDelete, true);
      } else {
        deleted = channel.bulkDelete(count, true);
      }
      const amount = (await deleted).size;
      await sendModLog(interaction.guild, {
        title: '🧹 Messages purged',
        color: Colors.Blue,
        fields: [
          { name: 'Channel', value: `${channel}`, inline: true },
          { name: 'Deleted', value: `${amount}`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Filter', value: target ? `${target.tag} only` : 'All messages', inline: false },
        ],
      });
      return interaction.editReply(actionEmbed({ title: `Deleted ${amount} message(s)`, color: Colors.Blue }));
    } catch (err) {
      logger.warn(`purge failed: ${err.message}`);
      return interaction.editReply(
        simpleEmbed({
          title: '⛔ Purge failed',
          description: 'Messages older than 14 days cannot be bulk-deleted. Try a smaller count.',
          color: Colors.Red,
        }),
      );
    }
  },

  slowmode: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const seconds = interaction.options.getInteger('seconds', true);
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (!channel.isTextBased()) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'That channel cannot have a slowmode.', color: Colors.Red }));
    }

    await channel.setRateLimitPerUser(seconds);
    await sendModLog(interaction.guild, {
      title: seconds ? '🐌 Slowmode set' : '⚡ Slowmode removed',
      color: Colors.Blue,
      fields: [
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Seconds', value: `${seconds}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
      ],
    });
    return interaction.editReply(
      seconds
        ? actionEmbed({ title: `Slowmode set to ${seconds}s in ${channel.name}`, color: Colors.Blue })
        : actionEmbed({ title: `Slowmode removed in ${channel.name}`, color: Colors.Blue }),
    );
  },

  lock: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!channel.isTextBased()) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'That channel cannot be locked.', color: Colors.Red }));
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    await sendModLog(interaction.guild, {
      title: '🔒 Channel locked',
      color: Colors.Red,
      fields: [
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(actionEmbed({ title: `Locked ${channel.name}`, description: `**Reason:** ${reason}`, color: Colors.Red }));
  },

  unlock: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!channel.isTextBased()) {
      return interaction.editReply(simpleEmbed({ title: '⛔ Blocked', description: 'That channel cannot be unlocked.', color: Colors.Red }));
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    await sendModLog(interaction.guild, {
      title: '🔓 Channel unlocked',
      color: Colors.Green,
      fields: [
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ],
    });
    return interaction.editReply(actionEmbed({ title: `Unlocked ${channel.name}`, description: `**Reason:** ${reason}` }));
  },

  userinfo: async (interaction) => {
    const target = interaction.options.getMember('member') ?? interaction.member;
    const user = target.user;
    const joined = target.joinedAt;
    const created = user.createdAt;

    const roles = target.roles.cache
      .filter((r) => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => r.toString());

    return interaction.reply(
      simpleEmbed({
        title: user.tag,
        description: [
          `**ID:** \`${user.id}\``,
          `**Joined server:** ${joined ? `<t:${Math.floor(joined.getTime() / 1000)}:F>` : 'Unknown'}`,
          `**Account created:** <t:${Math.floor(created.getTime() / 1000)}:F>`,
          `**Roles (${roles.length}):** ${roles.length ? roles.slice(0, 10).join(' ') : 'None'}`,
          `**Bot:** ${user.bot ? 'Yes' : 'No'}`,
        ].join('\n'),
        footer: 'Click a user in chat and choose "View user info" for this',
      }),
    );
  },

  serverinfo: async (interaction) => {
    const g = interaction.guild;
    const members = await g.members.fetch().catch(() => null);
    const total = members?.size ?? g.memberCount;
    const humans = members ? members.filter((m) => !m.user.bot).size : 'Unknown';

    return interaction.reply(
      simpleEmbed({
        title: g.name,
        description: [
          `**ID:** \`${g.id}\``,
          `**Owner:** ${g.ownerId ? `<@${g.ownerId}>` : 'Unknown'}`,
          `**Members:** ${total} (${humans} humans)`,
          `**Channels:** ${g.channels.cache.size}`,
          `**Roles:** ${g.roles.cache.size}`,
          `**Created:** <t:${Math.floor(g.createdAt.getTime() / 1000)}:F>`,
        ].join('\n'),
      }),
    );
  },
};

function handleUserContext(interaction) {
  const target = interaction.targetUser;
  return handlers.userinfo({
    replied: false,
    options: {
      getMember: () => interaction.targetMember,
      getUser: () => target,
    },
    guild: interaction.guild,
    member: interaction.member,
    user: interaction.user,
    reply: (args) => interaction.reply(args),
    editReply: (args) => interaction.editReply(args),
  });
}

function handleMessageContext(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply(simpleEmbed({ title: '⛔ Blocked', description: 'You need the **Manage Messages** permission.', color: Colors.Red }));
  }
  return interaction.targetMessage.delete().then(() =>
    interaction.reply(actionEmbed({ title: 'Message deleted', color: Colors.Blue })),
  );
}

export async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const handler = handlers[interaction.commandName];
      if (handler) return await handler(interaction);
      return interaction.reply(simpleEmbed({ title: '❓ Unknown command', description: 'Try `/help`.', color: Colors.Grey }));
    }
    if (interaction.isUserContextMenuCommand()) return handleUserContext(interaction);
    if (interaction.isMessageContextMenuCommand()) return handleMessageContext(interaction);
  } catch (err) {
    logger.error(`command ${interaction.commandName ?? 'unknown'} failed: ${err.message}`);
    const reply = simpleEmbed({ title: '💥 Something went wrong', description: `\`${err.message}\``, color: Colors.Red });
    if (interaction.deferred || interaction.replied) return interaction.editReply(reply).catch(() => {});
    return interaction.reply(reply).catch(() => {});
  }
}