import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyBidToLot,
  adjustTimer,
  buildWheelSegments,
  calcBank,
  createLot,
  formatTimer,
  getWheelLots,
  isValidBid,
  parseAmount,
  pickWeightedIndex,
  sortLotsByTotal,
  spinTargetRotation
} from '../src/js/auction-core.mjs';

test('parseAmount and isValidBid', () => {
  assert.equal(parseAmount('12.5'), 12.5);
  assert.equal(isValidBid('0'), false);
  assert.equal(isValidBid('-3'), false);
  assert.equal(isValidBid(''), false);
  assert.equal(isValidBid('40'), true);
});

test('createLot and applyBidToLot accumulate totals', () => {
  const lot = createLot({ id: 1, name: ' Alice ', amount: '100' });
  assert.deepEqual(lot, {
    id: 1,
    name: 'Alice',
    totalBet: 100,
    lastBet: 100
  });

  const updated = applyBidToLot(lot, { name: '', amount: 50 });
  assert.equal(updated.totalBet, 150);
  assert.equal(updated.lastBet, 50);
  assert.equal(updated.name, 'Alice');
});

test('createLot rejects invalid bids', () => {
  assert.throws(() => createLot({ id: 1, name: 'A', amount: 0 }), /positive/);
});

test('calcBank and sortLotsByTotal', () => {
  const lots = [
    createLot({ id: 1, name: 'A', amount: 30 }),
    createLot({ id: 2, name: 'B', amount: 90 }),
    createLot({ id: 3, name: 'C', amount: 10 })
  ];
  assert.equal(calcBank(lots), 130);
  assert.deepEqual(
    sortLotsByTotal(lots).map((l) => l.name),
    ['B', 'A', 'C']
  );
});

test('formatTimer and adjustTimer', () => {
  assert.deepEqual(formatTimer(600), { minutes: '10', seconds: '00', total: 600 });
  assert.deepEqual(formatTimer(65), { minutes: '01', seconds: '05', total: 65 });
  assert.equal(adjustTimer(120, -60), 60);
  assert.equal(adjustTimer(20, -60), 0);
});

test('wheel segments are weighted by bids', () => {
  const lots = [
    createLot({ id: 1, name: 'Rich', amount: 300 }),
    createLot({ id: 2, name: 'Poor', amount: 100 })
  ];
  const weighted = buildWheelSegments(lots, { weighted: true });
  assert.equal(weighted.length, 2);
  assert.ok(Math.abs(weighted[0].weight - 300) < 1e-9);
  assert.ok(Math.abs(weighted[1].weight - 100) < 1e-9);
  const fullCircle = weighted.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
  assert.ok(Math.abs(fullCircle - Math.PI * 2) < 1e-9);
  // Rich should own ~75% of the circle
  assert.ok((weighted[0].end - weighted[0].start) > (weighted[1].end - weighted[1].start));
});

test('wheel segments are equal when weighted=false', () => {
  const lots = [
    createLot({ id: 1, name: 'Rich', amount: 300 }),
    createLot({ id: 2, name: 'Poor', amount: 100 })
  ];
  const equal = buildWheelSegments(lots, { weighted: false });
  const a = equal[0].end - equal[0].start;
  const b = equal[1].end - equal[1].start;
  assert.ok(Math.abs(a - b) < 1e-9);
});

test('pickWeightedIndex follows provided random stream', () => {
  const segments = buildWheelSegments(
    [
      createLot({ id: 1, name: 'A', amount: 100 }),
      createLot({ id: 2, name: 'B', amount: 100 })
    ],
    { weighted: true }
  );
  assert.equal(pickWeightedIndex(segments, () => 0.1), 0);
  assert.equal(pickWeightedIndex(segments, () => 0.9), 1);
  assert.equal(pickWeightedIndex([], () => 0.5), -1);
});

test('spinTargetRotation lands winner mid under pointer', () => {
  const segments = buildWheelSegments(
    [createLot({ id: 1, name: 'Only', amount: 10 })],
    { weighted: true }
  );
  const finalRot = spinTargetRotation({
    currentRotationDeg: 10,
    winnerMidRadians: segments[0].mid,
    extraTurns: 5,
    pointerDeg: -90
  });
  const midDeg = (segments[0].mid * 180) / Math.PI;
  const pointed = (((midDeg + finalRot) % 360) + 360) % 360;
  // Should be near 270 deg (same as -90)
  assert.ok(Math.abs(pointed - 270) < 0.01 || Math.abs(pointed) < 0.01);
});

test('getWheelLots ignores empty rows', () => {
  const lots = [
    { id: 1, name: '', totalBet: 0 },
    createLot({ id: 2, name: 'Ok', amount: 5 })
  ];
  assert.equal(getWheelLots(lots).length, 1);
});

