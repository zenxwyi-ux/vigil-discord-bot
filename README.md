# 🛡️ VIGIL — The Discord Moderation Sentinel

> **A complete, self-hosted Discord moderation bot. Slash-command native. Zero databases.
> Zero dashboards. Just a token, a server invite, and order restored.**

VIGIL runs directly against the **Discord API** (REST + Gateway, via discord.js v14)
— no external services, no MongoDB, no webhooks, no smoke and mirrors. Everything
it does is a real API call: `PATCH /guilds/{id}/members/{userId}` for timeouts,
`DELETE /guilds/{id}/members/{userId}` for kicks, `PUT /guilds/{id}/bans/{userId}`
for bans. When VIGIL says someone is timed out, Discord itself says so too.

---

## ✨ Why it has flair

Most "moderation bots" are dashboards that need a database, a deployment platform,
and a small team to feed them. VIGIL is the opposite philosophy:

- **Self-contained.** One Node process, one `.env` file, local JSON for warnings.
- **Human-native UX.** Every reply is an ephemeral embed — only *you* see the
  confirmation, chat stays clean.
- **Audit-first.** Every action is written to an auto-created or auto-detected
  `#mod-log` channel: kicks, bans, timeouts, warnings, purges, *even message edits
  and deletes from other users*.
- **Raid radar.** It watches join velocity and raises the alarm the moment an
  account-burst looks like a raid.
- **Permission-aware.** It respects role hierarchy: if the target outranks VIGIL,
  VIGIL refuses instead of failing with a red error.

---

## ⚡ Quick start (two minutes)

**1. Clone & install**

```bash
git clone https://github.com/zenxwyi-ux/vigil-discord-bot.git
cd vigil-discord-bot
npm install
```

**2. Create the bot at [discord.com/developers](https://discord.com/developers/applications)**

- New Application → **Bot** tab → copy the **token**
- Privileged Gateway Intents: enable **Message Content** and **Server Members**
- OAuth2 → URL Generator → scopes `bot` + `applications.commands` → permissions:
  `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`,
  `Manage Channels`, `View Channels`, `Read Message History`, `Send Messages`
- Invite the bot to your server

**3. Configure & launch**

```bash
cp .env.example .env
# paste DISCORD_TOKEN and CLIENT_ID
npm start
```

On first boot, VIGIL registers all 16 slash commands, finds or creates
`#mod-log`, and greets the server. That's it — nothing else to set up.

---

## 🎯 Commands

| Command | What it does | Locked to |
| --- | --- | --- |
| `/kick` | Remove a member (they can rejoin) | `Kick Members` |
| `/ban` | Ban a member, optional message purge (0–7 days) | `Ban Members` |
| `/unban` | Lift a ban by user ID | `Ban Members` |
| `/timeout` | Mute a member — `30m`, `2h`, `3d` (max 28 days) | `Moderate Members` |
| `/untimeout` | Lift an active timeout | `Moderate Members` |
| `/warn` | Record a written strike with reason | `Moderate Members` |
| `/warnings` | Show a member's strike history | `Moderate Members` |
| `/warnings-clear` | Wipe a member's strike history | `Moderate Members` |
| `/purge` | Bulk-delete messages (targeted or full) | `Manage Messages` |
| `/slowmode` | Set channel slowmode (0–21600s) | `Manage Channels` |
| `/lock` / `/unlock` | Freeze / restore chat in a channel | `Manage Channels` |
| `/userinfo` | Join date, account age, roles — in one embed | everyone |
| `/serverinfo` | Server census: members, owner, channels | everyone |
| `/ping` | Gateway + round-trip latency | everyone |
| `/help` | The field manual | everyone |

**Context menus:** right-click a user → **View user info** · right-click a
message → **Purge this message** (moderators only).

---

## 🌊 Events it hunts for you

- 🇮 **Join & leave** — every member's arrival and departure, with roles on exit
- 🚨 **Raid watch** — N joins in 10s triggers the alarm (tunable in `.env`)
- ✏️ **Edit whispers** — diff-embedded in `#mod-log`, so people can't ninja-edit
  their way out of trouble
- 🗑️ **Delete saves** — the message is captured to `#mod-log` *before* it's gone
- ⛔ **External bans/unbans** — even actions taken outside VIGIL leave a trail

---

## 🗂️ Project layout

```
src/
├── index.js            # client setup, lifecycle, raid radar, message audit
├── config.js           # .env loading with sanity checks
├── commands.js         # slash + context-menu command schema (the "contract")
├── handlers.js         # every command's implementation
└── utils/
    ├── embeds.js       # consistent ephemeral embed shapes
    ├── modlog.js       # find / create #mod-log channel
    ├── permissions.js  # hierarchy + permission guards
    ├── register.js     # on-boot command registration (REST)
    ├── time.js         # "2h" → milliseconds parse/format
    ├── warnings.js     # JSON-backed strike ledger
    └── logger.js       # leveled, colored console output
```

Warnings persist to `src/data/warnings.json` (gitignored — never committed).

---

## 🧠 Architecture notes

- **Gateway intents:** `Guilds`, `GuildMembers`, `GuildModeration`,
  `GuildMessages`, `MessageContent` — enough to see everything the audit needs,
  nothing more.
- **Ephemeral by default:** every confirmation is an ephemeral reply. `#mod-log`
  is the only public-facing record — deliberate screaming, but from one source.
- **Hierarchy guard:** before any moderation the bot checks *its* highest role
  against the target's. Equal or above → politely refused.
- **Bulk-delete aware:** Discord's 14-day message-edit window is respected;
  over-limit purges fail with a plain-language explanation, not an error dump.

---

## 📄 License

MIT — do absolutely anything with it, but a star on the repo is always
appreciated. ⭐

*Built on **discord.js v14** against the Discord REST API v10 and Gateway events.*