import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vigil-warnings-'));
  process.env.VIGIL_WARNINGS_FILE = join(dir, 'warnings.json');
  const mod = await import('../src/utils/warnings.js');
  mod.__resetForTests?.();
});

afterEach(async () => {
  delete process.env.VIGIL_WARNINGS_FILE;
  await rm(dir, { recursive: true, force: true });
});

async function fresh() {
  return await import(`../src/utils/warnings.js?t=${Date.now()}`);
}

test('addWarning stores a warning and returns the list', async () => {
  const { addWarning, getWarnings } = await fresh();
  const list = await addWarning('guild-1', 'user-1', {
    moderatorId: 'mod-1',
    reason: 'spam',
    at: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].moderatorId, 'mod-1');
  assert.equal(list[0].reason, 'spam');
  assert.ok(list[0].id);
});

test('getWarnings returns copies for a specific member', async () => {
  const { addWarning, getWarnings } = await fresh();
  await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'a' });
  await addWarning('guild-1', 'user-2', { moderatorId: 'mod-1', reason: 'b' });

  const one = await getWarnings('guild-1', 'user-1');
  assert.equal(one.length, 1);
  assert.equal(one[0].reason, 'a');

  const none = await getWarnings('guild-1', 'nobody');
  assert.deepEqual(none, []);

  one[0].reason = 'mutated';
  const again = await getWarnings('guild-1', 'user-1');
  assert.equal(again[0].reason, 'a');
});

test('removeWarning removes by id', async () => {
  const { addWarning, removeWarning, getWarnings } = await fresh();
  await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'x' });
  const [w1, w2] = await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'y' });

  const removed = await removeWarning('guild-1', 'user-1', w1.id);
  assert.equal(removed.id, w1.id);
  const rest = await getWarnings('guild-1', 'user-1');
  assert.equal(rest.length, 1);
  assert.equal(rest[0].id, w2.id);
});

test('removeWarning returns null for unknown ids', async () => {
  const { removeWarning } = await fresh();
  assert.equal(await removeWarning('guild-1', 'user-1', 'nope'), null);
  assert.equal(await removeWarning('guild-1', 'user-1', 'nope'), null);
});

test('clearWarnings removes all for a member and reports count', async () => {
  const { addWarning, clearWarnings, getWarnings } = await fresh();
  await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'x' });
  await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'y' });
  await addWarning('guild-1', 'user-2', { moderatorId: 'mod-1', reason: 'z' });

  assert.equal(await clearWarnings('guild-1', 'user-1'), 2);
  assert.deepEqual(await getWarnings('guild-1', 'user-1'), []);
  assert.equal((await getWarnings('guild-1', 'user-2')).length, 1);
});

test('listGuild returns per-member map', async () => {
  const { addWarning, listGuild } = await fresh();
  await addWarning('guild-1', 'user-1', { moderatorId: 'mod-1', reason: 'x' });
  const map = await listGuild('guild-1');
  assert.equal(Object.keys(map).length, 1);
  assert.equal(map['user-1'].length, 1);
});