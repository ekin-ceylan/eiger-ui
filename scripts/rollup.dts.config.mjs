import path from 'node:path';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const entriesDir = 'types-tmp';
const outDir = 'dist';

export default [
    {
        input: path.join(entriesDir, 'exports', `${pkg.name}.d.ts`),
        output: {
            file: path.join(outDir, `${pkg.name}.d.ts`),
            format: 'es',
        },
        plugins: [dts()],
    },
    {
        input: path.join(entriesDir, 'exports', `${pkg.name}-rich-text.d.ts`),
        output: {
            file: path.join(outDir, `${pkg.name}-rich-text.d.ts`),
            format: 'es',
        },
        plugins: [dts()],
        external: [pkg.name],
    },
];
