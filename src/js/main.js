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
// const MSEC_DOM = document.querySelector('[mseconds]');

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

const startTimer = (seconds) => {
  const NOW = Date.now();
  const THEN = NOW + seconds * 1000;
  displayTimer(seconds);

  countdown = setInterval(() => {
    const SECONDS_LEFT = Math.round((THEN - Date.now()) / 1000);
    if (SECONDS_LEFT < 0) {
      clearInterval(countdown);
      START_STOP_BTN.classList.remove('auc__start--stop');
      return;
    }
    displayTimer(SECONDS_LEFT);
  }, 10);
};

const displayTimer = (seconds) => {
  secondsGlobal = seconds;
  window.localStorage.setItem('timer', seconds);
  const MIN = Math.floor(seconds / 60);
  const SEC = seconds % 60;
  MIN < 10 ? MIN_DOM.innerHTML = '0' + MIN : MIN_DOM.innerHTML = MIN;
  SEC < 10 ? SEC_DOM.innerHTML = '0' + SEC : SEC_DOM.innerHTML = SEC;
  // MSEC < 100 ? MSEC_DOM.innerHTML = '' + MSEC : MSEC_DOM.innerHTML = MSEC;
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
  LOTS_DOM.insertAdjacentHTML('beforeend',
    `<div class="auc__item"><input class="auc__lot" type="text" title="ロット名 / Lot name" placeholder="名前 / Name"><input class="auc__total-sum"
    type="text" inputmode="decimal" oninput="this.value=this.value.replace(/[^0-9.]/g,'');" title="合計 / Total" placeholder="合計"><input
    class="auc__current-sum" type="text" inputmode="decimal" oninput="this.value=this.value.replace(/[^0-9.]/g,'');"
    title="入札額 / Bid" placeholder="入札"><button class="auc__add-sum" add-sum title="加算 / Add bid"><svg class="auc__icon">
      <use xlink:href="img/sprite.svg#plus"></use>
    </svg></button></div>`
  );
  eventListenerAdding();
};

const sortLots = (arr) => {
  arr.sort((a, b) => {
    return b.totalBet - a.totalBet;
  });
};

const displayLots = (arr) => {
  const ARR_LENGTH = arr.length;
  let lotsItemDOM = document.querySelectorAll('.auc__item');
  let lotsItemDOMLength = lotsItemDOM.length;

  if (ARR_LENGTH > lotsItemDOMLength) {
    for (let i = 0; i < ARR_LENGTH - lotsItemDOMLength; i++) {
      addLot();
    }
    lotsItemDOM = document.querySelectorAll('.auc__item');
    lotsItemDOMLength = lotsItemDOM.length;
  }

  for (let i = 0; i < lotsItemDOMLength; i++) {
    lotsItemDOM[i].childNodes[0].value = '';
    lotsItemDOM[i].childNodes[1].value = '';
    lotsItemDOM[i].childNodes[2].value = '';
    lotsItemDOM[i].childNodes[3].removeAttribute('id');
  }

  for (let i = 0; i < ARR_LENGTH; i++) {
    lotsItemDOM[i].childNodes[0].value = arr[i].name;
    lotsItemDOM[i].childNodes[1].value = arr[i].totalBet;
    lotsItemDOM[i].childNodes[3].setAttribute('id', arr[i].id);
  }

  TOTAL_DOM.innerText = '';
  TOTAL_DOM.innerText = arr.reduce((acc, el) => acc + parseFloat(el.totalBet), 0);

  checkLogBtnDisabling();
};

const lotArrayFill = (name, totalBet, lastBet) => {
  const LOT = {
    id: '',
    name: '',
    totalBet: 0,
    lastBet: 0
  };

  LOT.id = lotsId++;
  LOT.name = name;
  if (isNaN(parseFloat(totalBet))) {
    LOT.totalBet += parseFloat(lastBet);
  } else {
    LOT.totalBet = parseFloat(lastBet) + parseFloat(totalBet);
  }
  LOT.lastBet = parseFloat(lastBet);
  lotArray.push(LOT);
};

const lotArrayEdit = (idEd, name, totalBet, lastBet) => {
  const CURRENT_LOT = lotArray.find((el) => el.id === idEd);
  CURRENT_LOT.name = name;
  CURRENT_LOT.lastBet = parseFloat(lastBet);
  if (isNaN(parseFloat(totalBet))) {
    CURRENT_LOT.totalBet += parseFloat(lastBet);
  } else {
    CURRENT_LOT.totalBet = parseFloat(lastBet) + parseFloat(totalBet);
  }
};

const setLocalStorage = (lotArr, logArr) => {
  window.localStorage.setItem('lots', JSON.stringify(lotArr));
  lotArray = JSON.parse(window.localStorage.getItem('lots'));

  window.localStorage.setItem('logs', JSON.stringify(logArr));
  logArray = JSON.parse(window.localStorage.getItem('logs'));
  window.localStorage.setItem('logsId', JSON.stringify(logArrayId));
  logArrayId = JSON.parse(window.localStorage.getItem('logsId'));

  window.localStorage.setItem('lotsId', JSON.stringify(lotsId));
  lotsId = JSON.parse(window.localStorage.getItem('lotsId'));
};

const readLocalStorage = () => {
  if (window.localStorage.getItem('lots') !== null) {
    lotArray = JSON.parse(window.localStorage.getItem('lots'));

    logArray = JSON.parse(window.localStorage.getItem('logs'));
    logArrayId = JSON.parse(window.localStorage.getItem('logsId'));
    console.log(logArray);

    lotsId = JSON.parse(window.localStorage.getItem('lotsId'));

    secondsGlobal = JSON.parse(window.localStorage.getItem('timer'));
    secondsGlobal > 0 ? setTimer() : setTimer(600);

    displayLots(lotArray);
  }
};

const setLog = (arr) => {
  const NEW_ARR = arr.slice();
  logArray.push(NEW_ARR);
  logArrayId = logArray.length - 1;
  console.log(logArray);
};

const logBack = () => {
  if (logArrayId > 0) {
    lotArray = logArray[--logArrayId].slice();
    console.log(lotArray);
    setLocalStorage(lotArray, logArray);
    displayLots(lotArray);
  }
};

const logForward = () => {
  if (logArrayId < logArray.length - 1) {
    lotArray = logArray[++logArrayId].slice();
    console.log(lotArray);
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

START_STOP_BTN.addEventListener('click', () => {
  if (secondsGlobal > 0 && !START_STOP_BTN.classList.contains('auc__start--stop')) {
    startTimer(secondsGlobal);
    START_STOP_BTN.classList.add('auc__start--stop');
  } else if (START_STOP_BTN.classList.contains('auc__start--stop')) {
    clearInterval(countdown);
    START_STOP_BTN.classList.remove('auc__start--stop');
  }
});

RESET_BTN.addEventListener('click', resetTimer);

PLUS_ONE_MIN_BTN.addEventListener('click', () => {
  setTimer(60);
});

PLUS_TWO_MIN_BTN.addEventListener('click', () => {
  setTimer(120);
});

EQUAL_TEN_MIN_BTN.addEventListener('click', () => {
  secondsGlobal = 0;
  setTimer(600);
});

MINUS_ONE_MIN_BTN.addEventListener('click', () => {
  secondsGlobal >= 60 ? setTimer(-60) : resetTimer();
});

ADD_LOT_BTN.addEventListener('click', addLot);

CLEAR_LOTS_BTN.addEventListener('click', () => {
  window.localStorage.clear();
  window.location.reload();
});

BACK_BTN.addEventListener('click', logBack);

FORWARD_BTN.addEventListener('click', logForward);

const eventListenerAdding = () => document.querySelectorAll('[add-sum]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const LOT_NAME_DOM = btn.parentElement.firstChild;
    const LOT_CUR_SUM_DOM = btn.previousSibling;
    const LOT_TOTAL_SUM_DOM = btn.parentElement.firstChild.nextSibling;

    if (!isNaN(parseFloat(LOT_CUR_SUM_DOM.value))) {
      if (!btn.hasAttribute('id')) {
        lotArrayFill(
          LOT_NAME_DOM.value,
          LOT_TOTAL_SUM_DOM.value,
          LOT_CUR_SUM_DOM.value
        );
      } else {
        lotArrayEdit(
          parseInt(btn.getAttribute('id')),
          LOT_NAME_DOM.value,
          LOT_TOTAL_SUM_DOM.value,
          LOT_CUR_SUM_DOM.value
        );
      }
      sortLots(lotArray);
      setLog(lotArray);
      setLocalStorage(lotArray, logArray);
      displayLots(lotArray);
    }
  });
});

setLog(lotArray);
readLocalStorage();
eventListenerAdding();
checkLogBtnDisabling();
