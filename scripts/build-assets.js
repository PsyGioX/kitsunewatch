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

const path = require('path');
const fs = require('fs');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

const ROOT = path.resolve(__dirname, '..');

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
];

function minPath(srcRelPath) {
    const ext = path.extname(srcRelPath); // .js or .css
    return srcRelPath.slice(0, -ext.length) + '.min' + ext;
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
}

function buildCss(relPath) {
    const abs = path.join(ROOT, relPath);
    const outRel = minPath(relPath);
    const outAbs = path.join(ROOT, outRel);
    const code = fs.readFileSync(abs, 'utf8');

    const output = new CleanCSS({}).minify(code);
    if (output.errors && output.errors.length) {
        throw new Error(output.errors.join('\n'));
    }

    fs.writeFileSync(outAbs, output.styles, 'utf8');
    console.log(`  CSS  ${relPath} -> ${outRel} (${code.length} -> ${output.styles.length} bytes)`);
}

async function main() {
    console.log('Minifying JS:');
    for (const rel of JS_SOURCES) {
        await buildJs(rel);
    }

    console.log('Minifying CSS:');
    for (const rel of CSS_SOURCES) {
        buildCss(rel);
    }

    console.log('Done.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
