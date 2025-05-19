import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import { fileURLToPath } from 'url';
import { dirname, resolve as pathResolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = {
  main: 'index.cjs',
  module: 'index.es.js',
  types: 'types/index.d.ts',
  peerDependencies: {
    "@librechat/data-provider": "*",
    "@librechat/data-schemas": "*"
  },
};

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.es.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      resolve({
        extensions: ['.js', '.ts'],
        preferBuiltins: true,
      }),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      alias({
        entries: [
          { find: '@librechat/data-provider', replacement: pathResolve(__dirname, '../data-provider/src') },
          { find: '@librechat/data-schemas', replacement: pathResolve(__dirname, '../data-schemas/src') },
        ],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: true,
        inlineSources: true,
      }),
      json(),
      terser(),
      generatePackageJson({
        baseContents: packageJson,
        outputFolder: 'dist',
      }),
    ],
    external: ['zod', 'axios'],
  },
];