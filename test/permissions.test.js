import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canModerateTarget, PermissionFlagsBits } from '../src/utils/permissions.js';

const MOD = PermissionFlagsBits.ModerateMembers;

function member(id, perms, rolePosition = 1) {
  return {
    id,
    permissions: { has: (p) => (perms & p) === p },
    roles: { highest: { position: rolePosition } },
  };
}

function guild(ownerId, botRolePosition = 10, botPerms = MOD) {
  return {
    ownerId,
    members: {
      me: {
        id: 'bot-1',
        roles: { highest: { position: botRolePosition } },
        permissions: { has: (p) => (botPerms & p) === p },
      },
    },
  };
}

function target(id, rolePosition = 1) {
  return {
    id,
    user: { id },
    roles: { highest: { position: rolePosition } },
  };
}

const M = member('mod-1', MOD, 10);
const G = guild('owner-1');

test('passes when everything checks out', () => {
  const t = target('user-1', 1);
  assert.equal(canModerateTarget({ guild: G, member: M, target: t, permission: MOD }), null);
});

test('rejects when the target is missing', () => {
  const err = canModerateTarget({ guild: G, member: M, target: null, permission: MOD });
  assert.match(err, /could not be found/);
});

test('rejects the server owner', () => {
  const t = target('owner-1');
  const err = canModerateTarget({ guild: G, member: M, target: t, permission: MOD });
  assert.match(err, /server owner/);
});

test('rejects self-moderation unless allowSelf', () => {
  const t = target('mod-1', 5);
  let err = canModerateTarget({ guild: G, member: M, target: t, permission: MOD });
  assert.match(err, /yourself/);
  err = canModerateTarget({ guild: G, member: M, target: t, permission: MOD, allowSelf: true });
  assert.equal(err, null);
});

test('rejects targeting the bot itself', () => {
  const t = target('bot-1');
  const err = canModerateTarget({ guild: G, member: M, target: t, permission: MOD, client: { user: { id: 'bot-1' } } });
  assert.match(err, /bot itself/);
});

test('rejects when the invoker lacks the permission', () => {
  const poor = member('mod-2', 0n, 10);
  const t = target('user-1', 1);
  const err = canModerateTarget({ guild: G, member: poor, target: t, permission: MOD });
  assert.match(err, /do not have permission/);
});

test('rejects when the bot lacks the permission', () => {
  const weakGuild = guild('owner-1', 10, 0n);
  const t = target('user-1', 1);
  const err = canModerateTarget({ guild: weakGuild, member: M, target: t, permission: MOD });
  assert.match(err, /I don't have the required permission/);
});

test('rejects targets with equal or higher role position', () => {
  const t = target('user-1', 10);
  const err = canModerateTarget({ guild: G, member: M, target: t, permission: MOD });
  assert.match(err, /equal to or higher/);
});

test('member without roles still passes hierarchy check', () => {
  const t = { id: 'user-1', user: { id: 'user-1' }, roles: {} };
  assert.equal(canModerateTarget({ guild: G, member: M, target: t, permission: MOD }), null);
});
