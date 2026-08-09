import {
  adjustTimer,
  applyBidToLot,
  buildWheelSegments,
  calcBank,
  clearAuctionState,
  cloneLots,
  createLot,
  emptyRowValues,
  formatTimer,
  getWheelLots,
  isValidBid,
  pickWeightedIndex,
  sortLotsByTotal,
  spinTargetRotation
} from './auction-core.mjs';

let countdown;
let secondsGlobal = 600;
let lotsId = 0;

let lotArray = [];

let logArray = [];
let logArrayId;

const MIN_DOM = document.querySelector('[minutes]');
const SEC_DOM = document.querySelector('[seconds]');

const START_STOP_BTN = document.querySelector('[start]');
const RESET_BTN = document.querySelector('[reset]');
const PLUS_ONE_MIN_BTN = document.querySelector('[plus-one-min]');
const PLUS_TWO_MIN_BTN = document.querySelector('[plus-two-min]');
const EQUAL_TEN_MIN_BTN = document.querySelector('[ten-min]');
const MINUS_ONE_MIN_BTN = document.querySelector('[minus-one-min]');
const BACK_BTN = document.querySelector('[auc-back]');
const FORWARD_BTN = document.querySelector('[auc-forward]');
const ADD_LOT_BTN = document.querySelector('[add-lot]');
const CLEAR_LOTS_BTN = document.querySelector('[clear]');
const LOTS_DOM = document.querySelector('.auc__lots-wrapper');
const TOTAL_DOM = document.querySelector('[total]');
const HELP_STATUS = document.querySelector('[help-status]');

const WHEEL_CANVAS = document.querySelector('[wheel-canvas]');
const WHEEL_RESULT = document.querySelector('[wheel-result]');
const WHEEL_SPIN_BTN = document.querySelector('[wheel-spin]');
const WHEEL_REFRESH_BTN = document.querySelector('[wheel-refresh]');
const WHEEL_WEIGHTED = document.querySelector('[wheel-weighted]');
const WHEEL_CTX = WHEEL_CANVAS ? WHEEL_CANVAS.getContext('2d') : null;

const WHEEL_COLORS = [
  '#6e1c2c', '#8a6528', '#1f4a32', '#3d2a4a',
  '#7a3b1e', '#2a4a5c', '#5c1424', '#4a3a18'
];

let wheelSegments = [];
let wheelRotationDeg = 0;
let wheelSpinning = false;
let wheelAnimFrame = 0;

const lotRowTemplate = () => (
  `<div class="auc__item">
    <input class="auc__lot" type="text" title="名前 / Name" placeholder="名前 / Name" autocomplete="off">
    <input class="auc__total-sum" type="text" inputmode="decimal" readonly tabindex="-1" title="合計（自動） / Total (auto)" placeholder="0">
    <input class="auc__current-sum" type="text" inputmode="decimal" title="今回の入札 / Bid to add" placeholder="+金額 / Amount" autocomplete="off">
    <button class="auc__add-sum" type="button" add-sum title="合計に加算 / Add to total">
      <svg class="auc__icon" aria-hidden="true"><use xlink:href="img/sprite.svg#plus"></use></svg>
    </button>
  </div>`
);

const setHelp = (ja, en) => {
  if (!HELP_STATUS) return;
  HELP_STATUS.innerHTML = `<span class="auc__help-ja">${ja}</span><span class="auc__help-en">${en}</span>`;
};

const flashField = (el) => {
  if (!el) return;
  el.classList.add('auc__field--flash');
  el.focus();
  window.setTimeout(() => el.classList.remove('auc__field--flash'), 700);
};

const startTimer = (seconds) => {
  const NOW = Date.now();
  const THEN = NOW + seconds * 1000;
  displayTimer(seconds);

  countdown = setInterval(() => {
    const SECONDS_LEFT = Math.round((THEN - Date.now()) / 1000);
    if (SECONDS_LEFT < 0) {
      clearInterval(countdown);
      START_STOP_BTN.classList.remove('auc__start--stop');
      setHelp('タイマー終了 → ルーレットへ', 'Timer done → spin the roulette');
      return;
    }
    displayTimer(SECONDS_LEFT);
  }, 10);
};

const displayTimer = (seconds) => {
  const formatted = formatTimer(seconds);
  secondsGlobal = formatted.total;
  window.localStorage.setItem('timer', secondsGlobal);
  MIN_DOM.textContent = formatted.minutes;
  SEC_DOM.textContent = formatted.seconds;
};

const setTimer = (time = 0) => {
  if (!START_STOP_BTN.classList.contains('auc__start--stop') || !countdown) {
    displayTimer(adjustTimer(secondsGlobal, time));
  } else {
    clearInterval(countdown);
    startTimer(adjustTimer(secondsGlobal, time));
  }
};

const resetTimer = () => {
  START_STOP_BTN.classList.remove('auc__start--stop');
  clearInterval(countdown);
  displayTimer(0);
};

const addLot = () => {
  LOTS_DOM.insertAdjacentHTML('beforeend', lotRowTemplate());
};

const displayLots = (arr) => {
  const ARR_LENGTH = arr.length;
  let lotsItemDOM = document.querySelectorAll('.auc__item');
  let lotsItemDOMLength = lotsItemDOM.length;

  while (ARR_LENGTH > lotsItemDOMLength) {
    addLot();
    lotsItemDOM = document.querySelectorAll('.auc__item');
    lotsItemDOMLength = lotsItemDOM.length;
  }

  const empty = emptyRowValues();

  for (let i = 0; i < lotsItemDOMLength; i++) {
    const item = lotsItemDOM[i];
    item.querySelector('.auc__lot').value = empty.name;
    item.querySelector('.auc__total-sum').value = empty.total;
    item.querySelector('.auc__current-sum').value = empty.bid;
    item.querySelector('[add-sum]').removeAttribute('data-lot-id');
    item.classList.remove('auc__item--first', 'auc__item--second');
  }

  for (let i = 0; i < ARR_LENGTH; i++) {
    const item = lotsItemDOM[i];
    item.querySelector('.auc__lot').value = arr[i].name;
    item.querySelector('.auc__total-sum').value = String(arr[i].totalBet);
    item.querySelector('[add-sum]').setAttribute('data-lot-id', String(arr[i].id));
    if (i === 0) item.classList.add('auc__item--first');
    if (i === 1) item.classList.add('auc__item--second');
  }

  TOTAL_DOM.textContent = String(calcBank(arr));
  checkLogBtnDisabling();
  rebuildWheel();
};

const lotArrayFill = (name, lastBet) => {
  lotArray.push(createLot({ id: lotsId++, name, amount: lastBet }));
};

const lotArrayEdit = (idEd, name, lastBet) => {
  const index = lotArray.findIndex((el) => Number(el.id) === Number(idEd));
  if (index < 0) return;
  lotArray[index] = applyBidToLot(lotArray[index], { name, amount: lastBet });
};

const setLocalStorage = (lotArr, logArr) => {
  window.localStorage.setItem('lots', JSON.stringify(lotArr));
  window.localStorage.setItem('logs', JSON.stringify(logArr));
  window.localStorage.setItem('logsId', JSON.stringify(logArrayId));
  window.localStorage.setItem('lotsId', JSON.stringify(lotsId));
  lotArray = JSON.parse(window.localStorage.getItem('lots'));
  logArray = JSON.parse(window.localStorage.getItem('logs'));
  logArrayId = JSON.parse(window.localStorage.getItem('logsId'));
  lotsId = JSON.parse(window.localStorage.getItem('lotsId'));
};

const readLocalStorage = () => {
  if (window.localStorage.getItem('lots') !== null) {
    lotArray = JSON.parse(window.localStorage.getItem('lots')) || [];
    logArray = JSON.parse(window.localStorage.getItem('logs')) || [];
    logArrayId = JSON.parse(window.localStorage.getItem('logsId'));
    lotsId = JSON.parse(window.localStorage.getItem('lotsId')) || 0;

    const savedTimer = JSON.parse(window.localStorage.getItem('timer'));
    secondsGlobal = typeof savedTimer === 'number' ? savedTimer : 600;
    displayTimer(secondsGlobal > 0 ? secondsGlobal : 600);
    displayLots(lotArray);
  } else {
    const initial = clearAuctionState(600);
    lotArray = initial.lots;
    logArray = initial.logs;
    logArrayId = initial.logIndex;
    lotsId = initial.nextLotId;
    displayTimer(initial.timerSeconds);
    displayLots(lotArray);
  }
};

const setLog = (arr) => {
  logArray.push(cloneLots(arr));
  logArrayId = logArray.length - 1;
};

const logBack = () => {
  if (logArrayId > 0) {
    lotArray = cloneLots(logArray[--logArrayId]);
    setLocalStorage(lotArray, logArray);
    displayLots(lotArray);
  }
};

const logForward = () => {
  if (logArrayId < logArray.length - 1) {
    lotArray = cloneLots(logArray[++logArrayId]);
    setLocalStorage(lotArray, logArray);
    displayLots(lotArray);
  }
};

const checkLogBtnDisabling = () => {
  const LOG_ARRAY_LENGTH = logArray.length;

  if (LOG_ARRAY_LENGTH > 1) {
    if (logArrayId === 0) {
      FORWARD_BTN.classList.remove('auc__edit--disabled');
      BACK_BTN.classList.add('auc__edit--disabled');
    } else if (logArrayId === LOG_ARRAY_LENGTH - 1) {
      FORWARD_BTN.classList.add('auc__edit--disabled');
      BACK_BTN.classList.remove('auc__edit--disabled');
    } else {
      FORWARD_BTN.classList.remove('auc__edit--disabled');
      BACK_BTN.classList.remove('auc__edit--disabled');
    }
  } else {
    FORWARD_BTN.classList.add('auc__edit--disabled');
    BACK_BTN.classList.add('auc__edit--disabled');
  }
};

const applyBidFromRow = (item) => {
  const nameInput = item.querySelector('.auc__lot');
  const bidInput = item.querySelector('.auc__current-sum');
  const addBtn = item.querySelector('[add-sum]');

  if (!isValidBid(bidInput.value)) {
    flashField(bidInput);
    setHelp('右の欄に金額を入れて + を押す', 'Type an amount in the right field, then press +');
    return;
  }

  const lotId = addBtn.getAttribute('data-lot-id');
  if (lotId === null) {
    lotArrayFill(nameInput.value.trim(), bidInput.value);
  } else {
    lotArrayEdit(lotId, nameInput.value.trim(), bidInput.value);
  }

  lotArray = sortLotsByTotal(lotArray);
  setLog(lotArray);
  setLocalStorage(lotArray, logArray);
  displayLots(lotArray);
  setHelp('加算しました（ルーレット更新）', 'Bid added (roulette updated)');
};

const drawWheel = (rotationDeg = wheelRotationDeg) => {
  if (!WHEEL_CTX || !WHEEL_CANVAS) return;
  const size = WHEEL_CANVAS.width;
  const radius = size / 2;
  const ctx = WHEEL_CTX;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate((rotationDeg * Math.PI) / 180);

  if (!wheelSegments.length) {
    ctx.beginPath();
    ctx.fillStyle = '#1a1014';
    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a89888';
    ctx.font = '22px "Shippori Mincho", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ロットなし', 0, -8);
    ctx.font = '16px "Cormorant Garamond", serif';
    ctx.fillText('No lots yet', 0, 18);
    ctx.restore();
    return;
  }

  wheelSegments.forEach((seg) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 2, seg.start, seg.end);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(240, 215, 138, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const labelAngle = seg.mid;
    const labelRadius = radius * 0.62;
    ctx.save();
    ctx.rotate(labelAngle);
    ctx.translate(labelRadius, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#f0e6d8';
    ctx.font = 'bold 16px "Shippori Mincho", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = seg.name.length > 8 ? seg.name.slice(0, 8) + '…' : seg.name;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#0b090a';
  ctx.fill();
  ctx.strokeStyle = '#f0d78a';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
};

const setWheelResult = (text, isWin) => {
  if (!WHEEL_RESULT) return;
  WHEEL_RESULT.textContent = text;
  WHEEL_RESULT.classList.toggle('wheel__result--win', !!isWin);
};

const rebuildWheel = () => {
  if (wheelSpinning) return;
  const weighted = !!(WHEEL_WEIGHTED && WHEEL_WEIGHTED.checked);
  wheelSegments = buildWheelSegments(getWheelLots(lotArray), {
    weighted,
    colors: WHEEL_COLORS
  });
  drawWheel(wheelRotationDeg);
  if (!wheelSegments.length) {
    setWheelResult('—');
  } else if (!WHEEL_RESULT.classList.contains('wheel__result--win')) {
    setWheelResult(`${wheelSegments.length} sectors`);
  }
};

const spinWheel = () => {
  if (wheelSpinning) return;
  const weighted = !!(WHEEL_WEIGHTED && WHEEL_WEIGHTED.checked);
  wheelSegments = buildWheelSegments(getWheelLots(lotArray), {
    weighted,
    colors: WHEEL_COLORS
  });
  if (!wheelSegments.length) {
    setHelp('先にロットを追加してからスピン', 'Add lots before spinning');
    setWheelResult('No lots');
    drawWheel(wheelRotationDeg);
    return;
  }

  const winnerIndex = pickWeightedIndex(wheelSegments);
  const winner = wheelSegments[winnerIndex];
  const extraTurns = 5 + Math.floor(Math.random() * 3);
  const finalRotation = spinTargetRotation({
    currentRotationDeg: wheelRotationDeg,
    winnerMidRadians: winner.mid,
    extraTurns
  });

  wheelSpinning = true;
  if (WHEEL_SPIN_BTN) WHEEL_SPIN_BTN.disabled = true;
  if (WHEEL_REFRESH_BTN) WHEEL_REFRESH_BTN.disabled = true;
  setWheelResult('…');
  setHelp('ルーレット回転中', 'Roulette spinning');

  const start = performance.now();
  const duration = 4500;
  const from = wheelRotationDeg;
  const change = finalRotation - from;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    wheelRotationDeg = from + change * easeOutCubic(t);
    drawWheel(wheelRotationDeg);
    if (t < 1) {
      wheelAnimFrame = requestAnimationFrame(tick);
      return;
    }
    wheelRotationDeg = finalRotation;
    drawWheel(wheelRotationDeg);
    wheelSpinning = false;
    if (WHEEL_SPIN_BTN) WHEEL_SPIN_BTN.disabled = false;
    if (WHEEL_REFRESH_BTN) WHEEL_REFRESH_BTN.disabled = false;
    setWheelResult(`★ ${winner.name} (${winner.bid})`, true);
    setHelp(`当選: ${winner.name}`, `Winner: ${winner.name}`);
  };

  cancelAnimationFrame(wheelAnimFrame);
  wheelAnimFrame = requestAnimationFrame(tick);
};

LOTS_DOM.addEventListener('click', (event) => {
  const btn = event.target.closest('[add-sum]');
  if (!btn || !LOTS_DOM.contains(btn)) return;
  event.preventDefault();
  applyBidFromRow(btn.closest('.auc__item'));
});

LOTS_DOM.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const bidInput = event.target.closest('.auc__current-sum');
  if (!bidInput) return;
  event.preventDefault();
  applyBidFromRow(bidInput.closest('.auc__item'));
});

START_STOP_BTN.addEventListener('click', () => {
  if (secondsGlobal > 0 && !START_STOP_BTN.classList.contains('auc__start--stop')) {
    startTimer(secondsGlobal);
    START_STOP_BTN.classList.add('auc__start--stop');
    setHelp('カウントダウン中（停止で一時停止）', 'Countdown running (press again to pause)');
  } else if (START_STOP_BTN.classList.contains('auc__start--stop')) {
    clearInterval(countdown);
    START_STOP_BTN.classList.remove('auc__start--stop');
    setHelp('タイマー一時停止', 'Timer paused');
  } else {
    setHelp('先に時間を設定（+1 / =10）', 'Set time first (+1 / =10)');
  }
});

RESET_BTN.addEventListener('click', () => {
  resetTimer();
  setHelp('タイマーをリセット', 'Timer reset');
});

PLUS_ONE_MIN_BTN.addEventListener('click', () => setTimer(60));
PLUS_TWO_MIN_BTN.addEventListener('click', () => setTimer(120));
EQUAL_TEN_MIN_BTN.addEventListener('click', () => {
  secondsGlobal = 0;
  setTimer(600);
});
MINUS_ONE_MIN_BTN.addEventListener('click', () => {
  secondsGlobal >= 60 ? setTimer(-60) : resetTimer();
});

ADD_LOT_BTN.addEventListener('click', () => {
  addLot();
  setHelp('行を追加しました', 'Row added');
});

CLEAR_LOTS_BTN.addEventListener('click', () => {
  if (!window.confirm('データを全部消しますか？ / Clear all data?')) return;

  // Reset in place (do not rely on reload — browsers may restore form values).
  const initial = clearAuctionState(600);
  lotArray = initial.lots;
  logArray = initial.logs;
  logArrayId = initial.logIndex;
  lotsId = initial.nextLotId;
  wheelRotationDeg = 0;
  wheelSpinning = false;
  if (WHEEL_RESULT) WHEEL_RESULT.classList.remove('wheel__result--win');

  window.localStorage.clear();
  displayTimer(initial.timerSeconds);
  displayLots(lotArray);
  setWheelResult('—');
  setHelp('データをクリアしました', 'All data cleared');
});

BACK_BTN.addEventListener('click', logBack);
FORWARD_BTN.addEventListener('click', logForward);

if (WHEEL_SPIN_BTN) WHEEL_SPIN_BTN.addEventListener('click', spinWheel);
if (WHEEL_REFRESH_BTN) {
  WHEEL_REFRESH_BTN.addEventListener('click', () => {
    if (wheelSpinning) return;
    WHEEL_RESULT.classList.remove('wheel__result--win');
    rebuildWheel();
    setHelp('ルーレットを更新', 'Roulette rebuilt from lots');
  });
}
if (WHEEL_WEIGHTED) {
  WHEEL_WEIGHTED.addEventListener('change', () => {
    if (wheelSpinning) return;
    WHEEL_RESULT.classList.remove('wheel__result--win');
    rebuildWheel();
  });
}

setLog(lotArray);
readLocalStorage();
checkLogBtnDisabling();
setHelp('名前 → 金額 → +、その後スピン', 'Name → amount → +, then spin');

