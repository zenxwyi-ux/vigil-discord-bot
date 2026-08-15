import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatDuration } from '../src/utils/time.js';

test('parseDuration: valid units', () => {
  assert.equal(parseDuration('10s'), 10_000);
  assert.equal(parseDuration('5m'), 300_000);
  assert.equal(parseDuration('2h'), 7_200_000);
  assert.equal(parseDuration('3d'), 259_200_000);
  assert.equal(parseDuration('1w'), 604_800_000);
});

test('parseDuration: decimals and loose spacing', () => {
  assert.equal(parseDuration('1.5s'), 1_500);
  assert.equal(parseDuration(' 2 h '), 7_200_000);
  assert.equal(parseDuration('0.5m'), 30_000);
});

test('parseDuration: case-insensitive units', () => {
  assert.equal(parseDuration('10S'), 10_000);
  assert.equal(parseDuration('2H'), 7_200_000);
});

test('parseDuration: rejects garbage', () => {
  assert.equal(parseDuration('ten seconds'), null);
  assert.equal(parseDuration('10'), null);
  assert.equal(parseDuration('10x'), null);
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration(null), null);
  assert.equal(parseDuration(undefined), null);
  assert.equal(parseDuration(42), null);
  assert.equal(parseDuration('-5m'), null);
});

test('formatDuration: zero and negative', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(-100), '0s');
  assert.equal(formatDuration(null), '0s');
});

test('formatDuration: single unit', () => {
  assert.equal(formatDuration(10_000), '10s');
  assert.equal(formatDuration(3_600_000), '1h');
  assert.equal(formatDuration(86_400_000), '1d');
});

test('formatDuration: truncates to two largest units', () => {
  assert.equal(formatDuration(90_000), '1m 30s');
  assert.equal(formatDuration(3_700_000), '1h 1m');
  assert.equal(formatDuration(90061000), '1d 1h');
  assert.equal(formatDuration(6_500), '6s');
});