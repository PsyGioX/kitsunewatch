// preloader/preloader.js
//
// Спокойный прелоадер: ждёт готовности страницы (шрифты + window.load),
// выдерживает короткую минимальную паузу — чтобы на быстром повторном
// заходе экран не «мигал» — и плавно растворяется. Без прогресс-бара.
(function () {
    'use strict';

    var html = document.documentElement;
    var pre = document.getElementById('kwPreloader');
    if (!pre) return;

    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var finished = false;

    html.classList.add('kw-no-scroll');
    if (document.body) document.body.setAttribute('aria-busy', 'true');

    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(function () {}) : Promise.resolve();

    var windowLoaded = new Promise(function (resolve) {
        if (document.readyState === 'complete') resolve();
        else window.addEventListener('load', resolve, { once: true });
    });

    var minTime = new Promise(function (resolve) {
        setTimeout(resolve, reduceMotion ? 150 : 700);
    });

    Promise.all([fontsReady, windowLoaded, minTime]).then(finish, finish);

    // Аварийный выход: зависший запрос не должен держать пользователя вечно.
    var hardTimeout = setTimeout(finish, 8000);

    function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(hardTimeout);

        pre.setAttribute('aria-hidden', 'true');
        pre.classList.add('is-leaving');
        if (document.body) document.body.removeAttribute('aria-busy');
        html.classList.remove('kw-no-scroll');

        setTimeout(function () {
            if (pre.parentNode) pre.parentNode.removeChild(pre);
        }, reduceMotion ? 300 : 700);
    }
})();
