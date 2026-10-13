import { react } from '@cloudcompass/config/eslint';

export default [
  ...react,
  {
    // The data layer is the only place allowed to touch mock data (CLAUDE.md §7).
    files: ['src/data/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
