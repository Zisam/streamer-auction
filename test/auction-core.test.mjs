import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyBidToLot,
  adjustTimer,
  buildWheelSegments,
  calcBank,
  clearAuctionState,
  createInitialAuctionState,
  createLot,
  emptyRowValues,
  formatTimer,
  getWheelLots,
  isValidBid,
  nextLotIdFromLots,
  parseAmount,
  pickWeightedIndex,
  pushLog,
  redoLog,
  sortLotsByTotal,
  spinTargetRotation,
  undoLog
} from '../src/js/auction-core.mjs';

test('parseAmount and isValidBid', () => {
  assert.equal(parseAmount('12.5'), 12.5);
  assert.equal(parseAmount(' 7 '), 7);
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
  assert.throws(() => applyBidToLot(createLot({ id: 1, name: 'A', amount: 1 }), { amount: -1 }), /positive/);
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

test('clearAuctionState zeroes bank and lots (Clear / X button)', () => {
  const lots = [
    createLot({ id: 0, name: 'Alice', amount: 100 }),
    createLot({ id: 1, name: 'Bob', amount: 50 })
  ];
  assert.equal(calcBank(lots), 150);

  const cleared = clearAuctionState(600);
  assert.deepEqual(cleared.lots, []);
  assert.equal(calcBank(cleared.lots), 0);
  assert.equal(cleared.nextLotId, 0);
  assert.equal(cleared.bank, 0);
  assert.equal(cleared.timerSeconds, 600);
  assert.deepEqual(cleared.logs, [[]]);
  assert.equal(cleared.logIndex, 0);
});

test('emptyRowValues force Total to literal 0 after clear', () => {
  assert.deepEqual(emptyRowValues(), {
    name: '',
    total: '0',
    bid: ''
  });
});

test('createInitialAuctionState matches clearAuctionState', () => {
  assert.deepEqual(createInitialAuctionState(600), clearAuctionState(600));
});

test('nextLotIdFromLots continues after existing ids', () => {
  assert.equal(nextLotIdFromLots([]), 0);
  assert.equal(
    nextLotIdFromLots([
      createLot({ id: 2, name: 'A', amount: 1 }),
      createLot({ id: 5, name: 'B', amount: 1 })
    ]),
    6
  );
});

test('formatTimer and adjustTimer edge cases', () => {
  assert.deepEqual(formatTimer(600), { minutes: '10', seconds: '00', total: 600 });
  assert.deepEqual(formatTimer(65), { minutes: '01', seconds: '05', total: 65 });
  assert.deepEqual(formatTimer(0), { minutes: '00', seconds: '00', total: 0 });
  assert.deepEqual(formatTimer(-12), { minutes: '00', seconds: '00', total: 0 });
  assert.deepEqual(formatTimer(3599), { minutes: '59', seconds: '59', total: 3599 });
  assert.equal(adjustTimer(120, -60), 60);
  assert.equal(adjustTimer(20, -60), 0);
  assert.equal(adjustTimer(0, 600), 600);
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
  assert.ok((weighted[0].end - weighted[0].start) > (weighted[1].end - weighted[1].start));
});

test('wheel segments are equal when weighted=false', () => {
  const lots = [
    createLot({ id: 1, name: 'Rich', amount: 300 }),
    createLot({ id: 2, name: 'Poor', amount: 100 }),
    createLot({ id: 3, name: 'Mid', amount: 1 })
  ];
  const equal = buildWheelSegments(lots, { weighted: false });
  const sweeps = equal.map((seg) => seg.end - seg.start);
  assert.ok(Math.abs(sweeps[0] - sweeps[1]) < 1e-9);
  assert.ok(Math.abs(sweeps[1] - sweeps[2]) < 1e-9);
});

test('cleared lots produce no wheel sectors', () => {
  const cleared = clearAuctionState();
  assert.deepEqual(buildWheelSegments(cleared.lots, { weighted: true }), []);
  assert.equal(getWheelLots(cleared.lots).length, 0);
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
  assert.ok(Math.abs(pointed - 270) < 0.01 || Math.abs(pointed) < 0.01);
});

test('getWheelLots ignores empty rows', () => {
  const lots = [
    { id: 1, name: '', totalBet: 0 },
    createLot({ id: 2, name: 'Ok', amount: 5 })
  ];
  assert.equal(getWheelLots(lots).length, 1);
});

test('undo and redo restore lot snapshots', () => {
  let lots = [];
  let logs = [[]];
  let logIndex = 0;

  lots = [createLot({ id: 0, name: 'A', amount: 10 })];
  ({ logs, logIndex } = pushLog(logs, lots));
  assert.equal(calcBank(lots), 10);

  lots = sortLotsByTotal([
    ...lots,
    createLot({ id: 1, name: 'B', amount: 40 })
  ]);
  ({ logs, logIndex } = pushLog(logs, lots));
  assert.equal(calcBank(lots), 50);

  ({ lots, logIndex } = undoLog(logs, logIndex));
  assert.equal(calcBank(lots), 10);
  assert.deepEqual(lots.map((l) => l.name), ['A']);

  ({ lots, logIndex } = redoLog(logs, logIndex));
  assert.equal(calcBank(lots), 50);
  assert.deepEqual(lots.map((l) => l.name), ['B', 'A']);
});

test('undo at start stays put', () => {
  const logs = [[]];
  const result = undoLog(logs, 0);
  assert.equal(result.logIndex, 0);
  assert.deepEqual(result.lots, []);
});
