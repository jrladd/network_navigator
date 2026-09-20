// Detail card for the selected node: its metrics, community and neighbors.
// Selection can come from the force layout, the arc diagram, the matrix, or a table row.

import { app } from './state.js';
import { selection } from './selection.js';
import { availableMetrics, formatNodeValue } from './metrics.js';
import { communityColor } from './palette.js';

const MAX_NEIGHBORS = 40;
let card;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function neighborSection(title, ids) {
  const section = element('div');
  section.append(element('h4', null, `${title} (${ids.length})`));
  const list = element('div', 'neighbors');
  const sorted = [...ids].sort((a, b) => app.G.degree(b) - app.G.degree(a) || (a < b ? -1 : 1));
  sorted.slice(0, MAX_NEIGHBORS).forEach((id) => {
    const button = element('button', null, id);
    button.type = 'button';
    button.addEventListener('click', () => selection.select(id));
    list.append(button);
  });
  if (sorted.length > MAX_NEIGHBORS) {
    list.append(element('span', 'muted', `+${sorted.length - MAX_NEIGHBORS} more`));
  }
  section.append(list);
  return section;
}

function render() {
  const id = selection.selected;
  card.replaceChildren();
  if (id === null || !app.G || !app.G.hasNode(id)) {
    card.hidden = true;
    return;
  }
  card.hidden = false;

  const close = element('button', 'btn btn-ghost btn-small close', 'Close');
  close.type = 'button';
  close.addEventListener('click', () => selection.clear());
  card.append(close, element('h3', null, id));

  const stats = element('dl');
  availableMetrics(app.result).forEach((metric) => {
    const value = app.result.node[metric.key][id];
    const dd = element('dd');
    if (metric.key === 'community') {
      const swatch = element('span', 'swatch');
      swatch.style.cssText = `display:inline-block;width:.8rem;height:.8rem;margin-right:.35rem;border:1px solid var(--ink);border-radius:50%;background:${communityColor(value, app.result.communitySizes)}`;
      dd.append(swatch, `#${value}`);
    } else {
      dd.textContent = formatNodeValue(metric.key, value);
    }
    const wrapper = element('div');
    wrapper.append(element('dt', null, metric.label), dd);
    stats.append(wrapper);
  });
  card.append(stats);

  if (app.G.type === 'directed') {
    card.append(neighborSection('Points to', app.G.outNeighbors(id)));
    card.append(neighborSection('Pointed to by', app.G.inNeighbors(id)));
  } else {
    card.append(neighborSection('Neighbors', app.G.neighbors(id)));
  }
}

// Call once at startup
export function initNodeCard() {
  card = document.getElementById('node-card');
  selection.addEventListener('select', render);
}

export function renderNodeCard() {
  render();
}
