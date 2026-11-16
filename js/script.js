/* Приход Архистратига Божия Михаила, г. Туапсе */
(function () {
  'use strict';

  /* Ближайший праздник и сколько дней до него.
     Месяцы считаются с нуля: 10 = ноябрь, 8 = сентябрь. Даты по новому стилю. */
  var feasts = [
    { m: 10, d: 21, name: 'Собор Архистратига Михаила', label: '21 ноября' },
    { m: 8, d: 19, name: 'Чудо Архистратига Михаила в Хонех', label: '19 сентября' }
  ];

  function dayWord(n) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'день';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'дня';
    return 'дней';
  }

  /* Текущее время по Москве: расписание не зависит от часового пояса посетителя.
     Если браузер не умеет считать пояса, берётся время устройства. */
  function moscowNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Moscow', hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).formatToParts(new Date());
      var v = {};
      parts.forEach(function (p) { v[p.type] = parseInt(p.value, 10); });
      return new Date(v.year, v.month - 1, v.day, v.hour % 24, v.minute);
    } catch (e) { return new Date(); }
  }

  var now = moscowNow();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var todayIso = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var nowMin = now.getHours() * 60 + now.getMinutes();

  /* ---------- Расписание: показываем только то, что ещё не прошло ----------
     Данные лежат на странице в блоке <script id="sched-data">. Служба считается
     прошедшей через GRACE_HOURS часов после начала. Поменяйте число, если нужно иначе. */
  var GRACE_HOURS = 2;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function toMin(t) { var p = t.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }

  function loadSchedule() {
    var node = document.getElementById('sched-data');
    if (!node) return null;
    try { var data = JSON.parse(node.textContent); } catch (e) { return null; }
    var days = [];
    data.days.forEach(function (day) {
      if (day.iso < todayIso) return;
      var last = null, rows = [];
      day.rows.forEach(function (r) {
        var t = r.t || last;
        if (r.t) last = r.t;
        if (day.iso === todayIso && t && toMin(t) + GRACE_HOURS * 60 <= nowMin) return;
        /* строка без времени, например «служба отменена», это объявление, а не служба */
        rows.push({ t: r.t || null, tShown: t, tr: r.tr, s: r.s, note: r.note, notice: !t });
      });
      /* если у первой оставшейся строки время унаследовано, показываем его явно */
      if (rows.length && !rows[0].t && rows[0].tShown) rows[0].t = rows[0].tShown;
      if (rows.length) days.push({ iso: day.iso, d: day.d, w: day.w, red: day.red, rows: rows });
    });
    return { days: days, notes: data.notes };
  }

  function svcSpans(parts) {
    var frag = document.createDocumentFragment();
    parts.forEach(function (p) { frag.appendChild(el('span', 'ln' + (p[1] ? ' s-' + p[1] : ''), p[0])); });
    return frag;
  }

  function buildTable(sch) {
    var flat = [];
    sch.days.forEach(function (d) { d.rows.forEach(function (r) { flat.push(r); }); });
    var noteSpan = {}, i = 0;
    while (i < flat.length) {
      var id = flat[i].note;
      if (id) { var j = i; while (j + 1 < flat.length && flat[j + 1].note === id) j++; noteSpan[i] = j - i + 1; i = j + 1; }
      else i++;
    }
    var wrap = el('div', 'sched-wrap frame');
    var table = el('table', 'sched');
    var cg = el('colgroup');
    ['c-date', 'c-time', 'c-svc', 'c-note'].forEach(function (c) { cg.appendChild(el('col', c)); });
    table.appendChild(cg);
    var thead = el('thead'), htr = el('tr');
    ['Дата', 'Время', 'Богослужение', 'Память и праздник'].forEach(function (h) {
      var th = el('th', null, h); th.scope = 'col'; htr.appendChild(th);
    });
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = el('tbody'), idx = 0;
    sch.days.forEach(function (day) {
      var timeCell = null;
      day.rows.forEach(function (row, ri) {
        var tr = el('tr');
        if (ri === 0) {
          var th = el('th', 'd' + (day.red ? ' red' : '')); th.scope = 'row';
          th.rowSpan = day.rows.length; th.setAttribute('data-date', day.iso);
          th.appendChild(el('span', 'dn', day.d)); th.appendChild(el('span', 'dw', day.w));
          tr.appendChild(th);
        }
        if (row.t) {
          timeCell = el('td', 't' + (row.tr ? ' tr' : ''), row.t); tr.appendChild(timeCell);
        } else if (timeCell) {
          timeCell.rowSpan = (timeCell.rowSpan || 1) + 1;
        } else { tr.appendChild(el('td', 't')); }
        var hasNote = !!row.note;
        var sc = el('td', 's'); if (!hasNote) sc.colSpan = 2;
        sc.appendChild(svcSpans(row.s)); tr.appendChild(sc);
        if (noteSpan[idx]) {
          var n = sch.notes[row.note] || { text: '' };
          var nc = el('td', 'n' + (n.red ? ' r' : ''), n.text); nc.rowSpan = noteSpan[idx]; tr.appendChild(nc);
        }
        tbody.appendChild(tr); idx++;
      });
    });
    table.appendChild(tbody); wrap.appendChild(table);
    return wrap;
  }

  function buildCards(sch) {
    var box = el('div', 'sched-cards'); box.setAttribute('aria-label', 'Расписание богослужений по дням');
    sch.days.forEach(function (day) {
      var art = el('article', 'day');
      var h = el('header', 'day-h' + (day.red ? ' red' : '')); h.setAttribute('data-date', day.iso);
      h.appendChild(el('span', 'dn', day.d)); h.appendChild(el('span', 'dw', day.w));
      var ul = el('ul', 'day-rows'), shown = {};
      day.rows.forEach(function (row) {
        var li = el('li');
        li.appendChild(el('span', 't' + (row.tr ? ' tr' : ''), row.t || ''));
        var s = el('span', 's'); s.appendChild(svcSpans(row.s)); li.appendChild(s);
        ul.appendChild(li);
        if (row.note && !shown[row.note]) {
          shown[row.note] = 1;
          var n = sch.notes[row.note] || { text: '' };
          var nl = el('li', 'n' + (n.red ? ' r' : ''));
          nl.appendChild(el('span', 't')); nl.appendChild(el('span', 's', n.text)); ul.appendChild(nl);
        }
      });
      art.appendChild(h); art.appendChild(ul); box.appendChild(art);
    });
    return box;
  }

  function rangeText(sch) {
    var a = sch.days[0].d.split(' '), b = sch.days[sch.days.length - 1].d.split(' ');
    if (sch.days.length === 1) return sch.days[0].d;
    if (a[1] === b[1]) return a[0] + '–' + b[0] + ' ' + a[1];
    return sch.days[0].d + ' – ' + sch.days[sch.days.length - 1].d;
  }

  var sch = loadSchedule();

  /* страница «Расписание» */
  var oldWrap = document.querySelector('.sched-wrap');
  if (sch && oldWrap) {
    var oldCards = document.querySelector('.sched-cards');
    var intro = document.getElementById('sched-intro');
    var empty = document.getElementById('sched-empty');
    if (!sch.days.length) {
      oldWrap.hidden = true; if (oldCards) oldCards.hidden = true;
      if (intro) intro.hidden = true; if (empty) empty.hidden = false;
    } else {
      oldWrap.parentNode.replaceChild(buildTable(sch), oldWrap);
      if (oldCards) oldCards.parentNode.replaceChild(buildCards(sch), oldCards);
      var rg = document.getElementById('sched-range'); if (rg) rg.textContent = rangeText(sch);
    }
  }

  /* главная: ближайшая служба */
  var nextBox = document.getElementById('next-service');
  if (nextBox) {
    var body = nextBox.querySelector('.next-body');
    body.textContent = '';
    var d0 = null, r0 = null;
    if (sch) {
      /* ближайшая служба: первая строка с временем, объявления («служба отменена») пропускаем */
      sch.days.some(function (d) {
        return d.rows.some(function (r) { if (!r.notice) { d0 = d; r0 = r; return true; } return false; });
      });
    }
    if (d0) {
      var dd = parseInt(d0.iso.slice(8), 10), diff = dd - now.getDate();
      var when = d0.iso === todayIso ? 'Сегодня' : diff === 1 && d0.iso.slice(5, 7) === pad(now.getMonth() + 1) ? 'Завтра' : d0.d;
      body.appendChild(el('span', 'next-when', when + (when === d0.d ? '' : ', ' + d0.d) + ', ' + d0.w.toLowerCase()));
      body.appendChild(el('b', 'next-time', r0.t));
      var names = el('span', 'next-name');
      d0.rows.forEach(function (r) { if (r.tShown === r0.tShown) names.appendChild(svcSpans(r.s)); });
      body.appendChild(names);
      if (r0.note && sch.notes[r0.note]) body.appendChild(el('span', 'next-note', sch.notes[r0.note].text));
    } else {
      body.appendChild(el('span', 'next-name', 'Расписание на ближайшие дни скоро появится.'));
    }
  }

  /* Ближайший праздник (если блок есть на странице) */
  var best = null;
  feasts.forEach(function (f) {
    var dt = new Date(today.getFullYear(), f.m, f.d);
    if (dt < today) dt = new Date(today.getFullYear() + 1, f.m, f.d);
    var diff = Math.round((dt - today) / 86400000);
    if (!best || diff < best.diff) best = { f: f, diff: diff };
  });
  var nameEl = document.getElementById('feastName');
  var dateEl = document.getElementById('feastDate');
  var inEl = document.getElementById('feastIn');
  if (best && nameEl && dateEl && inEl) {
    nameEl.textContent = best.f.name;
    dateEl.textContent = best.f.label;
    inEl.textContent = best.diff === 0 ? 'сегодня'
      : best.diff === 1 ? 'завтра'
      : 'через ' + best.diff + ' ' + dayWord(best.diff);
  }

  /* В расписании отмечаем сегодняшний день */
  Array.prototype.forEach.call(document.querySelectorAll('[data-date="' + todayIso + '"]'), function (el2) {
    el2.classList.add('is-today');
    var badge = document.createElement('span');
    badge.className = 'today-badge';
    badge.textContent = 'Сегодня';
    el2.appendChild(badge);
  });

  /* Меню «Богослужения» на сенсорных экранах: первое касание открывает список,
     второе переходит по ссылке. На компьютере меню открывается наведением. */
  var subs = document.querySelectorAll('.has-sub');
  var touchOnly = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var menuMode = window.matchMedia ? window.matchMedia('(max-width: 1060px)') : { matches: false };

  /* Кнопка «Меню» на узких экранах */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var label = toggle.querySelector('.lbl');
    var setMenu = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Закрыть' : 'Меню';
    };
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); toggle.focus(); }
    });
  }

  Array.prototype.forEach.call(subs, function (s) {
    var parent = s.querySelector('a');
    parent.addEventListener('click', function (e) {
      /* В режиме кнопки «Меню» подпункты уже видны, переходим сразу */
      if (touchOnly && !menuMode.matches && !s.classList.contains('open')) {
        e.preventDefault();
        s.classList.add('open');
        parent.setAttribute('aria-expanded', 'true');
      }
    });
  });
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(subs, function (s) {
      if (!s.contains(e.target)) {
        s.classList.remove('open');
        s.querySelector('a').setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------- Версия для слабовидящих ----------
     Кнопка слева вверху включает крупный шрифт и контрастные цвета.
     Выбор запоминается в браузере. */
  var root = document.documentElement;
  var lvBtn = document.querySelector('.lv-btn');
  var lvState = { on: false, size: 1, color: 'light', img: true };
  try { var saved = JSON.parse(localStorage.getItem('lv') || 'null'); if (saved) { lvState = saved; if (lvState.color !== 'soft') lvState.color = 'light'; } } catch (e) {}
  var lvPanel = null;
  function lvSave() { try { localStorage.setItem('lv', JSON.stringify(lvState)); } catch (e) {} }
  function lvApply() {
    root.classList.toggle('lv', lvState.on);
    ['lv-s1', 'lv-s2', 'lv-s3', 'lv-light', 'lv-soft', 'lv-noimg'].forEach(function (c) { root.classList.remove(c); });
    if (lvState.on) {
      root.classList.add('lv-s' + lvState.size, 'lv-' + lvState.color);
      if (!lvState.img) root.classList.add('lv-noimg');
    }
    if (lvBtn) lvBtn.setAttribute('aria-pressed', lvState.on ? 'true' : 'false');
    if (lvPanel) {
      lvPanel.hidden = !lvState.on;
      Array.prototype.forEach.call(lvPanel.querySelectorAll('[data-k]'), function (b) {
        var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
        b.setAttribute('aria-pressed', String(lvState[k]) === v ? 'true' : 'false');
      });
    }
  }
  if (lvBtn) {
    lvPanel = document.createElement('div');
    lvPanel.className = 'lv-panel';
    lvPanel.hidden = true;
    lvPanel.setAttribute('role', 'region');
    lvPanel.setAttribute('aria-label', 'Настройки версии для слабовидящих');
    lvPanel.innerHTML =
      '<div class="wrap lv-in">' +
      '<div class="lv-grp"><span class="lv-lbl">Размер шрифта</span><div class="lv-seg">' +
      '<button type="button" data-k="size" data-v="1" aria-label="Мелкий шрифт"><i style="font-size:1rem">А</i></button>' +
      '<button type="button" data-k="size" data-v="2" aria-label="Средний шрифт"><i style="font-size:1.3rem">А</i></button>' +
      '<button type="button" data-k="size" data-v="3" aria-label="Крупный шрифт"><i style="font-size:1.65rem">А</i></button></div></div>' +
      '<div class="lv-grp"><span class="lv-lbl">Цвета</span><div class="lv-seg">' +
      '<button type="button" data-k="color" data-v="light">Чёрное на белом</button>' +
      '<button type="button" data-k="color" data-v="soft">Обычные цвета</button></div></div>' +
      '<div class="lv-grp"><span class="lv-lbl">Изображения</span><div class="lv-seg">' +
      '<button type="button" data-k="img" data-v="true">Включены</button>' +
      '<button type="button" data-k="img" data-v="false">Выключены</button></div></div>' +
      '<button type="button" class="lv-off">Обычная версия</button></div>';
    document.body.insertBefore(lvPanel, document.body.firstChild);
    lvPanel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('lv-off')) { lvState.on = false; }
      else {
        var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
        lvState[k] = k === 'size' ? parseInt(v, 10) : k === 'img' ? v === 'true' : v;
      }
      lvSave(); lvApply();
    });
    lvBtn.addEventListener('click', function () { lvState.on = !lvState.on; lvSave(); lvApply(); });
    lvApply();
  }

  /* Просмотр фотографий: щелчок по снимку открывает его крупно.
     Без скрипта ссылка просто открывает файл. */
  var links = document.querySelectorAll('a.photo-link');
  if (links.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Просмотр фотографии');
    box.innerHTML = '<button type="button" class="lightbox-close">Закрыть</button><img alt="">';
    document.body.appendChild(box);
    var big = box.querySelector('img');
    var closeBtn = box.querySelector('button');
    var opener = null;

    var closeBox = function () {
      box.hidden = true;
      document.body.style.overflow = '';
      if (opener) opener.focus();
    };
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        opener = a;
        var im = a.querySelector('img');
        big.src = a.getAttribute('href');
        big.alt = im ? im.alt : '';
        box.hidden = false;
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
      });
    });
    box.addEventListener('click', function (e) { if (e.target !== big) closeBox(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) closeBox();
    });
  }
})();
