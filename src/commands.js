import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';

export const commands = [
  {
    name: 'ping',
    description: "Check the bot's heartbeat and API latency.",
  },
  {
    name: 'kick',
    description: 'Remove a member from the server. They can rejoin with an invite.',
    options: [
      { name: 'member', description: 'Member to kick', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.KickMembers),
  },
  {
    name: 'ban',
    description: 'Ban a member. They cannot rejoin until unbanned.',
    options: [
      { name: 'member', description: 'Member to ban', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
      {
        name: 'delete_days',
        description: 'Delete how many days of their messages',
        type: ApplicationCommandOptionType.Integer,
        min_value: 0,
        max_value: 7,
      },
    ],
    default_member_permissions: String(PermissionFlagsBits.BanMembers),
  },
  {
    name: 'unban',
    description: 'Remove a ban by user ID.',
    options: [
      { name: 'user_id', description: 'Snowflake ID of the banned user', type: ApplicationCommandOptionType.String, required: true },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.BanMembers),
  },
  {
    name: 'timeout',
    description: 'Timeout a member (up to 28 days). Usage: 30m, 2h, 3d',
    options: [
      { name: 'member', description: 'Member to timeout', type: ApplicationCommandOptionType.User, required: true },
      { name: 'duration', description: 'e.g. 30m, 2h, 3d (max 28d)', type: ApplicationCommandOptionType.String, required: true },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
  },
  {
    name: 'untimeout',
    description: 'Remove a timeout from a member.',
    options: [
      { name: 'member', description: 'Member to un-timeout', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
  },
  {
    name: 'warn',
    description: 'Issue a written warning. Strikes are recorded per member.',
    options: [
      { name: 'member', description: 'Member to warn', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Why they are being warned', type: ApplicationCommandOptionType.String, required: true },
    ],
    default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
  },
  {
    name: 'warnings',
    description: 'List every warning a member has on file.',
    options: [
      { name: 'member', description: 'Member to inspect', type: ApplicationCommandOptionType.User, required: true },
    ],
    default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
  },
  {
    name: 'warnings-clear',
    description: 'Wipe all warnings for a member.',
    options: [
      { name: 'member', description: 'Member to clear', type: ApplicationCommandOptionType.User, required: true },
      { name: 'reason', description: 'Reason for clearing', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.ModerateMembers),
  },
  {
    name: 'purge',
    description: 'Bulk-delete recent messages in this channel (max 100).',
    options: [
      { name: 'count', description: 'How many messages to delete (1-100)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 1, max_value: 100 },
      { name: 'target', description: 'Only delete messages from this user', type: ApplicationCommandOptionType.User },
    ],
    default_member_permissions: String(PermissionFlagsBits.ManageMessages),
  },
  {
    name: 'slowmode',
    description: 'Set a channel slowmode.',
    options: [
      { name: 'seconds', description: 'Seconds between messages (0 disables)', type: ApplicationCommandOptionType.Integer, required: true, min_value: 0, max_value: 21600 },
      { name: 'channel', description: 'Target channel (defaults to this one)', type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildText] },
    ],
    default_member_permissions: String(PermissionFlagsBits.ManageChannels),
  },
  {
    name: 'lock',
    description: 'Lock a channel so regular members cannot send messages.',
    options: [
      { name: 'channel', description: 'Target channel (defaults to this one)', type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildText] },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.ManageChannels),
  },
  {
    name: 'unlock',
    description: 'Unlock a previously locked channel.',
    options: [
      { name: 'channel', description: 'Target channel (defaults to this one)', type: ApplicationCommandOptionType.Channel, channel_types: [ChannelType.GuildText] },
      { name: 'reason', description: 'Reason shown in the audit log', type: ApplicationCommandOptionType.String },
    ],
    default_member_permissions: String(PermissionFlagsBits.ManageChannels),
  },
  {
    name: 'userinfo',
    description: 'Show detailed information about a member.',
    options: [
      { name: 'member', description: 'Member to inspect', type: ApplicationCommandOptionType.User },
    ],
  },
  {
    name: 'serverinfo',
    description: 'Show information about this server.',
  },
  {
    name: 'help',
    description: 'List every moderation command and what it does.',
  },
];

export const contextMenus = [
  {
    name: 'View user info',
    type: ApplicationCommandType.User,
  },
  {
    name: 'Purge this message',
    type: ApplicationCommandType.Message,
    default_member_permissions: String(PermissionFlagsBits.ManageMessages),
  },
];