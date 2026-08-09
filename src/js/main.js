/* eslint-disable curly */
/* eslint-disable radix */
/* eslint-disable indent */
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
      setHelp('タイマー終了', 'Timer finished');
      return;
    }
    displayTimer(SECONDS_LEFT);
  }, 10);
};

const displayTimer = (seconds) => {
  secondsGlobal = Math.max(0, seconds);
  window.localStorage.setItem('timer', secondsGlobal);
  const MIN = Math.floor(secondsGlobal / 60);
  const SEC = secondsGlobal % 60;
  MIN_DOM.textContent = MIN < 10 ? '0' + MIN : String(MIN);
  SEC_DOM.textContent = SEC < 10 ? '0' + SEC : String(SEC);
};

const setTimer = (time = 0) => {
  if (!START_STOP_BTN.classList.contains('auc__start--stop') || !countdown) {
    secondsGlobal += time;
    displayTimer(secondsGlobal);
  } else {
    secondsGlobal += time;
    clearInterval(countdown);
    startTimer(secondsGlobal);
  }
};

const resetTimer = () => {
  START_STOP_BTN.classList.remove('auc__start--stop');
  secondsGlobal = 0;
  clearInterval(countdown);
  displayTimer(secondsGlobal);
};

const addLot = () => {
  LOTS_DOM.insertAdjacentHTML('beforeend', lotRowTemplate());
};

const sortLots = (arr) => {
  arr.sort((a, b) => b.totalBet - a.totalBet);
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

  for (let i = 0; i < lotsItemDOMLength; i++) {
    const item = lotsItemDOM[i];
    const nameInput = item.querySelector('.auc__lot');
    const totalInput = item.querySelector('.auc__total-sum');
    const bidInput = item.querySelector('.auc__current-sum');
    const addBtn = item.querySelector('[add-sum]');

    nameInput.value = '';
    totalInput.value = '';
    bidInput.value = '';
    addBtn.removeAttribute('data-lot-id');
    item.classList.remove('auc__item--first', 'auc__item--second');
  }

  for (let i = 0; i < ARR_LENGTH; i++) {
    const item = lotsItemDOM[i];
    item.querySelector('.auc__lot').value = arr[i].name;
    item.querySelector('.auc__total-sum').value = arr[i].totalBet;
    item.querySelector('[add-sum]').setAttribute('data-lot-id', String(arr[i].id));
    if (i === 0) item.classList.add('auc__item--first');
    if (i === 1) item.classList.add('auc__item--second');
  }

  const bank = arr.reduce((acc, el) => acc + (parseFloat(el.totalBet) || 0), 0);
  TOTAL_DOM.textContent = String(bank);
  checkLogBtnDisabling();
};

const lotArrayFill = (name, lastBet) => {
  const amount = parseFloat(lastBet);
  lotArray.push({
    id: lotsId++,
    name: name || '—',
    totalBet: amount,
    lastBet: amount
  });
};

const lotArrayEdit = (idEd, name, lastBet) => {
  const CURRENT_LOT = lotArray.find((el) => Number(el.id) === Number(idEd));
  if (!CURRENT_LOT) return;
  const amount = parseFloat(lastBet);
  CURRENT_LOT.name = name || CURRENT_LOT.name || '—';
  CURRENT_LOT.lastBet = amount;
  CURRENT_LOT.totalBet = (parseFloat(CURRENT_LOT.totalBet) || 0) + amount;
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
    displayTimer(600);
  }
};

const setLog = (arr) => {
  logArray.push(arr.map((lot) => ({ ...lot })));
  logArrayId = logArray.length - 1;
};

const logBack = () => {
  if (logArrayId > 0) {
    lotArray = logArray[--logArrayId].map((lot) => ({ ...lot }));
    setLocalStorage(lotArray, logArray);
    displayLots(lotArray);
  }
};

const logForward = () => {
  if (logArrayId < logArray.length - 1) {
    lotArray = logArray[++logArrayId].map((lot) => ({ ...lot }));
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
  const amount = parseFloat(bidInput.value);

  if (isNaN(amount) || amount <= 0) {
    flashField(bidInput);
    setHelp('右の欄に金額を入れて + を押す', 'Type an amount in the right field, then press +');
    return;
  }

  const lotId = addBtn.getAttribute('data-lot-id');
  if (lotId === null) {
    lotArrayFill(nameInput.value.trim(), amount);
  } else {
    lotArrayEdit(lotId, nameInput.value.trim(), amount);
  }

  sortLots(lotArray);
  setLog(lotArray);
  setLocalStorage(lotArray, logArray);
  displayLots(lotArray);
  setHelp('加算しました', 'Bid added to total & bank');
};

// Event delegation — one listener for all + buttons
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
  window.localStorage.clear();
  window.location.reload();
});

BACK_BTN.addEventListener('click', logBack);
FORWARD_BTN.addEventListener('click', logForward);

setLog(lotArray);
readLocalStorage();
checkLogBtnDisabling();
setHelp('名前 → 金額 → + でバンクに加算', 'Name → amount → + adds to bank');
