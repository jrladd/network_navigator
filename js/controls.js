// Controls generated from the metric registry: the readouts, glossary, and the size / color / order
// selects. The registry (metrics.js) is the single source of truth for which metrics exist.

import { availableMetrics, metricDescription, visibleGlobalMetrics } from './metrics.js';
import { appearance } from './appearance.js';

const $ = (selector) => document.querySelector(selector);

const DEFAULT_NODE_COLOR = '#08b3e5';

function fillSelect(select, options, value) {
  select.replaceChildren(...options.map(([optionValue, label]) => new Option(label, optionValue)));
  select.value = value;
}

// Fill the customize selects for the metrics available for this network, and reset all customize controls
export function populateControls(result) {
  const numeric = availableMetrics(result, 'numeric').map((m) => [m.key, m.label]);
  const every = availableMetrics(result).map((m) => [m.key, m.label]);
  const order = [['original', 'Original order'], ['name', 'Name'], ...every];

  fillSelect($('#size-by'), numeric, 'degree');
  // Bipartite networks start out colored by set, and the arc diagram lists one set after the other
  fillSelect($('#color-by'), [['none', 'None'], ...every], result.bipartite ? 'set' : 'none');
  fillSelect($('#order-arc-nodes'), order, result.bipartite ? 'set' : 'original');
  fillSelect($('#order-matrix-cells'), order, 'original');

  $('#node-color').value = DEFAULT_NODE_COLOR;
  $('#cell-color').value = DEFAULT_NODE_COLOR;
  ['#reverse-arc-order', '#reverse-matrix-order', '#edge-weight'].forEach((id) => { $(id).checked = false; });
  ['#reverse-arc-order', '#reverse-matrix-order'].forEach((id) => { $(id).disabled = false; });
  $('#order-matrix-cells').disabled = false;
  $('#vertical').checked = true;
  $('#node-label').checked = true;
  $('#directed-arrows').checked = false;
  $('#hist-log').checked = false;
  $('#two-column').checked = false;
  $('#twocolumn-field').hidden = !result.bipartite;
}

// Global metrics as readout cards
export function renderStats(result) {
  const list = $('#stats');
  list.replaceChildren();
  visibleGlobalMetrics(result).forEach((metric) => {
    const item = document.createElement('div');
    item.className = 'stat';
    if (metric.description) item.title = metric.description;
    const dt = document.createElement('dt');
    dt.textContent = metric.label;
    const dd = document.createElement('dd');
    dd.textContent = metric.value === null || metric.value === undefined ? 'N/A' : metric.format(metric.value);
    item.append(dt, dd);
    list.append(item);
  });

  // Explain what is switched off for this kind of network
  const note = $('#metrics-note');
  if (result.bipartite) {
    note.textContent = 'Bipartite network: the clustering coefficient and transitivity are turned off, because links only run between the two sets, so there are no triangles. Bipartite clustering, degree centrality, and set-aware betweenness and closeness are shown instead.';
  } else if (result.directed) {
    note.textContent = 'Clustering coefficients cannot be calculated for directed graphs.';
  } else {
    note.textContent = '';
  }
  note.hidden = note.textContent === '';
}

// Definitions for the metrics of this network, so they are readable on touch screens (no hover needed)
export function renderGlossary(result) {
  const list = $('#glossary');
  list.replaceChildren();
  const add = (label, description) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = description;
    list.append(dt, dd);
  };
  availableMetrics(result).forEach((metric) => add(metric.label, metricDescription(metric, result)));
  visibleGlobalMetrics(result).filter((metric) => metric.description).forEach((metric) => add(metric.label, metric.description));
}

// Wire the appearance controls to the shared appearance state (call once at startup)
export function initControls() {
  $('#size-by').addEventListener('change', (e) => appearance.set({ sizeBy: e.target.value }));
  $('#color-by').addEventListener('change', (e) => appearance.set({ colorBy: e.target.value }));
  $('#node-color').addEventListener('input', (e) => appearance.set({ baseColor: e.target.value }));
  appearance.addEventListener('change', () => appearance.renderLegend($('#legend')));
}
