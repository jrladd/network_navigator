// Colors shared by all visualizations

// Categorical palette for communities (retro cyan/pink/amber first; distinguishable in most cases)
export const CATEGORY_COLORS = [
  '#08b3e5', // cyan
  '#ff3ea5', // hot pink
  '#ffb000', // amber
  '#7b61ff', // violet
  '#1fd28a', // green
  '#ff6b4a', // coral
  '#2f4b7c', // navy
  '#c0ca33', // lime
  '#8d5a3b', // brown
  '#00a6a6'  // teal
];

// Communities with a single node are drawn in neutral gray
export const SINGLETON_COLOR = '#9aa5b1';

// Color for community `id` (1-based). `sizes[i]` is the size of community i + 1.
export function communityColor(id, sizes = []) {
  if (sizes[id - 1] === 1) return SINGLETON_COLOR;
  return CATEGORY_COLORS[(id - 1) % CATEGORY_COLORS.length];
}

// Light-to-dark ramp for a numeric metric: the base color, and a very light tint of it
export function rampEnds(baseColor) {
  const rgb = d3.color(baseColor) || d3.color('#08b3e5');
  const light = d3.rgb(
    Math.round(rgb.r + (255 - rgb.r) * 0.9),
    Math.round(rgb.g + (255 - rgb.g) * 0.9),
    Math.round(rgb.b + (255 - rgb.b) * 0.9)
  );
  return { light: light.formatRgb(), dark: rgb.formatRgb() };
}
