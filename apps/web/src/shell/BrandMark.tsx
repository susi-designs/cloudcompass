/** Brand blue for the light theme. In dark (g100) the stroke switches to `$interactive` via CSS. */
const BRAND_BLUE = '#2A55FC';

/**
 * CloudCompass compass-star mark, inline so its stroke can follow the theme.
 * Mirrors `assets/brand/logo-mark.svg`. Decorative: the product name beside it is the label.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="37 38 1180 1180"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={BRAND_BLUE}
      strokeLinejoin="miter"
      strokeMiterlimit={4}
    >
      <circle cx="627" cy="628" r="545" strokeWidth="76" />
      <g transform="translate(627 628) scale(0.86) translate(-627 -615)">
        <polygon
          points="627,192 754,540 1001,628 754,718 627,1038 500,718 252,628 500,540"
          strokeWidth="56"
        />
        <path
          d="M500 540 576 614M754 540 678 614M754 718 678 643M500 718 576 643"
          strokeWidth="40"
        />
        <polygon points="627,563 692,628 627,693 562,628" strokeWidth="40" />
      </g>
    </svg>
  );
}
