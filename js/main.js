import { app } from './state.js';
import { selection } from './selection.js';
import { appearance } from './appearance.js';
import { DataError, parseEdges, looksLikeHeader } from './data.js';
import {
  computeMetrics, detectCommunities, availableMetrics, formatNodeValue, METRIC_BY_KEY
} from './metrics.js';
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
const RANKED_METRICS = new Set(['betweenness', 'eigenvector', 'pagerank', 'clustering']);

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
}

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

// Example networks: fill in the data and the matching options, then navigate
const EXAMPLES = {
  karate: { weighted: false },
  lesmis: { weighted: true }
};
$('#example-select').addEventListener('change', async (e) => {
  const name = e.target.value;
  e.target.value = '';
  if (!EXAMPLES[name]) return;
  try {
    const response = await fetch(`examples/${name}.csv`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    textarea.value = await response.text();
  } catch (err) {
    console.error(err);
    showError(`Could not load the example (${err.message}). Examples need the page to be served over http(s).`);
    return;
  }
  $('#undirected').checked = true;
  (EXAMPLES[name].weighted ? $('#weighted') : $('#unweighted')).checked = true;
  $('#headerRow').checked = true;
  $('#calculate').click();
});

// ---------------------------------------------------------------- errors

function showError(message) {
  $('#row-error-detail').textContent = message || '';
  $('#row-error').hidden = false;
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
  const communities = detectCommunities(app.G, { weighted: app.graphWeight === 'weighted', resolution });
  if (!communities) return;

  const { result } = app;
  result.node.community = communities.assignment;
  result.global.communities = communities.count;
  result.global.modularity = communities.modularity;
  result.communitySizes = communities.sizes;
  app.nodeList.forEach((node) => { node.community = communities.assignment[node.id]; });

  table.updateData(app.nodeList.map((node) => ({ nodeId: node.id, community: node.community })));
  renderStats(result);
  appearance.communitySizes = communities.sizes;
  appearance.set({}); // recolor the views and refresh the legend
  renderNodeCard();
});

// -------------------------------------------------------------- navigate

async function navigate() {
  // Tear down the previous network's visualizations and their listeners
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
  ['#row-error', '#eigen-error', '#viz-warning'].forEach((id) => { $(id).hidden = true; });
  try { table.clearHeaderFilter(); } catch (err) { /* table not ready yet */ }
  app.G = null;
  app.vizBlocked = false;

  // Read the user's options and data
  app.graphType = $("input[name='graphType']:checked").value;
  app.graphWeight = $("input[name='graphWeight']:checked").value;
  const weighted = app.graphWeight === 'weighted';

  let edges;
  try {
    edges = parseEdges(textarea.value, {
      hasHeader: $('#headerRow').checked,
      directed: app.graphType === 'directed',
      weighted
    });
  } catch (err) {
    if (!(err instanceof DataError)) throw err;
    console.warn(err.message);
    showError(err.message);
    hideResults();
    return;
  }

  // Build the graphology graph and calculate metrics
  const GraphClass = app.graphType === 'undirected' ? graphology.UndirectedGraph : graphology.DirectedGraph;
  const G = new GraphClass();
  edges.forEach((edge) => {
    G.mergeEdge(edge.source, edge.target, weighted ? { weight: edge.weight } : undefined);
  });
  const resolution = Math.min(5, Math.max(0.1, parseFloat($('#resolution').value) || 1));
  const result = computeMetrics(G, { weighted, resolution });
  app.G = G;
  app.result = result;
  if (!result.node.eigenvector) $('#eigen-error').hidden = false;

  // Node and edge objects for the D3 views
  const metrics = availableMetrics(result);
  app.nodeList = [];
  G.forEachNode((id) => {
    const node = { id };
    metrics.forEach((metric) => { node[metric.key] = result.node[metric.key][id]; });
    app.nodeList.push(node);
  });

  const idToNode = Object.fromEntries(app.nodeList.map((node) => [node.id, node]));
  const edgeWidth = d3.scaleLinear().domain(d3.extent(edges, (d) => d.weight)).range([3, 20]);
  app.edgeList = edges.map((edge) => ({
    ...edge,
    source: idToNode[edge.source],
    target: idToNode[edge.target],
    scaled_weight: edgeWidth(edge.weight)
  }));
  app.colorValues = [...new Set(edges.map((edge) => edge.weight)), 0].sort((a, b) => a - b);

  // Controls, readouts, table, histogram
  appearance.init(app.nodeList, metrics.map((m) => m.key), result.communitySizes);
  populateControls(result);
  renderStats(result);
  renderGlossary();
  renderHistControls(result);
  appearance.renderLegend($('#legend'));
  $('#arrows-field').hidden = app.graphType !== 'directed';

  await tableReady;
  table.setColumns(buildColumns(result));
  await table.setData(buildRows(result));
  table.setSort([{ column: 'degree', dir: 'desc' }]);

  // Show the results; large networks wait for "Click to load"
  $('#results').hidden = false;
  $('#instructions').open = false;
  app.vizType = 'force';
  $('#viz-force').checked = true;
  applyMobileView();
  selectHist();
  if (G.order > LARGE_NETWORK) {
    app.vizBlocked = true;
    $('#viz-warning').hidden = false;
  }
  afterLayoutChange();
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
