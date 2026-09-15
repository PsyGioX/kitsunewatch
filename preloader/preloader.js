// preloader/preloader.js
//
// Управляет анимированным прелоадером (см. preloader.css и разметку
// в index.html). Не блокирующий по смыслу модуль — просто слушает
// стандартные события загрузки страницы и по готовности запускает
// анимацию исчезновения, аккуратно убирая себя из DOM.
//
// Логика прогресс-бара: реального байтового прогресса у браузера
// нет, поэтому бар "правдоподобно" ползёт к текущей цели (target) и
// ускоряется каждый раз, когда происходит реальная веха загрузки
// (разбор DOM, шрифты, window.load). Это стандартный приём для
// прелоадеров — выглядит как настоящий прогресс, но никогда не
// зависает и не показывает ложные 100% раньше времени.
(function () {
    'use strict';

    var html = document.documentElement;
    var pre = document.getElementById('kwPreloader');
    if (!pre) return;

    var fillEl = document.getElementById('kwPreloaderFill');
    var pctEl = document.getElementById('kwPreloaderPct');
    var statusEl = document.getElementById('kwPreloaderStatus');

    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    html.classList.add('kw-no-scroll');
    document.body && document.body.setAttribute('aria-busy', 'true');

    // ---------- смена фраз в "speech bubble" ----------
    var messages = [
        'Открываем портал',
        'Пробуждаем кицунэ',
        'Собираем аниме-вселенную',
        'Почти на месте'
    ];
    var msgIndex = 0;
    var msgTimer = null;

    if (statusEl && !reduceMotion) {
        msgTimer = setInterval(function () {
            msgIndex = (msgIndex + 1) % messages.length;
            statusEl.textContent = messages[msgIndex];
        }, 1400);
    }

    // ---------- "правдоподобный" прогресс ----------
    var progress = 0;
    var target = 8;
    var done = false;
    var rafId = null;

    function paint(displayValue) {
        if (fillEl) fillEl.style.transform = 'scaleX(' + (displayValue / 100) + ')';
        if (pctEl) pctEl.textContent = displayValue + '%';
    }

    function tick() {
        progress += (target - progress) * 0.09;
        if (target - progress < 0.28) progress = target - 0.4;
        if (progress < 0) progress = 0;

        var shown = done ? 100 : Math.min(99, Math.round(progress));
        paint(shown);

        if (!done) {
            rafId = window.requestAnimationFrame(tick);
        }
    }
    rafId = window.requestAnimationFrame(tick);

    function bump(value) {
        if (value > target) target = value;
    }

    // ---------- реальные вехи загрузки ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { bump(55); }, { once: true });
    } else {
        bump(55);
    }

    var fontsReady = (document.fonts && document.fonts.ready)
        ? document.fonts.ready.then(function () { bump(82); }).catch(function () { bump(82); })
        : Promise.resolve().then(function () { bump(82); });

    var windowLoaded = new Promise(function (resolve) {
        if (document.readyState === 'complete') {
            bump(94);
            resolve();
        } else {
            window.addEventListener('load', function () {
                bump(94);
                resolve();
            }, { once: true });
        }
    });

    // Небольшая минимальная задержка — иначе на быстром кэшированном
    // повторном заходе анимация просто "мигает" и выглядит багом, а
    // не осознанным заставочным экраном.
    var minTime = new Promise(function (resolve) {
        setTimeout(resolve, reduceMotion ? 350 : 1400);
    });

    Promise.all([fontsReady, windowLoaded, minTime]).then(finish, finish);

    // Аварийный таймаут: если что-то (медленное фото, зависший запрос)
    // не даёт дождаться 'load', прелоадер всё равно не должен держать
    // пользователя вечно.
    var hardTimeout = setTimeout(finish, 19000);

    function finish() {
        if (done) return;
        done = true;

        clearTimeout(hardTimeout);
        if (msgTimer) clearInterval(msgTimer);
        if (statusEl) statusEl.textContent = 'Добро пожаловать!';
        if (rafId) window.cancelAnimationFrame(rafId);
        paint(100);

        var leaveDelay = reduceMotion ? 100 : 220;

        setTimeout(function () {
            pre.setAttribute('aria-hidden', 'true');
            pre.classList.add(reduceMotion ? 'kw-preloader--fade-out' : 'is-leaving');
            document.body && document.body.removeAttribute('aria-busy');

            var removeDelay = reduceMotion ? 380 : 1150;

            setTimeout(function () {
                html.classList.remove('kw-no-scroll');
                if (pre && pre.parentNode) {
                    pre.parentNode.removeChild(pre);
                }
            }, removeDelay);
        }, leaveDelay);
    }
})();
