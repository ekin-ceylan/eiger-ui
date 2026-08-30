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

const bannerTextAddon = `/*!
 * @license
 * ${pkg.name} Rich Text Addon
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
    plugins: [minifyHTMLLiteralsPlugin()],
    define: { 'process.env.NODE_ENV': '"production"' },
};

/** @type {esbuild.BuildOptions} */
const mainOptions = {
    ...options,
    entryPoints: ['src/exports/custom-ui.js'],
    banner: { js: bannerText },
    external: ['lit', 'lit/*', '@tiptap', '@tiptap/*'],
    sourcemap: 'linked',
};

const richTextOptions = {
    ...options,
    entryPoints: [`src/exports/${pkg.name}-rich-text.js`], // Yeni entry point
    banner: { js: bannerTextAddon },
    external: ['lit', 'lit/*', '@tiptap', '@tiptap/*', `${pkg.name}`],
    sourcemap: 'linked',
};

/** @type {esbuild.BuildOptions} */
const vendorOptions = {
    ...options,
    entryPoints: {
        [`${pkg.name}-lit-vendor`]: 'src/exports/vendors/lit.js',
        [`${pkg.name}-tiptap-vendor`]: 'src/exports/vendors/tiptap.js',
    },
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
    entryPoints: ['src/exports/custom-ui.iife.js'],
    banner: { js: bannerText },
    external: ['@tiptap', '@tiptap/*'],
    format: 'iife',
    globalName: 'CustomUI',
};

await esbuild.build(mainOptions);
await esbuild.build(richTextOptions);
await esbuild.build(vendorOptions);
await esbuild.build(iifeOptions);
// await esbuild.build(esmWithLit);
//
