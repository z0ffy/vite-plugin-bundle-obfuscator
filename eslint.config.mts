import globals from 'globals';
import pluginJs from '@eslint/js';
import tslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tslint.config(
  {
    ignores: [
      'node_modules',
      'dist',
      'src/__tests__',
    ],
  },
  pluginJs.configs.recommended,
  ...tslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
  }),
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/brace-style': 'off',
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
