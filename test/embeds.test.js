import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simpleEmbed, actionEmbed } from '../src/utils/embeds.js';

test('simpleEmbed: defaults', () => {
  const out = simpleEmbed({ title: 'Hi', description: 'There' });
  assert.equal(out.ephemeral, true);
  assert.equal(out.embeds.length, 1);
  assert.equal(out.embeds[0].title, 'Hi');
  assert.equal(out.embeds[0].description, 'There');
  assert.ok(out.embeds[0].timestamp);
  assert.equal(out.embeds[0].footer, undefined);
});

test('simpleEmbed: clamps long text with ellipsis', () => {
  const out = simpleEmbed({ title: 'x'.repeat(300) });
  assert.equal(out.embeds[0].title.length, 256);
  assert.match(out.embeds[0].title, /…$/);

  const d = simpleEmbed({ description: 'y'.repeat(5000) });
  assert.equal(d.embeds[0].description.length, 4000);
});

test('simpleEmbed: backticks are escaped to avoid code fences', () => {
  const out = simpleEmbed({ description: 'say `hi`' });
  assert.ok(!out.embeds[0].description.includes('`hi`'));
});

test('actionEmbed: fields are inline-flagged', () => {
  const out = actionEmbed({
    title: 'Warned',
    author: 'vigil',
    fields: [{ name: 'Reason', value: 'spam' }, { name: 'By', value: 'mod', inline: true }],
  });
  assert.equal(out.embeds[0].fields[0].inline, false);
  assert.equal(out.embeds[0].fields[1].inline, true);
  assert.ok(out.embeds[0].author?.name);
});