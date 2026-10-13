// Shared Stylelint config: enforce Carbon tokens (DESIGN.md §1, §8).
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // No raw hex colors — use Carbon color tokens.
    'color-no-hex': true,
    'color-named': 'never',
    // No raw px values — use Carbon spacing / type tokens. (1px hairlines allowed.)
    'declaration-property-value-disallowed-list': [
      {
        '/^(margin|padding|gap|row-gap|column-gap|top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|font-size|line-height|border-radius)/':
          ['/(?<![\\d.])(?!1px)\\d+(\\.\\d+)?px/'],
        'box-shadow': ['/.*/'],
      },
      { message: 'Use Carbon tokens instead of raw px values or custom shadows (DESIGN.md §3).' },
    ],
    'scss/at-import-no-partial-leading-underscore': null,
    'selector-class-pattern': null,
  },
};
