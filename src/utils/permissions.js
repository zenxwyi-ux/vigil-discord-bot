import { PermissionFlagsBits } from 'discord.js';
import { logger } from './logger.js';

/**
 * Guard used by every moderation command. Returns an error string (or null) and
 * handles all Discord-side checks: permissions, hierarchy, self-targeting.
 */
export function canModerateTarget({ guild, member, target, permission, allowSelf = false, client }) {
  const botMember = guild.members.me;

  if (!target) return 'That member could not be found in this server.';
  if (target.user.id === guild.ownerId) return 'You cannot moderate the server owner.';
  if (!allowSelf && target.id === member.id) return 'You cannot moderate yourself.';
  if (client?.user && target.id === client.user.id) return 'You cannot moderate the bot itself.';

  if (!member.permissions.has(permission)) return 'You do not have permission to use this command.';
  if (!botMember.permissions.has(permission)) return "I don't have the required permission to do that.";

  if (target.roles?.highest && botMember.roles?.highest) {
    const botTop = botMember.roles.highest.position;
    const targetTop = target.roles.highest.position;
    if (targetTop >= botTop) return 'That member has a role equal to or higher than mine — I cannot act on them.';
  }
  return null;
}

export { PermissionFlagsBits };