import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Zod/RHF resolvers and a few Supabase call sites rely on `any` at
      // typed-library boundaries (cf. src/lib/supabase.ts) — the type-checker
      // (tsc) already enforces real type safety everywhere else.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // This project fetches in useEffect + setState (no React Query/SWR, cf.
      // ARCHITECTURE.md) throughout its data hooks (useIssues.ts, Settings.tsx,
      // MapView.tsx, UserContext.tsx...). That's the intended pattern here, not
      // a bug, so this rule stays a warning instead of blocking CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Test doubles intentionally cast loosely-shaped mocks to the real client type.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
