if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Pokemon-CP-list/service-worker.js');

  caches.keys().then((cacheNames) => {
    console.log(cacheNames);
    // cacheNames.forEach((cacheName) => {
    //   caches.delete(cacheName);
    // });
  });

}

window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);

const toJson = (d) => d.json();

// src: http://hackll.com/2015/11/19/debounce-and-throttle/
const throttle = (fn, threshhold = 250) => {
  let last;
  let timer;

  return function() {
    let context = this;
    let args = arguments;

    let now = +new Date();

    if (last && now < last + threshhold) {
      clearTimeout(timer);

      timer = setTimeout(() => {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  }
};

const updateIv = (iv = window.ctrl.iv) => {
  let percentage = ((iv.atk + iv.def + iv.sta) * 100 / 45).toFixed();
  elm.pmCtrlBox.style.setProperty('--iv-percentage', percentage);
};

const updateLv = (lv = window.ctrl.lv) => {
  let _cost = calcPowerCost(lv);
  // elm.pmCtrlBox.style.setProperty('--lv', lv);
  elm.pmCtrlBox.style.setProperty('--cost-candy', _cost.candy);
  elm.pmCtrlBox.style.setProperty('--cost-stardust', _cost.stardust);
};

const calPmData = (pm, iv = window.ctrl.iv, lv = window.ctrl.lv) => {
  let mFactor = levelMultiplier[lv];
  let ADS = (pm.atk + iv.atk) * Math.pow((pm.def + iv.def) * (pm.sta + iv.sta), 0.5);
  let total = ADS * Math.pow(mFactor, 2.0);
  return {
    cp: Math.max(10, Math.floor(total / 10)),
    hp: Math.max(10, Math.floor((pm.sta + iv.sta) * mFactor))
  };
};

window.elm = {
  root: document.documentElement,
  pmCtrlBox: $('.pmCtrlBox'),
  pmList: $('.pmList'),
  pmFilter: $('.pmFilter'),
  pmCustomStyle: $('.pmCustomStyle'),
  dialog: $('#dialog'),
  dialogLvCpSummary: $('#dialog .lv-cp summary'),
  dialogLvCpTbody: $('#dialog .lv-cp .tbody'),
  dialogLvCpIv100Summary: $('#dialog .lv-cp__iv100 summary'),
  dialogLvCpIv100Tbody: $('#dialog .lv-cp__iv100 .tbody'),
  dialogClose: $('.dialog__closeBtn'),
  'pmLv': $('#pmLv'),
  'pmLv--range': $('#pmLv--range'),
};

window.ctrl = {
  iv: { atk: 0, def: 0, sta: 0 },
  lv: elm.pmLv.value * 1,
};

['atk', 'def', 'sta'].forEach(i => {
  elm[`iv-${i}`] = $(`#iv-${i}`);
  elm[`iv-${i}--range`] = $(`#iv-${i}--range`);
  window.ctrl.iv[i] = elm[`iv-${i}`].value * 1;
});

// change data
elm.pmCtrlBox.addEventListener('input', (e) => {
  let _target = e.target;
  let { sync, update, type } = _target.dataset;
  updateInput({
    value: _target.value,
    sync,
    update,
    type,
  });
});

elm.pmCtrlBox.addEventListener('click', (e) => {
  if (e.target.dataset.ctrl) {
    let _target = e.target;
    let syncTarget = $$(`[data-sync="${e.target.dataset.ctrl}"]`)[0];
    let newValue = syncTarget.value * 1 + _target.value * 1;

    newValue = Math.min(Math.max(newValue, syncTarget.min), syncTarget.max);

    if (newValue === syncTarget.value * 1) {
      return;
    }

    updateInput({
      value: newValue,
      sync: _target.dataset.ctrl,
      update: _target.dataset.update,
      type: _target.dataset.type
    });
  }
});

const updateInput = ({ value, sync, update, type, target } = {}) => {
  if (sync) {
    [...$$(`[data-sync="${sync}"]`)]
      .filter(i => i !== target)
      .forEach(i => {
        i.value = value
      });
  }
  if (update === 'iv') {
    window.ctrl.iv[type] = value * 1;
    updateIv();
  } else if (update === 'lv') {
    window.ctrl.lv = value * 1;
    updateLv();
  }

  throttle(updatePmData, 500)();
};

setTimeout(() => {
  window.calcPowerCost = (lv = 40) => powerUp.reduce((sum, i) => {
    if (i.lv - lv >= 0) {
      sum.stardust += i.stardust;
      sum.candy += i.candy;
    }
    return sum;
  }, {stardust: 0, candy: 0});

  window.colCount = Number(window.getComputedStyle(document.documentElement).getPropertyValue('--sprite-grid-col'))

  let pmHtml = pms.map((pm, i) => {
    pm.isAlolan = /^Alolan/.test(pm.title_1);
    pm.idx = pm.number;
    pm.title_1 = pmsName[pm.number];
    pm.type = [
      pm.field_pokemon_type,
      pm.pokemon_class && pm.pokemon_class !== 'Normal' && 'Legendary',
      pm.isAlolan ? 'Alolan' : ''
    ].filter(Boolean).join(', ');

    let firstIndex = pms.findIndex(_pm => _pm.idx === pm.idx);

    if (firstIndex !== i) {
      let type = pm.title.match(/(\d+)\-(\w+)/)[2];
      pm.idx += `-${type}`;
      pm.title_1 += `-${type}`;
      pm.isotope = true;
    }

    ['atk', 'def', 'sta'].forEach(i => {
      pm[i] = pm[i] * 1;
    });
    return createPmHTML(pm);
  });
  elm.pmList.innerHTML += pmHtml.join('');

  // init sort-by value
  $('[name="sort-by"]').checked = true;

  initTypeFilter();
  initPokedexFilter();

  updateIv();
  updateLv();
  updatePmData();
  updatePokedexFilter();
});

const getTemplateHtml = (selector) => {
  return $(selector).innerHTML;
};

const createPmHTML = (pm) => {
  let index = pm.number - 1;
  let row = ~~(index / colCount);
  let col = index % colCount;
  let {cp, hp} = calPmData(pm);
  let typeHtml = pm.field_pokemon_type.split(', ').map(type => `<div class="pm_type pm_type--${type}"></div>`).join('');
  pm.hp = hp;
  pm.tank = pm.sta * pm.def;
  return `
    <li class="pm"
      data-type="${pm.type}"
      data-maxcp="${pm.cp}"
      data-alolan="${pm.isAlolan}"
      data-number="${pm.number}"
      style="
        --pm-pokedex: ${pm.number};
        --pm-idx: ${pm.idx};
        --pm-atk: ${pm.atk};
        --pm-def: ${pm.def};
        --pm-sta: ${pm.sta};
        --pm-tank: ${pm.tank};
        --pm-col: ${col};
        --pm-row: ${row};
        ${
          pm.isotope
           ? `--pm-special-bgi: url('./img/${pm.idx}.png');`
           : ''
        }
        --pm-cp: var(--pm-${pm.idx}-cp);
        --pm-hp: var(--pm-${pm.idx}-hp);"
    >
      <div class="pm_name" data-podex=${pm.number} title="${pm.title.match(/[^>]+\>([^<]+)/)[1]}">${pm.title_1}</div>
      <div class="pm_img"></div>
      <div class="pm_cp" data-max-cp=pm.cp></div>
      <div class="pm_info"
        data-type="${pm.field_pokemon_type}"
        data-hp="${hp}"
        data-atk="${pm.atk}"
        data-def="${pm.def}"
        data-sta="${pm.sta}"
      ></div>
      <div class="pm_types">${typeHtml}</div>
    </li>`;
};

const createFilter = () => {
  let types = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy', 'Legendary', 'Alolan'].sort();

  return types.reduce((obj, type) => {
    let _checkboxHtml = `<input type="checkbox" id="ck-${type}" value="${type}" class="pmFilter__checkbox sr-only ck-${type}" ${type === 'Legendary' ? 'checked': ''}>`;

    let _labelHtml = `<label for="ck-${type}" class="pmFilter__label" style="--bgi: var(--type-bgi--${type}">${type}</label>`;

    obj.checkbox.push(_checkboxHtml);
    obj.label.push(_labelHtml);
    return obj;
  }, { checkbox: [], label: [] });
};

const initTypeFilter = () => {
  // filters
  let filterHtml = createFilter();
  elm.pmCtrlBox.insertAdjacentHTML('beforebegin', filterHtml.checkbox.join(''));
  elm.pmFilter.innerHTML = getTemplateHtml('.pmFilter__header--temp') + filterHtml.label.join('');
  elm.pmFilter.addEventListener('click', (e) => {
    if (e.target.dataset.hook === 'js') {
      e.preventDefault();
      updataTypeChecbox(e.target.dataset.type === 'none' ? false : true);
    }
  });
  elm.pmTypeCheckboxs = $$('.pmFilter__checkbox');
};

const initPokedexFilter = () => {
  elm.pmCtrlBox.insertAdjacentHTML('beforeend', getTemplateHtml('.pokedexRange--temp'));

  elm.pokedexRange = $('.pokedexRange');
  elm.pokedexRange1 = $('#pokedexRange1');
  elm.pokedexRange2 = $('#pokedexRange2');
  elm.pokedexRangeStyle = $('style');
  elm.pokedexRange.addEventListener('input', updatePokedexFilter);

  // init pokedex filter value
  elm.pokedexRange1.value = elm.pokedexRange1.min;
  elm.pokedexRange1.max = pms.length;
  elm.pokedexRange2.max = pms.length;
  elm.pokedexRange2.value = pms.length;
};

const updatePokedexFilter = () => {
  let pokedexFilter = [
    elm.pokedexRange1.value,
    elm.pokedexRange2.value
  ].map(Number);
  let _pokedex = [...pokedexFilter].sort((a, b) => a - b);
  elm.pokedexRangeStyle.textContent = `
    .pokedexRange {
      --pokedex-range1: ${pokedexFilter[0]};
      --pokedex-range2: ${pokedexFilter[1]};
    }

    .pm:not(:nth-of-type(n + ${_pokedex[0]})),
    .pm:nth-of-type(n + ${_pokedex[1] + 1}) {
      display: none!important;
    }
  `;
};

const updataTypeChecbox = (value) => {
  elm.pmTypeCheckboxs.forEach(checkbox => {
    checkbox.checked = value;
  });
};

const updatePmData = () => {
  let data = pms.map(pm => {
    let {cp, hp} = calPmData(pm);
    return `--pm-${pm.idx}-cp: ${cp}; --pm-${pm.idx}-hp: ${hp};`
  });

  elm.pmCustomStyle.textContent = `.pmList {${data.join(' ')}}`;
};

const getIVCPList = (pm, lv = window.ctrl.lv) => {
  let ivs = [10, 11, 12, 13, 14, 15];
  // src: https://stackoverflow.com/a/15030117
  let flatten = (arr) => {
    return arr.reduce((flat, toFlatten) => {
      return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
  };
  let round = (number) => Math.round(number * 100);
  const IV_LIST = flatten(
    ivs.map(atk =>
      ivs.map(def =>
        ivs.map(sta => ({ atk, def, sta, iv: round((atk + def + sta) / 45) }))
      )
    )
  );
  let cpList = IV_LIST.map(iv => {
    return {
      ...iv,
      ...calPmData(pm, iv, lv)
    };
  });
  cpList.sort((a, b) => {
    let cpDelta = b.cp - a.cp;
    let atkDelta = b.atk - a.atk;
    let defDelta = b.def - a.def;
    let staDelta = b.sta - a.sta;
    return cpDelta
            ? cpDelta
            : atkDelta
              ? atkDelta
              : defDelta
                ? defDelta
                : staDelta;
  });
  window.cpList = cpList;
  return cpList;
};

const pollNewData = (url = 'https://s3.us-east-2.amazonaws.com/gamepress-json/pogo/pokemon-list/en.json') => {
  fetch(url)
  .then(toJson)
  .then(newPms => {
    let diffPms = newPms.filter((pm, index) => {
      let isDiff = (
        pm.atk != pms[index].atk ||
        pm.def != pms[index].def ||
        pm.sta != pms[index].sta
      );
      if (isDiff) {
        pms[index].atk = pm.atk * 1;
        pms[index].def = pm.def * 1;
        pms[index].sta = pm.sta * 1;
      }
      return isDiff;
    });
    console.log({newPms, diffPms});
  });
};

elm.pmList.addEventListener('click', (e) => {
  let target = e.target;
  if (!target.classList.contains('pm_info')) {
    return;
  }
  let pmDom = target.closest('.pm');

  if (!pmDom) { return; }

  let pokedex = +pmDom.style.getPropertyValue('--pm-pokedex');
  let maxcp = +pmDom.dataset.maxcp;
  let pmData = pms.find((pm) => +pm.number === pokedex && +pm.cp === maxcp)

  if (!pmData) { return; }

  let cpList = getIVCPList(pmData);

  elm.dialogLvCpSummary.innerText = `${pmData.title_1} LV:${window.ctrl.lv} CP list`;
  elm.dialogLvCpTbody.innerHTML = cpList.map(i => `
    <div class="tr">
      <div>${i.cp}</div>
      <div>${i.atk}</div>
      <div>${i.def}</div>
      <div>${i.sta}</div>
      <div>${i.iv}%</div>
      <div>${i.hp}</div>
    </div>
  `).join('');


  let _100data = Array.apply(null, {length: 40})
  .map((i, v) => {
    return {
      ...calPmData(
        pmData,
        { def: 15, atk: 15, sta: 15},
        v + 1
      ), lv: v + 1};
  });

  elm.dialogLvCpIv100Summary.innerText = `${pmData.title_1} IV100 Lv & CP`;
  elm.dialogLvCpIv100Tbody.innerHTML = _100data.map(i => `
    <div class="tr">
      <div>${i.lv}</div>
      <div>${i.cp}</div>
      <div>${i.hp}</div>
    </div>
  `).join('');
  elm.dialog.setAttribute('aria-hidden', false);
});

elm.dialogClose.addEventListener('click', () => {
  elm.dialog.setAttribute('aria-hidden', true);
});
