/**
 * ESLint configuration for arcade-client
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
    ],
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ),
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },

    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
];