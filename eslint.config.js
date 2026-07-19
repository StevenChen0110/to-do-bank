import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // zh-TW copy uses full-width spaces inside string/template literals.
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true }],
      // `const { removed: _x, ...rest } = obj` is the idiomatic omit pattern.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // shadcn-style files co-export cva variants / context hooks with their
      // component; splitting them adds churn for an HMR-only nicety.
      'react-refresh/only-export-components': 'off',
    },
  },
])
