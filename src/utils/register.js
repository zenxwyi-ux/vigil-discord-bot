import { REST, Routes } from 'discord.js';
import { commands, contextMenus } from '../commands.js';
import { config, requireConfig } from '../config.js';
import { logger } from './logger.js';

export async function registerCommands(client) {
  requireConfig();
  const rest = new REST({ version: '10' }).setToken(config.token);
  const payload = [...commands, ...contextMenus];

  const target = config.guildId
    ? `guild ${config.guildId} (instant — for development)`
    : 'every server (global — propagates in up to an hour)';

  try {
    logger.info(`Registering ${payload.length} commands to ${target}…`);
    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);
    const data = await rest.put(route, { body: payload });
    logger.info(`Registered ${data.length} commands.`);
    return data.length;
  } catch (err) {
    logger.error(`Command registration failed: ${err.message}`);
    throw err;
  }
}