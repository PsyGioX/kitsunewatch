#!/usr/bin/env node
// scripts/build-assets.js
//
// Минифицирует ВСЕ клиентские (браузерные) JS и CSS файлы проекта:
// каждый исходник вида "name.js" / "name.css" получает "name.min.js" /
// "name.min.css" рядом с собой. HTML подключает только .min-версии —
// см. index.html.
//
// Сюда сознательно НЕ входят:
//   - api/*.js, middleware.js — серверный код (Vercel Functions),
//     в браузер не отдаётся, минификация ему ничего не даёт и Vercel
//     сам собирает эти файлы при деплое;
//   - sw.js — service worker. Его путь ("/sw.js") захардкожен в
//     navigator.serviceWorker.register(...) и завязан на область
//     видимости кэша; переименование в .min.js — лишний риск сломать
//     PWA-кэш без реальной пользы (файл маленький).
//
// Список источников ниже — единственное место, которое нужно
// поправить, если в проект добавится новый клиентский .js/.css файл.
//
// Второй шаг сборки — версионирование через query-строку (?v=<hash>).
// vercel.json кэширует все *.min.js/*.min.css как immutable на год;
// без версионирования это означало бы, что правки в файле не доходят
// до уже закэшировавших его браузеров. Вместо переименования файлов
// (что потребовало бы отдельного манифеста для их поиска) в index.html
// у каждой локальной ссылки на них проставляется `?v=<hash от содержимого>`
// — при следующей сборке хэш меняется, значит меняется URL, значит
// браузер не может отдать иммутабельную копию из кэша.

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import CleanCSS from 'clean-css';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');

const JS_SOURCES = [
    'assets/scripts/index.js',
    'assets/scripts/theme-manager.js',
    'achievements/achievements-core.js',
    'achievements/achievements-notifications.js',
    'achievements/achievements-page.js',
    'cookie-widget/cookie-widget-detectors.js',
    'cookie-widget/cookie-widget-core.js',
    'cookie-widget/cookie-widget-ui.js',
];

const CSS_SOURCES = [
    'assets/styles/index.css',
    'achievements/achievements.css',
    'cookie-widget/cookie-widget.css',
    // Самостоятельно захостенные Bootstrap Icons (см. комментарий в самом
    // файле) — гоняются через тот же минификатор, что и остальной CSS.
    'assets/vendor/bootstrap-icons/bootstrap-icons.css',
];

function minPath(srcRelPath) {
    const ext = path.extname(srcRelPath); // .js or .css
    return srcRelPath.slice(0, -ext.length) + '.min' + ext;
}

function publicUrl(relPath) {
    return '/' + relPath.split(path.sep).join('/');
}

function hashOf(content) {
    return crypto.createHash('sha1').update(content).digest('hex').slice(0, 8);
}

async function buildJs(relPath) {
    const abs = path.join(ROOT, relPath);
    const outRel = minPath(relPath);
    const outAbs = path.join(ROOT, outRel);
    const code = fs.readFileSync(abs, 'utf8');

    const result = await minify(code, { compress: true, mangle: true });
    if (result.error) throw result.error;

    fs.writeFileSync(outAbs, result.code, 'utf8');
    console.log(`  JS   ${relPath} -> ${outRel} (${code.length} -> ${result.code.length} bytes)`);
    return { publicPath: publicUrl(outRel), hash: hashOf(result.code) };
}

function buildCss(relPath) {
    const abs = path.join(ROOT, relPath);
    const outRel = minPath(relPath);
    const outAbs = path.join(ROOT, outRel);
    const code = fs.readFileSync(abs, 'utf8');

    // relativeTo — чтобы url(...) в @font-face (bootstrap-icons.css грузит
    // шрифты по пути "fonts/...") не переписывались относительно
    // произвольного cwd, а остались как есть, ведь .min.css лежит рядом
    // с исходником в той же папке.
    const output = new CleanCSS({ relativeTo: path.dirname(abs) }).minify(code);
    if (output.errors && output.errors.length) {
        throw new Error(output.errors.join('\n'));
    }

    fs.writeFileSync(outAbs, output.styles, 'utf8');
    console.log(`  CSS  ${relPath} -> ${outRel} (${code.length} -> ${output.styles.length} bytes)`);
    return { publicPath: publicUrl(outRel), hash: hashOf(output.styles) };
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Проставляет/обновляет ?v=<hash> у ссылок на локальные .min.js/.min.css
// в index.html. Ищет href="<path>" или src="<path>" с необязательным уже
// существующим ?v=..., чтобы повторные сборки были идемпотентны.
function updateHtmlVersions(assets) {
    let html = fs.readFileSync(INDEX_HTML, 'utf8');
    let changed = 0;

    for (const { publicPath, hash } of assets) {
        const pattern = new RegExp(
            `(["'])${escapeRegExp(publicPath)}(?:\\?v=[0-9a-f]+)?\\1`,
            'g'
        );
        html = html.replace(pattern, (match, quote) => {
            changed++;
            return `${quote}${publicPath}?v=${hash}${quote}`;
        });
    }

    fs.writeFileSync(INDEX_HTML, html, 'utf8');
    console.log(`Updated ${changed} asset reference(s) in index.html with cache-busting hashes.`);
}

async function main() {
    const assets = [];

    console.log('Minifying JS:');
    for (const rel of JS_SOURCES) {
        assets.push(await buildJs(rel));
    }

    console.log('Minifying CSS:');
    for (const rel of CSS_SOURCES) {
        assets.push(buildCss(rel));
    }

    console.log('Versioning index.html references:');
    updateHtmlVersions(assets);

    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
