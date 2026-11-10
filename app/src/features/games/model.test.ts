import test from 'node:test';
import assert from 'node:assert/strict';
import { findFive, makeTruth, makeXO, randomCard } from './model.ts';
import type { Mark } from './model.ts';

test('five connected marks win in each valid direction', () => {
  for (const line of [[0, 1, 2, 3, 4], [0, 15, 30, 45, 60], [0, 16, 32, 48, 64], [4, 18, 32, 46, 60]]) {
    const board = Object.fromEntries(line.map(index => [String(index), 'X' as Mark]));
    assert.ok(findFive(board, line[2], 'X'));
  }
});

test('the right edge never wraps into the next row', () => {
  const board = Object.fromEntries([12, 13, 14, 15, 16].map(index => [String(index), 'X' as Mark]));
  assert.equal(findFive(board, 14, 'X'), null);
});

test('an opponent mark breaks the sequence', () => {
  const board: Record<string, Mark> = { 0: 'X', 1: 'X', 2: 'O', 3: 'X', 4: 'X' };
  assert.equal(findFive(board, 1, 'X'), null);
});

test('new game states preserve the Firebase schema and unique match IDs', () => {
  const truth = makeTruth(), first = makeXO(), second = makeXO();
  assert.equal(truth.phase, 'waiting');
  assert.equal(truth.chooser, '');
  assert.equal(first.turn, 'X');
  assert.deepEqual(first.score, { X: 0, O: 0 });
  assert.match(first.matchId, /^[a-z0-9]{20}$/);
  assert.notEqual(first.matchId, second.matchId);
});

test('drawn card values remain in the thirteen-card range', () => {
  for (let i = 0; i < 100; i++) {
    const card = randomCard();
    assert.ok(Number.isInteger(card) && card >= 1 && card <= 13);
  }
});
