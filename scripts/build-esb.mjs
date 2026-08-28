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
const options = {
    outdir: 'dist',
    bundle: true,
    splitting: false,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    legalComments: 'inline', // none | linked | inline | eof
    minify: true,
    sourcemap: false,
    plugins: [minifyHTMLLiteralsPlugin()],
    define: { 'process.env.NODE_ENV': '"production"' },
};

/** @type {esbuild.BuildOptions} */
const mainOptions = {
    ...options,
    entryPoints: ['src/exports/eiger-ui.js'],
    banner: { js: bannerText },
    external: ['lit', 'lit/*', '@tiptap', '@tiptap/*'],
};

const richTextOptions = {
    ...options,
    entryPoints: [`src/exports/${pkg.name}-rich-text.js`], // Yeni entry point
    banner: { js: bannerText },
    external: ['lit', 'lit/*', '@tiptap', '@tiptap/*', `${pkg.name}`],
};

/** @type {esbuild.BuildOptions} */
const tiptapOptions = {
    ...options,
    entryPoints: ['src/exports/tiptap-vendor.js'],
    plugins: [],
};

/** @type {esbuild.BuildOptions} */
const litVendorOptions = {
    ...options,
    entryPoints: ['src/exports/lit-vendor.js'],
    plugins: [],
};

// const esmWithLit = {
//     ...options,
//     entryNames: `${pkg.name}-with-lit`,
//     chunkNames: '[name]',
//     splitting: true,
//     external: [],
// };

const iifeOptions = {
    ...options,
    entryNames: `${pkg.name}.iife`,
    external: ['@tiptap', '@tiptap/*'],
    format: 'iife',
    globalName: 'EigerUI',
};

await esbuild.build(mainOptions);
await esbuild.build(richTextOptions);
// await esbuild.build(esmWithLit);
await esbuild.build(tiptapOptions);
// await esbuild.build(iifeOptions);
await esbuild.build(litVendorOptions);
