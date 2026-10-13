// Shared ESLint flat config for CloudCompass workspaces.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

/** Base config for TypeScript libraries. */
export const base = tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (CLAUDE.md §7).',
        },
      ],
    },
  },
  {
    // Tool config files (eslint, vite, playwright, stylelint) require default exports.
    files: ['**/*.config.{js,ts,mjs}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);

/** Config for React apps: adds hooks rules and bans non-Carbon UI/chart libraries. */
export const react = tseslint.config(...base, {
  files: ['**/*.{ts,tsx}'],
  plugins: {
    'react-hooks': reactHooks,
    'react-refresh': reactRefresh,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@mui/*',
              '@chakra-ui/*',
              'antd',
              '@radix-ui/*',
              'tailwindcss',
              'styled-components',
              '@emotion/*',
            ],
            message: 'Use Carbon (@carbon/react) only — see DESIGN.md §8.',
          },
          {
            group: [
              'recharts',
              'chart.js',
              'react-chartjs-2',
              'victory',
              '@nivo/*',
              'echarts',
              'highcharts',
            ],
            message: 'Use Carbon Charts (@carbon/charts-react) only — see DESIGN.md §5.',
          },
          {
            group: ['@cloudcompass/mock-data', '@cloudcompass/mock-data/*'],
            message:
              'Components must not import mock-data directly. Use hooks in src/data/ (CLAUDE.md §7).',
          },
        ],
      },
    ],
  },
});
