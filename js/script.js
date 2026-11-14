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

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  /* Меню «Богослужения» на сенсорных экранах: первое касание открывает список,
     второе переходит по ссылке. На компьютере меню открывается наведением. */
  var subs = document.querySelectorAll('.has-sub');
  var touchOnly = window.matchMedia && window.matchMedia('(hover: none)').matches;
  Array.prototype.forEach.call(subs, function (s) {
    var parent = s.querySelector('a');
    parent.addEventListener('click', function (e) {
      if (touchOnly && !s.classList.contains('open')) {
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
