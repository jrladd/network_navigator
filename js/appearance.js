// Shared node appearance (size and color) for the force layout and the arc diagram.
// The customize controls call set(); views subscribe to 'change' and read radius(d) / color(d).

import { METRIC_BY_KEY, formatNodeValue } from './metrics.js';
import { communityColor, rampEnds } from './palette.js';

const MIN_RADIUS = 15;
const MAX_RADIUS = 50;

class Appearance extends EventTarget {
  constructor() {
    super();
    this.sizeBy = 'degree';
    this.colorBy = 'none';
    this.baseColor = '#08b3e5';
    this.extents = {};
    this.communitySizes = [];
  }

  // Start a new network. nodeList items carry the metric values by key.
  init(nodeList, metricKeys, communitySizes) {
    this.extents = {};
    metricKeys.forEach((key) => {
      if (METRIC_BY_KEY[key].kind !== 'numeric') return;
      const values = nodeList.map((d) => d[key]).filter((v) => Number.isFinite(v));
      this.extents[key] = values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];
    });
    this.communitySizes = communitySizes;
    this.sizeBy = 'degree';
    this.colorBy = 'none';
  }

  // Update some settings ({sizeBy, colorBy, baseColor}) and notify views
  set(changes) {
    Object.assign(this, changes);
    this.dispatchEvent(new Event('change'));
  }

  // Node radius in the 15-50 range used by all views (each view rescales it)
  radius(d) {
    const extent = this.extents[this.sizeBy];
    const value = d[this.sizeBy];
    if (!extent || !Number.isFinite(value)) return (MIN_RADIUS + MAX_RADIUS) / 2;
    const [min, max] = extent;
    const t = max === min ? 0.5 : (value - min) / (max - min);
    return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
  }

  color(d) {
    if (this.colorBy === 'none') return this.baseColor;
    if (this.colorBy === 'community') return communityColor(d.community, this.communitySizes);
    const extent = this.extents[this.colorBy];
    const value = d[this.colorBy];
    if (!extent || !Number.isFinite(value)) return this.baseColor;
    const max = extent[1];
    const { light, dark } = rampEnds(this.baseColor);
    // Same scale as before: from 0 (light tint) to the maximum value (full color)
    return max > 0 ? d3.interpolateRgb(light, dark)(Math.max(0, value) / max) : light;
  }

  // Fill a container element with a legend for the current color setting
  renderLegend(container) {
    container.replaceChildren();
    if (this.colorBy === 'none') {
      container.hidden = true;
      return;
    }
    container.hidden = false;

    const add = (tag, className, text) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      container.append(el);
      return el;
    };

    if (this.colorBy === 'community') {
      const shown = this.communitySizes.slice(0, 10);
      shown.forEach((size, i) => {
        const item = add('span');
        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = communityColor(i + 1, this.communitySizes);
        item.append(swatch, `Community ${i + 1} (${size})`);
      });
      if (this.communitySizes.length > shown.length) {
        add('span', 'muted', `+${this.communitySizes.length - shown.length} more`);
      }
      return;
    }

    const metric = METRIC_BY_KEY[this.colorBy];
    const extent = this.extents[this.colorBy] || [0, 0];
    const { light, dark } = rampEnds(this.baseColor);
    add('span', null, `${metric.label}:`);
    add('span', 'muted', '0');
    const ramp = add('span', 'ramp');
    ramp.style.background = `linear-gradient(to right, ${light}, ${dark})`;
    add('span', 'muted', formatNodeValue(this.colorBy, extent[1]));
  }
}

export const appearance = new Appearance();
