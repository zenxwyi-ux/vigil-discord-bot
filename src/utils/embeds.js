import { Colors } from 'discord.js';

const ONE_LINE_MAX = 1024;

function clamp(str, max = ONE_LINE_MAX) {
  const text = String(str ?? '').replace(/`/g, '\u200b`');
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}

export function simpleEmbed({ title, description, color = Colors.Blurple, footer } = {}) {
  return {
    embeds: [
      {
        title: title ? clamp(title, 256) : undefined,
        description: description ? clamp(description, 4000) : undefined,
        color,
        footer: footer ? { text: clamp(footer, 2048) } : undefined,
        timestamp: new Date().toISOString(),
      },
    ],
    ephemeral: true,
  };
}

export function actionEmbed({ title, description, color = Colors.Green, author, fields = [] }) {
  return {
    embeds: [
      {
        title: title ? clamp(title, 256) : undefined,
        description: description ? clamp(description, 4000) : undefined,
        color,
        author: author ? { name: clamp(author, 256), iconURL: 'https://cdn.discordapp.com/embed/avatars/1.png' } : undefined,
        fields: fields.map((f) => ({ name: clamp(f.name, 256), value: clamp(f.value), inline: f.inline ?? false })),
        timestamp: new Date().toISOString(),
      },
    ],
    ephemeral: true,
  };
}