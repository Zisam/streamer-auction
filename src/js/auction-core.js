/**
 * Pure auction + roulette helpers (no DOM).
 * Used by the UI and by Node unit tests.
 */

export function parseAmount(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : NaN;
}

export function isValidBid(value) {
  const n = parseAmount(value);
  return !Number.isNaN(n) && n > 0;
}

export function createLot({ id, name, amount }) {
  const bid = parseAmount(amount);
  if (!isValidBid(bid)) {
    throw new Error('Bid must be a positive number');
  }
  return {
    id,
    name: (name || '').trim() || '—',
    totalBet: bid,
    lastBet: bid
  };
}

export function applyBidToLot(lot, { name, amount }) {
  const bid = parseAmount(amount);
  if (!isValidBid(bid)) {
    throw new Error('Bid must be a positive number');
  }
  const nextName = (name || '').trim();
  return {
    ...lot,
    name: nextName || lot.name || '—',
    lastBet: bid,
    totalBet: (parseAmount(lot.totalBet) || 0) + bid
  };
}

export function sortLotsByTotal(lots) {
  return [...lots].sort((a, b) => (parseAmount(b.totalBet) || 0) - (parseAmount(a.totalBet) || 0));
}

export function calcBank(lots) {
  return lots.reduce((sum, lot) => sum + (parseAmount(lot.totalBet) || 0), 0);
}

export function formatTimer(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return {
    minutes: min < 10 ? `0${min}` : String(min),
    seconds: sec < 10 ? `0${sec}` : String(sec),
    total: safe
  };
}

export function adjustTimer(currentSeconds, deltaSeconds) {
  return Math.max(0, (Number(currentSeconds) || 0) + (Number(deltaSeconds) || 0));
}

export function getWheelLots(lots) {
  return lots.filter((lot) => (lot.name || '').trim() || (parseAmount(lot.totalBet) || 0) > 0);
}

export function buildWheelSegments(lots, { weighted = true, colors = ['#6e1c2c', '#8a6528'] } = {}) {
  const entries = getWheelLots(lots);
  if (!entries.length) return [];

  const totalWeight = entries.reduce((sum, lot) => {
    const bid = parseAmount(lot.totalBet) || 0;
    return sum + (weighted ? Math.max(bid, 0.0001) : 1);
  }, 0);

  let angle = -Math.PI / 2;
  return entries.map((lot, index) => {
    const bid = parseAmount(lot.totalBet) || 0;
    const weight = weighted ? Math.max(bid, 0.0001) : 1;
    const sweep = (weight / totalWeight) * Math.PI * 2;
    const segment = {
      id: lot.id,
      name: (lot.name || '—').trim() || '—',
      bid,
      weight,
      start: angle,
      end: angle + sweep,
      mid: angle + sweep / 2,
      color: colors[index % colors.length]
    };
    angle += sweep;
    return segment;
  });
}

/**
 * Pick a segment index using a provided random value in [0, 1).
 * Passing `random` keeps the function deterministic in tests.
 */
export function pickWeightedIndex(segments, random = Math.random) {
  if (!segments.length) return -1;
  const total = segments.reduce((sum, seg) => sum + seg.weight, 0);
  let cursor = random() * total;
  for (let i = 0; i < segments.length; i++) {
    cursor -= segments[i].weight;
    if (cursor <= 0) return i;
  }
  return segments.length - 1;
}

export function spinTargetRotation({
  currentRotationDeg,
  winnerMidRadians,
  extraTurns = 6,
  pointerDeg = -90
}) {
  const midDeg = (winnerMidRadians * 180) / Math.PI;
  const targetMod = ((pointerDeg - midDeg) % 360 + 360) % 360;
  const currentMod = ((currentRotationDeg % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;
  return currentRotationDeg + extraTurns * 360 + delta;
}

export function cloneLots(lots) {
  return lots.map((lot) => ({ ...lot }));
}
