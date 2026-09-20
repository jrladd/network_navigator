import { app } from './state.js';
import { selection } from './selection.js';
import { appearance } from './appearance.js';
import { DataError, parseEdges, splitSets, looksLikeHeader, describeSeparator } from './data.js';
import {
  computeMetrics, detectCommunities, availableMetrics, formatNodeValue, setActiveSetNames, METRIC_BY_KEY
} from './metrics.js';
import { computeBipartiteMetrics, projectNetwork, PROJECTION_WEIGHTINGS } from './bipartite.js';
import { populateControls, renderStats, renderGlossary, initControls } from './controls.js';
import { initNodeCard, renderNodeCard } from './nodeCard.js';
import { initDownloads } from './download.js';
import { drawHist } from './hist.js';
import { drawMatrix } from './matrix.js';
import { drawForceLayout } from './forceLayout.js';
import { drawArcDiagram } from './arcDiagram.js';
import { addEdgeAttributeDropdown } from './edgeAttribute.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const LARGE_NETWORK = 500; // above this many nodes, wait for "Click to load"
const RANKED_METRICS = new Set(['betweenness', 'closeness', 'eigenvector', 'pagerank', 'clustering', 'bipClustering']);

const VIZ = {
  force: {
    container: '#force-layout-viz', draw: drawForceLayout,
    hint: 'Scroll or pinch to zoom, drag to pan, and click a node for details.'
  },
  arc: {
    container: '#arc-diagram-viz', draw: drawArcDiagram,
    hint: 'Scroll or pinch to zoom, and click a node label for details.'
  },
  matrix: {
    container: '#matrix-viz', draw: drawMatrix,
    hint: 'Click and drag on the matrix to zoom in.'
  }
};
const drawn = { force: false, arc: false, matrix: false };
let edgeFilterBuilt = false; // the edge-attribute filter is shared by the force layout and arc diagram

const mobileQuery = window.matchMedia('(max-width: 60em)');

// ---------------------------------------------------------------- input

const textarea = $('#data');

function autoDetectHeader() {
  if (looksLikeHeader(textarea.value)) $('#headerRow').checked = true;
  updateFormatNote();
}

// Tell the user how their columns will be read (commas, tabs, semicolons, or spaces)
function updateFormatNote() {
  $('#format-note').textContent = describeSeparator(textarea.value);
}
let formatNoteTimer = null;
textarea.addEventListener('input', () => {
  if (!$('#row-error').hidden) clearError(); // the user is fixing it
  clearTimeout(formatNoteTimer);
  formatNoteTimer = setTimeout(updateFormatNote, 250);
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    textarea.value = e.target.result;
    autoDetectHeader();
  };
  reader.readAsText(file);
}

// Drag and drop a file onto the textarea (only the first file is used)
textarea.addEventListener('dragover', (e) => { e.preventDefault(); });
textarea.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) readFile(e.dataTransfer.files[0]);
});
textarea.addEventListener('paste', () => setTimeout(autoDetectHeader, 0));

$('#file-input').addEventListener('change', (e) => {
  if (e.target.files.length > 0) readFile(e.target.files[0]);
  e.target.value = ''; // allow choosing the same file again
});

// Network type: bipartite networks are undirected and have two named sets
function applyModeControls() {
  const bipartite = $('#mode-bipartite').checked;
  $('#bipartite-options').hidden = !bipartite;
  $('#directed').disabled = bipartite;
  if (bipartite) $('#undirected').checked = true;
}
$$('input[name="networkMode"]').forEach((radio) => radio.addEventListener('change', applyModeControls));

// Example networks: fill in the data and the matching options, then navigate
const EXAMPLES = {
  karate: { weighted: false },
  lesmis: { weighted: true },
  davis: { weighted: false, bipartite: true, names: ['Women', 'Events'] }
};
$('#example-select').addEventListener('change', async (e) => {
  const name = e.target.value;
  e.target.value = '';
  if (!EXAMPLES[name]) return;
  try {
    const response = await fetch(`examples/${name}.csv`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    textarea.value = await response.text();
    updateFormatNote();
  } catch (err) {
    console.error(err);
    showError(`Could not load the example (${err.message}). Examples need the page to be served over http(s).`);
    return;
  }
  const example = EXAMPLES[name];
  (example.bipartite ? $('#mode-bipartite') : $('#mode-unipartite')).checked = true;
  $('#set-a-name').value = example.names ? example.names[0] : '';
  $('#set-b-name').value = example.names ? example.names[1] : '';
  applyModeControls();
  $('#undirected').checked = true;
  (example.weighted ? $('#weighted') : $('#unweighted')).checked = true;
  $('#headerRow').checked = true;
  $('#calculate').click();
});

// ---------------------------------------------------------------- errors

// Show a data problem next to the data box and take the user to it. `line`/`text` (from a DataError)
// name the row that is wrong: it is quoted in the message and, on devices with a pointer, selected
// in the text box so it can be fixed right away.
function showError(message, { line, text } = {}) {
  const alert = $('#row-error');
  $('#row-error-detail').textContent = message || '';
  const excerpt = $('#row-error-line');
  excerpt.hidden = !(line !== undefined && text !== undefined);
  if (!excerpt.hidden) excerpt.textContent = `Line ${line}: ${text.length > 120 ? `${text.slice(0, 120)}…` : text}`;
  alert.hidden = false;

  // Connect the message to the field for screen readers
  textarea.setAttribute('aria-invalid', 'true');
  textarea.setAttribute('aria-describedby', 'row-error');

  // Only scrolls if the message isn't already fully visible (smooth unless reduced motion is preferred)
  alert.scrollIntoView({ block: 'nearest' });
  const touchDevice = window.matchMedia('(hover: none)').matches;
  if (line !== undefined && text !== undefined && !touchDevice) {
    selectLine(line);
  } else {
    alert.focus({ preventScroll: true }); // no keyboard pop-up on phones
  }
}

// Select one line of the text box and scroll it into view
function selectLine(line) {
  const value = textarea.value;
  let start = 0;
  for (let i = 1; i < line; i++) {
    const newline = value.indexOf('\n', start);
    if (newline === -1) return;
    start = newline + 1;
  }
  let end = value.indexOf('\n', start);
  if (end === -1) end = value.length;
  if (value[end - 1] === '\r') end--;

  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  const style = getComputedStyle(textarea);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
  textarea.scrollTop = Math.max(0, (line - 1) * lineHeight - textarea.clientHeight / 2 + lineHeight);
}

function clearError() {
  $('#row-error').hidden = true;
  textarea.removeAttribute('aria-invalid');
  textarea.removeAttribute('aria-describedby');
}

function hideResults() {
  $('#results').hidden = true;
}

// ------------------------------------------------------ view + viz toggles

function isVizVisible() {
  return $('#viz-pane').getClientRects().length > 0;
}

// Draw the selected visualization once it is on screen (Sigma can't draw into a hidden container)
function ensureDrawn() {
  if (!app.G || app.vizBlocked || !isVizVisible()) return;
  const type = app.vizType;

  Object.entries(VIZ).forEach(([key, viz]) => { $(viz.container).hidden = key !== type; });
  $('#customize-dialog').dataset.viz = type;
  $('#viz-hint').textContent = VIZ[type].hint;

  if (!drawn[type]) {
    VIZ[type].draw(app.edgeList, app.nodeList, app.colorValues, app.graphType, app.graphWeight, app.controller.signal);
    drawn[type] = true;
    if (type !== 'matrix' && !edgeFilterBuilt) {
      addEdgeAttributeDropdown(app.edgeList);
      edgeFilterBuilt = true;
    }
  }
  if (type === 'force' && app.sigma) {
    // The container may have been hidden or resized since the last draw
    app.sigma.resize();
    app.sigma.refresh();
  }
}

function setView(view, { scroll = false } = {}) {
  $('#results').dataset.view = view;
  $(`#view-${view}`).checked = true;
  afterLayoutChange();
  // The page gets shorter or longer when panes swap; keep the results in view
  if (scroll) $('#results').scrollIntoView({ block: 'start' });
}

function afterLayoutChange() {
  requestAnimationFrame(() => {
    ensureDrawn();
    if (app.table) app.table.redraw(true);
  });
}

$$('input[name="view"]').forEach((radio) => radio.addEventListener('change', () => setView(radio.value, { scroll: true })));

// Phones can't show both panes at once
function applyMobileView() {
  if (mobileQuery.matches && $('#results').dataset.view === 'split') setView('metrics');
}
mobileQuery.addEventListener('change', applyMobileView);

$$('input[name="vizType"]').forEach((radio) => radio.addEventListener('change', () => {
  app.vizType = radio.value;
  ensureDrawn();
}));

$('#load-viz').addEventListener('click', () => {
  app.vizBlocked = false;
  $('#viz-warning').hidden = true;
  ensureDrawn();
});

// Fullscreen-style expansion of the visualization
function setExpanded(expanded) {
  const pane = $('#viz-pane');
  pane.classList.toggle('expanded', expanded);
  document.body.classList.toggle('no-scroll', expanded);
  $('#expand-btn').setAttribute('aria-pressed', String(expanded));
  $('#expand-label').textContent = expanded ? 'Exit fullscreen' : 'Fullscreen';
  afterLayoutChange();
}
$('#expand-btn').addEventListener('click', () => setExpanded(!$('#viz-pane').classList.contains('expanded')));

// Customize dialog: modal bottom sheet on phones, side panel next to the visualization otherwise
const dialog = $('#customize-dialog');
$('#customize-btn').addEventListener('click', () => {
  if (dialog.open) {
    dialog.close();
  } else if (mobileQuery.matches) {
    dialog.showModal();
  } else {
    dialog.show();
  }
  $('#customize-btn').setAttribute('aria-expanded', String(dialog.open));
});
dialog.addEventListener('close', () => $('#customize-btn').setAttribute('aria-expanded', 'false'));
$('#customize-close').addEventListener('click', () => dialog.close());
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (dialog.open && !dialog.matches(':modal')) dialog.close();
  else if ($('#viz-pane').classList.contains('expanded') && !dialog.open) setExpanded(false);
});

// ---------------------------------------------------------------- table

const table = new Tabulator('#metrics-table', {
  layout: 'fitColumns',
  height: '100%',
  index: 'nodeId',
  data: [],
  columns: [],
  responsiveLayout: 'collapse',
  headerWordWrap: true,
  responsiveLayoutCollapseStartOpen: false,
  placeholder: 'No data yet',
  selectableRows: false,
  rowFormatter: (row) => {
    row.getElement().classList.toggle('tabulator-selected', row.getData().nodeId === selection.selected);
  }
});
app.table = table;
const tableReady = new Promise((resolve) => table.on('tableBuilt', resolve));

// Searching the table filters every visualization
table.on('dataFiltered', (filters, rows) => {
  const ids = rows.map((row) => row.getData().nodeId);
  selection.setFilter(ids.length === table.getData().length ? null : new Set(ids));
});

// Clicking a row selects that node everywhere
table.on('rowClick', (e, row) => selection.select(row.getData().nodeId));

let previousSelected = null;
selection.addEventListener('select', () => {
  const rowFor = (id) => (id === null ? null : table.getRow(id));
  [previousSelected, selection.selected].forEach((id) => {
    const row = rowFor(id);
    if (row) row.reformat();
  });
  previousSelected = selection.selected;
  const row = rowFor(selection.selected);
  if (row && $('#metrics-pane').getClientRects().length > 0) {
    table.scrollToRow(selection.selected, 'center', false).catch(() => { /* row is filtered out */ });
  }
});

function buildColumns(result) {
  const columns = [
    { formatter: 'responsiveCollapse', width: 30, minWidth: 30, hozAlign: 'center', resizable: false, headerSort: false, download: false },
    {
      title: 'Node ID', field: 'nodeId', headerFilter: 'input', headerFilterPlaceholder: 'Find a Node ID',
      responsive: 0, minWidth: 110, download: true
    }
  ];
  availableMetrics(result).forEach((metric, i) => {
    const ranked = RANKED_METRICS.has(metric.key);
    columns.push({
      title: metric.label,
      field: metric.key,
      sorter: 'number',
      responsive: i === 0 ? 0 : i,
      minWidth: 90,
      download: true, // include columns that the responsive layout has collapsed
      formatter: (cell) => {
        const value = formatNodeValue(metric.key, cell.getValue());
        return ranked ? `${value} (${cell.getRow().getData()[`${metric.key}Rank`]})` : value;
      },
      accessorDownload: (value) => (metric.decimals === 0 ? value : Number(value.toFixed(6)))
    });
  });
  return columns;
}

function buildRows(result) {
  const ranks = {};
  RANKED_METRICS.forEach((key) => {
    const values = result.node[key];
    if (!values) return;
    ranks[key] = new Map(Object.keys(values).sort((a, b) => values[b] - values[a]).map((id, i) => [id, i + 1]));
  });
  return app.nodeList.map((node) => {
    const row = { nodeId: node.id };
    availableMetrics(result).forEach((metric) => {
      row[metric.key] = node[metric.key];
      if (ranks[metric.key]) row[`${metric.key}Rank`] = ranks[metric.key].get(node.id);
    });
    return row;
  });
}

$('#copy-table').addEventListener('click', async () => {
  const button = $('#copy-table');
  try {
    const metrics = availableMetrics(app.result);
    const lines = [['Node ID', ...metrics.map((m) => m.label)].join('\t')];
    table.getData().forEach((row) => {
      lines.push([row.nodeId, ...metrics.map((m) => row[m.key])].join('\t'));
    });
    await navigator.clipboard.writeText(lines.join('\n') + '\n');
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => { button.textContent = original; }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard. Please try again or use the CSV download button.');
  }
});
$('#download-csv').addEventListener('click', () => table.download('csv', 'network_metrics.csv'));

// ------------------------------------------------------------ histogram

function renderHistControls(result) {
  const fieldset = $('#histType');
  fieldset.querySelectorAll('input, label').forEach((el) => el.remove());
  availableMetrics(result, 'numeric').forEach((metric, i) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'histType';
    input.id = `hist-${metric.key}`;
    input.value = metric.key;
    input.checked = i === 0;
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = metric.label;
    fieldset.append(input, label);
  });
}

function selectHist() {
  const checked = $('input[name="histType"]:checked');
  const values = checked && app.result.node[checked.value];
  if (values) {
    drawHist(values, { log: $('#hist-log').checked, integer: METRIC_BY_KEY[checked.value].decimals === 0 });
  } else {
    d3.select('svg#hist').selectAll('*').remove();
  }
}

// Choosing a metric for the histogram also sizes the nodes by it
$('#histType').addEventListener('change', () => {
  selectHist();
  const checked = $('input[name="histType"]:checked');
  if (checked && app.G) {
    $('#size-by').value = checked.value;
    appearance.set({ sizeBy: checked.value });
  }
});
$('#hist-log').addEventListener('change', selectHist);
$('#hist-details').addEventListener('toggle', () => { if ($('#hist-details').open && app.G) selectHist(); });

// ------------------------------------------------------------ communities

// Re-run community detection when the resolution changes
$('#resolution').addEventListener('change', () => {
  if (!app.G) return;
  const resolution = Math.min(5, Math.max(0.1, parseFloat($('#resolution').value) || 1));
  $('#resolution').value = resolution;
  const communities = detectCommunities(app.G, { weighted: app.weighted, resolution });
  if (!communities) return;

  const { result } = app;
  result.node.community = communities.assignment;
  result.global.communities = communities.count;
  result.global.modularity = communities.modularity;
  result.communitySizes = communities.sizes;
  app.nodeList.forEach((node) => { node.community = communities.assignment[node.id]; });

  // Other cached network views were computed with the old resolution
  [...app.views.keys()].filter((key) => key !== app.networkView).forEach((key) => app.views.delete(key));

  table.updateData(app.nodeList.map((node) => ({ nodeId: node.id, community: node.community })));
  renderStats(result);
  appearance.communitySizes = communities.sizes;
  appearance.set({}); // recolor the views and refresh the legend
  renderNodeCard();
});

// -------------------------------------------------------------- navigate

const resolutionValue = () => Math.min(5, Math.max(0.1, parseFloat($('#resolution').value) || 1));

// Tear down the visualizations and listeners of whatever network is on screen
function resetViews() {
  app.controller.abort();
  app.controller = new AbortController();
  if (app.sigma) app.sigma.kill();
  app.sigma = null;
  app.graph = null;
  selection.reset();
  renderNodeCard();
  dialog.close();
  setExpanded(false);

  Object.keys(drawn).forEach((key) => { drawn[key] = false; });
  Object.values(VIZ).forEach((viz) => { $(viz.container).replaceChildren(); });
  $('#edge-filter').replaceChildren();
  edgeFilterBuilt = false;
  $('#viz-warning').hidden = true;
  try { table.clearHeaderFilter(); } catch (err) { /* table not ready yet */ }
}

// Projection settings from the network bar
function projectionOptions() {
  const minShared = Math.max(1, Math.round(Number($('#projection-min').value)) || 1);
  return { weighting: $('#projection-weighting').value, minShared };
}

// Everything needed to show one network view: 'main' is the network as loaded (one-mode or bipartite),
// 'A' / 'B' are one-mode projections of a bipartite network. Throws DataError if it can't be built.
function buildView(key) {
  const { source } = app;
  const resolution = resolutionValue();

  if (key === 'main') {
    const bipartite = Boolean(source.sets);
    const result = bipartite
      ? computeBipartiteMetrics(source.G, source.sets, { weighted: source.weighted, resolution, setNames: source.setNames })
      : computeMetrics(source.G, { weighted: source.weighted, resolution });
    return { key, G: source.G, edges: source.edges, result, weighted: source.weighted, directed: source.directed };
  }

  const options = projectionOptions();
  const P = projectNetwork(source.G, source.sets, key, options);
  const edges = [];
  P.forEachEdge((edge, attrs, s, t) => edges.push({ source: s, target: t, weight: attrs.weight, shared: attrs.shared }));
  const name = source.setNames[key === 'A' ? 1 : 2];
  const otherName = source.setNames[key === 'A' ? 2 : 1];
  if (edges.length === 0) {
    throw new DataError(`No two ${name} have at least ${options.minShared} of the ${otherName} in common, so this projection has no links. Try lowering the minimum.`);
  }
  const result = computeMetrics(P, { weighted: true, resolution });
  return { key, G: P, edges, result, weighted: true, directed: false, options };
}

function describeView(view) {
  const { source } = app;
  const [nameA, nameB] = [source.setNames[1], source.setNames[2]];
  if (view.key === 'main') {
    return `Bipartite network: ${source.sets.A.size} ${nameA} and ${source.sets.B.size} ${nameB}, connected by ${view.edges.length} links.`;
  }
  const [name, otherName] = view.key === 'A' ? [nameA, nameB] : [nameB, nameA];
  const { minShared, weighting } = view.options;
  return `Projection onto ${name}: two of them are linked when they have at least ${minShared} of the ${otherName} in common. ` +
    `Link weight is ${PROJECTION_WEIGHTINGS[weighting].toLowerCase()}.`;
}

// Put a built view on screen: node/edge objects, controls, table, histogram, visualizations
async function presentView(view) {
  const { result } = view;
  app.G = view.G;
  app.result = result;
  app.weighted = view.weighted;
  app.graphType = view.directed ? 'directed' : 'undirected';
  app.graphWeight = view.weighted ? 'weighted' : 'unweighted';
  app.sets = result.bipartite ? result.sets : null;
  app.networkView = view.key;
  app.vizBlocked = false;
  $('#eigen-error').hidden = Boolean(result.node.eigenvector);

  // Node and edge objects for the D3 views
  const metrics = availableMetrics(result);
  app.nodeList = [];
  view.G.forEachNode((id) => {
    const node = { id };
    metrics.forEach((metric) => { node[metric.key] = result.node[metric.key][id]; });
    app.nodeList.push(node);
  });

  const idToNode = Object.fromEntries(app.nodeList.map((node) => [node.id, node]));
  const edgeWidth = d3.scaleLinear().domain(d3.extent(view.edges, (d) => d.weight)).range([3, 20]);
  app.edgeList = view.edges.map((edge) => ({
    ...edge,
    source: idToNode[edge.source],
    target: idToNode[edge.target],
    scaled_weight: edgeWidth(edge.weight)
  }));
  app.colorValues = [...new Set(view.edges.map((edge) => edge.weight)), 0].sort((a, b) => a - b);

  // Controls, readouts, table, histogram
  appearance.init(app.nodeList, metrics.map((m) => m.key), result.communitySizes, { colorBy: result.bipartite ? 'set' : 'none' });
  populateControls(result);
  renderStats(result);
  renderGlossary(result);
  renderHistControls(result);
  appearance.renderLegend($('#legend'));
  $('#arrows-field').hidden = app.graphType !== 'directed';

  // Network bar: which network, and what a projection means
  const isBipartiteSource = Boolean(app.source.sets);
  $('#network-bar').hidden = !isBipartiteSource;
  $('#projection-options').hidden = view.key === 'main';
  $('#download-projection').hidden = view.key === 'main';
  $(`#net-${view.key}`).checked = true;
  if (isBipartiteSource) $('#network-note').textContent = describeView(view);
  $('#network-error').hidden = true;

  await tableReady;
  table.setColumns(buildColumns(result));
  await table.setData(buildRows(result));
  table.setSort([{ column: 'degree', dir: 'desc' }]);

  // Show the results; large networks wait for "Click to load"
  $('#results').hidden = false;
  $('#instructions').open = false;
  $(`#viz-${app.vizType}`).checked = true;
  applyMobileView();
  selectHist();
  if (view.G.order > LARGE_NETWORK) {
    app.vizBlocked = true;
    $('#viz-warning').hidden = false;
  }
  afterLayoutChange();
}

// Show one of the network views (building it the first time)
async function showNetwork(key) {
  let view = app.views.get(key);
  if (!view) {
    view = buildView(key);
    app.views.set(key, view);
  }
  resetViews();
  await presentView(view);
}

// Switching between the bipartite network and its projections
async function switchNetwork(key) {
  const previous = app.networkView;
  try {
    await showNetwork(key);
  } catch (err) {
    if (!(err instanceof DataError)) throw err;
    console.warn(err.message);
    $('#network-error').textContent = err.message;
    $('#network-error').hidden = false;
    $('#network-error').scrollIntoView({ block: 'nearest' });
    $(`#net-${previous}`).checked = true; // the previous network is still on screen
  }
}

$$('input[name="networkView"]').forEach((radio) => radio.addEventListener('change', () => {
  switchNetwork(radio.value).catch((err) => {
    console.error(err);
    showError(`Something went wrong while processing your data (${err.message}).`);
  });
}));

// Changing the projection settings rebuilds the projections
function projectionSettingsChanged() {
  app.views.delete('A');
  app.views.delete('B');
  if (app.networkView !== 'main') switchNetwork(app.networkView);
}
$('#projection-weighting').addEventListener('change', projectionSettingsChanged);
$('#projection-min').addEventListener('change', projectionSettingsChanged);

async function navigate() {
  resetViews();
  clearError();
  ['#eigen-error', '#network-error'].forEach((id) => { $(id).hidden = true; });
  app.G = null;
  app.source = null;
  app.views.clear();
  app.networkView = 'main';
  app.vizType = 'force';

  // Read the user's options and data
  const bipartite = $('#mode-bipartite').checked;
  const graphType = bipartite ? 'undirected' : $("input[name='graphType']:checked").value;
  const weighted = $("input[name='graphWeight']:checked").value === 'weighted';

  let edges;
  let sets = null;
  try {
    // Bipartite edges keep their column order (first column = set A), so treat them as directed for merging
    edges = parseEdges(textarea.value, {
      hasHeader: $('#headerRow').checked,
      directed: graphType === 'directed' || bipartite,
      weighted
    });
    if (bipartite) sets = splitSets(edges);
  } catch (err) {
    if (!(err instanceof DataError)) throw err;
    console.warn(err.message);
    showError(err.message, err);
    hideResults();
    return;
  }

  // Build the graphology graph
  const GraphClass = graphType === 'undirected' ? graphology.UndirectedGraph : graphology.DirectedGraph;
  const G = new GraphClass();
  edges.forEach((edge) => {
    G.mergeEdge(edge.source, edge.target, weighted ? { weight: edge.weight } : undefined);
  });

  // Names of the two sets (bipartite only); identical names would be confusing, so tell them apart
  const nameA = $('#set-a-name').value.trim() || 'Set A';
  let nameB = $('#set-b-name').value.trim() || 'Set B';
  if (nameB === nameA) nameB = `${nameB} (2)`;
  const setNames = { 1: nameA, 2: nameB };
  setActiveSetNames(setNames);

  app.mode = bipartite ? 'bipartite' : 'unipartite';
  app.source = { G, edges, sets, weighted, directed: graphType === 'directed', setNames };
  if (bipartite) {
    $('#net-main').checked = true;
    $('#net-A-label').textContent = `Projection: ${nameA}`;
    $('#net-B-label').textContent = `Projection: ${nameB}`;
    $('#projection-weighting').value = 'count';
    $('#projection-min').value = 1;
  }
  await showNetwork('main');
}

$('#calculate').addEventListener('click', () => {
  const loader = $('#loader');
  loader.hidden = false;
  // Give the browser a chance to paint the loader before the (synchronous) heavy work
  requestAnimationFrame(() => setTimeout(async () => {
    try {
      await navigate();
      if (app.G) $('#results').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      app.G = null;
      hideResults();
      showError(`Something went wrong while processing your data (${err.message}).`);
    } finally {
      loader.hidden = true;
    }
  }, 0));
});

// -------------------------------------------------------------- startup
initControls();
initNodeCard();
initDownloads();
