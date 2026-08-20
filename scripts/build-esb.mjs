import esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { minifyHTMLLiteralsPlugin } from 'esbuild-plugin-minify-html-literals';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const name = `${pkg.name} | Custom Web Components Lib with Lit.js`; // pkg.name;
const author = pkg.repository?.url; //pkg.author;

const bannerText = `/*!
 * @license
 * ${name} v${pkg.version}
 * (c) ${new Date().getFullYear()} ${author}
 * Released under the ${pkg.license} License
 */`;

/** @type {esbuild.BuildOptions} */
const esmOptions = {
    entryPoints: ['src/index.js'],

    outdir: 'dist',
    entryNames: 'typed-ui', // klasör yapısını korur

    bundle: true,
    splitting: false,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',

    minify: true,
    legalComments: 'inline', // none | linked | inline | eof
    sourcemap: false,

    plugins: [minifyHTMLLiteralsPlugin()],
    external: ['lit', 'lit/*'],
    banner: {
        js: bannerText,
    },
    define: {
        'process.env.NODE_ENV': '"production"',
    },
};

const esmWithLit = {
    ...esmOptions,
    entryNames: 'typed-ui-with-lit', // klasör yapısını korur
    external: [],
};

const iifeOptions = {
    ...esmOptions,
    entryNames: 'typed-ui.iife',
    external: [],
    format: 'iife',
    globalName: 'TypedUI',
};

await esbuild.build(esmOptions);
await esbuild.build(esmWithLit);
await esbuild.build(iifeOptions);
